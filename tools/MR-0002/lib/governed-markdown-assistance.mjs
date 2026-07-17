import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "../../MR-0001/lib/governed-yaml.mjs";
import { loadGovernedDocumentModelSourceSet } from "../../MR-0001/lib/governed-document-model-sources.mjs";
import {
  normalizeProjectPath,
  parseMarkdownDocument,
  resolveSafeProjectPath,
  validateSectionContent,
} from "../../MR-0001/lib/governed-document-model-validation.mjs";
import { macroRequirementModelRuleIds } from "../../MR-0001/lib/macro-requirement-model-validation.mjs";
import { decisionModelRuleIds } from "../../MR-0001/lib/decision-model-validation.mjs";
import { functionalRequirementModelRuleIds } from "../../MR-0001/lib/functional-requirement-model-validation.mjs";
import { governanceRequirementModelRuleIds } from "../../MR-0001/lib/governance-requirement-model-validation.mjs";
import {
  createGovernedEntityReferenceService,
  loadGovernedEntityResolverRegistry,
} from "../../MR-0001/lib/governed-entity-references.mjs";
import {
  applyGovernedMarkdownReferenceAssistance,
} from "./governed-markdown-reference-assistance.mjs";
import {
  loadAndValidateBaseAnalysisRegistry,
} from "../../MR-0003/lib/base-analysis-registry.mjs";
import {
  evaluateBaseAnalysisReferenceEligibility,
} from "../../MR-0003/lib/base-analysis-reference-eligibility.mjs";

/**
 * @file Editor-independent governed Markdown assistance core.
 *
 * @implementsRequirement MR-0002ADR-0006REQ-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0004
 * @implementsRequirement MR-0002ADR-0006REQ-0004GOV-0001
 * @derivedFromDecision MR-0002/ADR-0006
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Resolves an existing governed Markdown body through canonical registries and
 * body profiles, then analyzes the current unsaved text without mutating the
 * document or repository. Completion, diagnostic, hover and quick-fix output is
 * deterministic and editor independent.
 */

export const governedMarkdownAssistanceContractVersion = 1;

const macroRegistryPath =
  "docs/reference/project-model/registers/macro-requirements.registry.yml";
const decisionRegistryDirectory =
  "docs/reference/project-model/registers/decisions";
const requirementRegistryDirectory =
  "docs/reference/project-model/registers/requirements";
const taxonomyRegistryPath =
  "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml";

const modelRuleSets = Object.freeze({
  "macro-requirement": macroRequirementModelRuleIds,
  decision: decisionModelRuleIds,
  "functional-requirement": functionalRequirementModelRuleIds,
  "governance-requirement": governanceRequirementModelRuleIds,
});

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function lineRange(lines, line, startCharacter = 0, endCharacter = undefined) {
  const safeLine = Math.max(0, Math.min(line, Math.max(0, lines.length - 1)));
  const length = String(lines[safeLine] ?? "").length;
  return {
    start: {
      line: safeLine,
      character: Math.max(0, Math.min(startCharacter, length)),
    },
    end: {
      line: safeLine,
      character: Math.max(
        0,
        Math.min(endCharacter === undefined ? length : endCharacter, length),
      ),
    },
  };
}

function wholeDocumentRange(lines) {
  const finalLine = Math.max(0, lines.length - 1);
  return {
    start: { line: 0, character: 0 },
    end: { line: finalLine, character: String(lines[finalLine] ?? "").length },
  };
}

function eofRange(lines) {
  const finalLine = Math.max(0, lines.length - 1);
  const character = String(lines[finalLine] ?? "").length;
  return {
    start: { line: finalLine, character },
    end: { line: finalLine, character },
  };
}

function formatTemplate(template, values) {
  return String(template ?? "").replace(/\{([^}]+)\}/gu, (_, key) =>
    String(values[key] ?? `{${key}}`),
  );
}

function resolveSectionPrefixes(sectionProfile) {
  const prefixes = [];
  for (const prefix of sectionProfile.allowed_prefixes ?? []) {
    if (typeof prefix === "string") prefixes.push(prefix);
    else if (prefix && typeof prefix === "object" && !Array.isArray(prefix)) {
      const key = Object.keys(prefix)[0];
      if (key) prefixes.push(`${key}:`);
    }
  }
  if (sectionProfile.required_item_prefix) {
    prefixes.push(String(sectionProfile.required_item_prefix));
  }
  return prefixes;
}

function sectionSkeleton(sectionProfile, context) {
  if (sectionProfile.content_kind === "controlled_scalar_label") {
    return context.controlledLabel || "TODO";
  }
  if (
    sectionProfile.content_kind === "prose" ||
    sectionProfile.content_kind === "decision_prose"
  ) {
    return "TODO";
  }
  const prefix = resolveSectionPrefixes(sectionProfile)[0] ?? "";
  const terminal = sectionProfile.terminal_punctuation === "period" ? "." : "";
  if (sectionProfile.content_kind === "normative_verification_list") {
    return "- The verification must confirm this condition: TODO.";
  }
  if (sectionProfile.content_kind === "failure_condition_list") {
    return `- ${prefix || "The verification must fail when "}TODO${terminal}`;
  }
  if (sectionProfile.content_kind === "acceptance_condition_list") {
    return `- ${prefix || "The requirement is accepted when "}TODO${terminal}`;
  }
  if (sectionProfile.content_kind === "normative_list") {
    return `- The governed document must satisfy this condition: TODO${terminal}`;
  }
  if (prefix) return `- ${prefix} TODO${terminal}`;
  return `- TODO${terminal}`;
}

function renderSection(sectionProfile, context) {
  return `## ${sectionProfile.heading}\n\n${sectionSkeleton(sectionProfile, context)}`;
}

function listRegistryFiles(rootDir, directoryProjectPath, pattern) {
  const directory = resolveSafeProjectPath(rootDir, directoryProjectPath);
  if (!fs.existsSync(directory.absolute)) return [];
  return fs
    .readdirSync(directory.absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => `${directoryProjectPath}/${entry.name}`)
    .sort(compare);
}

function addBodyRecord(recordsByPath, record) {
  const bodyPath = normalizeProjectPath(record.bodyPath);
  if (!bodyPath) return;
  const previous = recordsByPath.get(bodyPath);
  if (previous) {
    throw new Error(
      `Governed body path ${bodyPath} is owned by both ${previous.id} and ${record.id}.`,
    );
  }
  recordsByPath.set(bodyPath, { ...record, bodyPath });
}

function loadBodyRecords(rootDir) {
  const recordsByPath = new Map();
  const macroRegistry = readGovernedYamlFile(
    resolveSafeProjectPath(rootDir, macroRegistryPath).absolute,
  );
  for (const record of macroRegistry.macro_requirements ?? []) {
    addBodyRecord(recordsByPath, {
      modelId: "macro-requirement",
      id: String(record.id ?? "").trim(),
      title: String(record.title ?? "").trim(),
      status: String(record.status ?? "").trim(),
      registryPath: macroRegistryPath,
      bodyPath: record.body_path,
      record: structuredClone(record),
    });
  }

  for (const registryPath of listRegistryFiles(
    rootDir,
    decisionRegistryDirectory,
    /^MR-\d{4}\.decisions\.registry\.yml$/u,
  )) {
    const registry = readGovernedYamlFile(
      resolveSafeProjectPath(rootDir, registryPath).absolute,
    );
    for (const record of registry.decisions ?? []) {
      addBodyRecord(recordsByPath, {
        modelId: "decision",
        id: String(record.id ?? "").trim(),
        title: String(record.title ?? "").trim(),
        status: String(record.status ?? "").trim(),
        macroRequirementId: String(record.macro_requirement_id ?? "").trim(),
        registryPath,
        bodyPath: record.body_path,
        record: structuredClone(record),
      });
    }
  }

  for (const registryPath of listRegistryFiles(
    rootDir,
    requirementRegistryDirectory,
    /^MR-\d{4}\.requirements\.registry\.yml$/u,
  )) {
    const registry = readGovernedYamlFile(
      resolveSafeProjectPath(rootDir, registryPath).absolute,
    );
    for (const record of registry.requirements ?? []) {
      const requirementType = String(record.requirement_type ?? "").trim();
      if (requirementType !== "functional" && requirementType !== "governance") {
        continue;
      }
      addBodyRecord(recordsByPath, {
        modelId:
          requirementType === "functional"
            ? "functional-requirement"
            : "governance-requirement",
        id: String(record.id ?? "").trim(),
        title: String(record.title ?? "").trim(),
        status: String(record.status ?? "").trim(),
        macroRequirementId: String(record.macro_requirement_id ?? "").trim(),
        decisionId: String(record.decision_id ?? "").trim(),
        parentRequirementId: String(record.parent_requirement_id ?? "").trim(),
        registryPath,
        bodyPath: record.body_path,
        record: structuredClone(record),
      });
    }
  }
  return recordsByPath;
}

function loadValueSets(rootDir) {
  const taxonomy = readGovernedYamlFile(
    resolveSafeProjectPath(rootDir, taxonomyRegistryPath).absolute,
  );
  return new Map(
    (taxonomy.field_value_sets ?? []).map((valueSet) => [
      String(valueSet.id),
      (valueSet.values ?? []).map((entry) => ({ ...entry })),
    ]),
  );
}

function parseDocument(text) {
  const normalizedText = String(text ?? "")
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n/gu, "\n");
  const lines = normalizedText.split("\n");
  const parsed = parseMarkdownDocument(normalizedText);
  const h1 = parsed.h1.map((entry) => ({ ...entry, lineIndex: entry.line - 1 }));
  const sections = parsed.sections.map((entry, index) => {
    const lineIndex = entry.line - 1;
    const nextLineIndex = parsed.sections[index + 1]
      ? parsed.sections[index + 1].line - 1
      : lines.length;
    return {
      ...entry,
      lineIndex,
      endLineIndex: Math.max(lineIndex, nextLineIndex - 1),
    };
  });
  return { normalizedText, lines, h1, sections };
}

function diagnostic(ruleId, message, range, options = {}) {
  return {
    rule_id: ruleId,
    severity: options.severity ?? "error",
    message,
    range,
    quick_fix_ids: [...(options.quickFixIds ?? [])],
  };
}

/**
 * Resolves the registry field mirrored by one body section.
 *
 * @param {Record<string, unknown>} sectionProfile - Canonical section profile.
 * @returns {string} Registry field name, or empty text when the section is not a mirror.
 */
function mirroredRecordFieldName(sectionProfile) {
  const memberId = String(sectionProfile?.mirrors_member_id ?? "").trim();
  const finalSegment = memberId.split(".").at(-1) ?? "";
  return finalSegment.replaceAll("-", "_");
}

/**
 * Resolves the authoritative controlled value for one mirrored section.
 *
 * @param {Record<string, unknown>} sectionProfile - Canonical section profile.
 * @param {Record<string, unknown>} record - Governed body owner record.
 * @returns {string} Canonical registry value.
 */
function controlledValueForSection(sectionProfile, record) {
  const fieldName = mirroredRecordFieldName(sectionProfile);
  if (
    fieldName &&
    record?.record &&
    Object.prototype.hasOwnProperty.call(record.record, fieldName)
  ) {
    return String(record.record[fieldName] ?? "").trim();
  }
  return String(record?.status ?? "").trim();
}

/**
 * Resolves the taxonomy entry for the authoritative value of one section.
 *
 * @param {Record<string, unknown>} sectionProfile - Canonical section profile.
 * @param {Record<string, unknown>} record - Governed body owner record.
 * @param {Map<string, Array<Record<string, unknown>>>} valueSets - Canonical value sets.
 * @returns {Record<string, unknown>|null} Matching taxonomy entry.
 */
function controlledEntryForSection(sectionProfile, record, valueSets) {
  if (!sectionProfile?.value_set_id) return null;
  const value = controlledValueForSection(sectionProfile, record);
  return (valueSets.get(String(sectionProfile.value_set_id)) ?? []).find(
    (candidate) => String(candidate.value) === value,
  ) ?? null;
}

function controlledLabelForSection(sectionProfile, record, valueSets) {
  const entry = controlledEntryForSection(sectionProfile, record, valueSets);
  const metadataField = String(sectionProfile.value_metadata_field ?? "value");
  return String(entry?.[metadataField] ?? entry?.value ?? "").trim();
}

/**
 * Builds progressive-disclosure help for a canonical body section.
 *
 * @param {Record<string, unknown>} sectionProfile - Canonical section profile.
 * @param {Record<string, unknown>} record - Governed body owner record.
 * @param {Map<string, Array<Record<string, unknown>>>} valueSets - Canonical value sets.
 * @returns {string} Markdown hover content.
 */
function sectionHoverMarkdown(sectionProfile, record, valueSets) {
  const lines = [
    `**${sectionProfile.heading}**`,
    `Content kind: \`${sectionProfile.content_kind}\``,
    `Cardinality: \`${sectionProfile.cardinality}\``,
    `Canonical member: \`${sectionProfile.id}\``,
  ];
  const valueSetId = String(sectionProfile.value_set_id ?? "").trim();
  const entries = valueSetId ? valueSets.get(valueSetId) ?? [] : [];
  const mirrorMemberId = String(sectionProfile.mirrors_member_id ?? "").trim();
  const currentValue = controlledValueForSection(sectionProfile, record);
  const currentLabel = controlledLabelForSection(sectionProfile, record, valueSets);

  if (mirrorMemberId) {
    lines.push(
      "**Authority:** registry mirror",
      `Source member: \`${mirrorMemberId}\``,
      `Current registry value: \`${currentValue}\``,
      `Current body label: **${currentLabel || "<unresolved>"}**`,
      "Direct body edits do not change the authoritative registry value. Use a governed lifecycle operation to select a different value.",
    );
  }
  if (valueSetId) lines.push(`Value set: \`${valueSetId}\``);
  if (entries.length > 0) {
    lines.push(
      "**Controlled values**",
      entries.map((entry) => {
        const metadataField = String(sectionProfile.value_metadata_field ?? "value");
        const label = String(entry[metadataField] ?? entry.value ?? "");
        const meaning = String(entry.meaning ?? "Controlled canonical value");
        const current = String(entry.value) === currentValue ? " ← current" : "";
        return `- \`${entry.value}\` → **${label}**${current}: ${meaning}`;
      }).join("\n"),
    );
  }
  return lines.join("\n\n");
}

function findCurrentSection(sections, line) {
  return sections.find(
    (section) => line > section.lineIndex && line <= section.endLineIndex,
  );
}

function insertionEditForSection(parsed, profileSections, targetSection, context) {
  const targetOrder = Number(targetSection.order ?? 0);
  const nextPresent = profileSections
    .filter((section) => Number(section.order ?? 0) > targetOrder)
    .sort((left, right) => left.order - right.order)
    .map((section) =>
      parsed.sections.find((candidate) => candidate.heading === section.heading),
    )
    .find(Boolean);
  const sectionText = renderSection(targetSection, context);
  if (nextPresent) {
    return {
      range: {
        start: { line: nextPresent.lineIndex, character: 0 },
        end: { line: nextPresent.lineIndex, character: 0 },
      },
      new_text: `${sectionText}\n\n`,
    };
  }
  const prefix = parsed.normalizedText.trimEnd() ? "\n\n" : "";
  return {
    range: eofRange(parsed.lines),
    new_text: `${prefix}${sectionText}\n`,
  };
}

function buildCanonicalSkeleton(profile, record, valueSets) {
  const expectedHeader = formatTemplate(profile.header.template, {
    id: record.id,
    title: record.title,
  });
  const renderedSections = [...profile.sections]
    .sort((left, right) => left.order - right.order)
    .filter((section) => section.cardinality === "exactly_one")
    .map((section) =>
      renderSection(section, {
        controlledLabel: controlledLabelForSection(section, record, valueSets),
      }),
    );
  return `${expectedHeader}\n\n${renderedSections.join("\n\n")}\n`;
}

function reorderKnownSections(parsed, profileSections) {
  const lineBlocks = new Map();
  for (const section of parsed.sections) {
    if (lineBlocks.has(section.heading)) continue;
    lineBlocks.set(
      section.heading,
      parsed.lines.slice(section.lineIndex, section.endLineIndex + 1).join("\n").trim(),
    );
  }
  const ordered = [...profileSections]
    .sort((left, right) => left.order - right.order)
    .map((section) => lineBlocks.get(section.heading))
    .filter(Boolean);
  const knownHeadings = new Set(profileSections.map((section) => section.heading));
  const unknown = parsed.sections
    .filter((section) => !knownHeadings.has(section.heading))
    .map((section) =>
      parsed.lines.slice(section.lineIndex, section.endLineIndex + 1).join("\n").trim(),
    );
  const header = parsed.h1[0]
    ? parsed.lines[parsed.h1[0].lineIndex].trim()
    : "";
  return `${[header, ...ordered, ...unknown].filter(Boolean).join("\n\n")}\n`;
}

function completionRangeForLine(lines, position) {
  const line = Math.max(0, Math.min(Number(position?.line ?? 0), lines.length - 1));
  const character = Math.max(
    0,
    Math.min(Number(position?.character ?? 0), String(lines[line] ?? "").length),
  );
  return {
    start: { line, character: 0 },
    end: { line, character },
  };
}

function createDefaultGovernedEntityReferenceService({
  rootDir,
  recordsByPath,
}) {
  const bae = loadAndValidateBaseAnalysisRegistry({ rootDir });
  if (!bae.valid) {
    throw new Error(
      `Canonical BAE registry is invalid: ${bae.errors
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | ")}`,
    );
  }
  const registry = loadGovernedEntityResolverRegistry({ rootDir });
  return createGovernedEntityReferenceService({
    registry,
    sourceProjectionProviders: new Map([
      ["base-analysis-registry-reference-source", () => bae.projection],
    ]),
    eligibilityProviders: new Map([
      [
        "base-analysis-documentary-precedence",
        ({ currentDocument, entity }) =>
          evaluateBaseAnalysisReferenceEligibility({
            currentDocument,
            entity,
            documentsByPath: recordsByPath,
          }),
      ],
    ]),
  });
}

function buildAssistanceResult(service, input) {
  const projectPath = normalizeProjectPath(input.projectPath);
  const record = service.recordsByPath.get(projectPath);
  if (!record) {
    return {
      contract_version: governedMarkdownAssistanceContractVersion,
      supported: false,
      project_path: projectPath,
      diagnostics: [],
      completions: [],
      hovers: [],
      quick_fixes: [],
    };
  }

  const profileEntry = service.sourceSet.profiles.find(
    (entry) =>
      entry.value.representation_kind === "markdown_body" &&
      (entry.value.applies_to_model_ids ?? []).includes(record.modelId),
  );
  if (!profileEntry) {
    throw new Error(`No canonical Markdown body profile applies to ${record.modelId}.`);
  }
  const profile = profileEntry.value;
  const rules = modelRuleSets[record.modelId];
  const parsed = parseDocument(input.text);
  const profileSections = [...profile.sections].sort(
    (left, right) => left.order - right.order,
  );
  const profileByHeading = new Map(
    profileSections.map((section) => [section.heading, section]),
  );
  const sectionOccurrences = new Map();
  for (const section of parsed.sections) {
    const occurrences = sectionOccurrences.get(section.heading) ?? [];
    occurrences.push(section);
    sectionOccurrences.set(section.heading, occurrences);
  }

  const expectedHeader = formatTemplate(profile.header.template, {
    id: record.id,
    title: record.title,
  });
  const diagnostics = [];
  const quickFixes = new Map();
  const hovers = [];

  const headerEdit = parsed.h1[0]
    ? {
        range: lineRange(parsed.lines, parsed.h1[0].lineIndex),
        new_text: expectedHeader,
      }
    : {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        new_text: `${expectedHeader}\n\n`,
      };
  quickFixes.set("replace-header", {
    id: "replace-header",
    title: "Restore canonical governed-document header",
    edits: [headerEdit],
  });

  if (parsed.h1.length !== 1) {
    diagnostics.push(
      diagnostic(
        rules.bodyHeader,
        `Body must contain exactly one H1 header; found ${parsed.h1.length}.`,
        parsed.h1[1]
          ? lineRange(parsed.lines, parsed.h1[1].lineIndex)
          : lineRange(parsed.lines, 0),
        { quickFixIds: ["replace-header"] },
      ),
    );
  } else if (`# ${parsed.h1[0].text}` !== expectedHeader) {
    diagnostics.push(
      diagnostic(
        rules.bodyHeader,
        `Body header must equal ${JSON.stringify(expectedHeader)}.`,
        lineRange(parsed.lines, parsed.h1[0].lineIndex),
        { quickFixIds: ["replace-header"] },
      ),
    );
  }

  if (parsed.h1[0]) {
    hovers.push({
      range: lineRange(parsed.lines, parsed.h1[0].lineIndex),
      markdown: `**${record.modelId}** \`${record.id}\`\n\nRegistry: \`${record.registryPath}\`\n\nCanonical profile: \`${profile.profile_id}\``,
    });
  }

  let previousOrder = -Infinity;
  let outOfOrder = false;
  for (const section of parsed.sections) {
    const sectionProfile = profileByHeading.get(section.heading);
    if (!sectionProfile) {
      if (profile.unknown_sections === "forbidden") {
        diagnostics.push(
          diagnostic(
            rules.bodySections,
            `Unknown section ${JSON.stringify(section.heading)} is forbidden by ${profile.profile_id}.`,
            lineRange(parsed.lines, section.lineIndex),
          ),
        );
      }
      continue;
    }
    const hoverMarkdown = sectionHoverMarkdown(
      sectionProfile,
      record,
      service.valueSets,
    );
    hovers.push({
      range: lineRange(parsed.lines, section.lineIndex),
      markdown: hoverMarkdown,
    });
    for (
      let contentLine = section.lineIndex + 1;
      contentLine <= section.endLineIndex;
      contentLine += 1
    ) {
      if (!String(parsed.lines[contentLine] ?? "").trim()) continue;
      hovers.push({
        range: lineRange(parsed.lines, contentLine),
        markdown: hoverMarkdown,
      });
    }
    if (Number(sectionProfile.order) < previousOrder) {
      outOfOrder = true;
      diagnostics.push(
        diagnostic(
          rules.bodySections,
          `Section ${sectionProfile.heading} is out of canonical order.`,
          lineRange(parsed.lines, section.lineIndex),
          { quickFixIds: ["restore-section-order"] },
        ),
      );
    }
    previousOrder = Math.max(previousOrder, Number(sectionProfile.order));
  }

  if (outOfOrder) {
    quickFixes.set("restore-section-order", {
      id: "restore-section-order",
      title: "Restore canonical section order",
      edits: [
        {
          range: wholeDocumentRange(parsed.lines),
          new_text: reorderKnownSections(parsed, profileSections),
        },
      ],
    });
  }

  let missingRequiredCount = 0;
  for (const sectionProfile of profileSections) {
    const occurrences = sectionOccurrences.get(sectionProfile.heading) ?? [];
    if (sectionProfile.cardinality === "exactly_one" && occurrences.length === 0) {
      missingRequiredCount += 1;
      const fixId = `insert-section:${sectionProfile.id}`;
      const insertionEdit = insertionEditForSection(
        parsed,
        profileSections,
        sectionProfile,
        {
          controlledLabel: controlledLabelForSection(
            sectionProfile,
            record,
            service.valueSets,
          ),
        },
      );
      quickFixes.set(fixId, {
        id: fixId,
        title: `Insert missing section: ${sectionProfile.heading}`,
        edits: [insertionEdit],
      });
      diagnostics.push(
        diagnostic(
          rules.bodySections,
          `Required section ${JSON.stringify(sectionProfile.heading)} is missing.`,
          {
            start: { ...insertionEdit.range.start },
            end: { ...insertionEdit.range.start },
          },
          { quickFixIds: [fixId, "insert-canonical-skeleton"] },
        ),
      );
    }
    if (occurrences.length > 1) {
      for (const duplicate of occurrences.slice(1)) {
        diagnostics.push(
          diagnostic(
            rules.bodySections,
            `Section ${JSON.stringify(sectionProfile.heading)} exceeds its maximum cardinality.`,
            lineRange(parsed.lines, duplicate.lineIndex),
          ),
        );
      }
    }

    for (const occurrence of occurrences) {
      const sectionDiagnostics = validateSectionContent(
        occurrence,
        sectionProfile,
        {
          ruleId: rules.bodyContent,
          modelId: record.modelId,
          sourcePath: projectPath,
        },
      );
      for (const item of sectionDiagnostics) {
        diagnostics.push(
          diagnostic(
            item.rule_id,
            item.message,
            lineRange(parsed.lines, occurrence.lineIndex),
          ),
        );
      }
      if (Array.isArray(sectionProfile.forbidden_normative_keywords)) {
        const escaped = sectionProfile.forbidden_normative_keywords
          .map((value) => String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
          .sort((left, right) => right.length - left.length);
        const pattern = escaped.length
          ? new RegExp(`\\b(?:${escaped.join("|")})\\b`, "iu")
          : null;
        if (pattern && pattern.test(occurrence.text)) {
          diagnostics.push(
            diagnostic(
              rules.bodyContent,
              `Section ${sectionProfile.heading} contains a forbidden normative keyword.`,
              lineRange(parsed.lines, occurrence.lineIndex),
            ),
          );
        }
      }
    }
  }

  if (missingRequiredCount > 0) {
    quickFixes.set("insert-canonical-skeleton", {
      id: "insert-canonical-skeleton",
      title: "Replace with complete canonical body skeleton",
      edits: [
        {
          range: wholeDocumentRange(parsed.lines),
          new_text: buildCanonicalSkeleton(profile, record, service.valueSets),
        },
      ],
    });
  }

  for (const sectionProfile of profileSections.filter(
    (candidate) => candidate.content_kind === "controlled_scalar_label",
  )) {
    const occurrence = (sectionOccurrences.get(sectionProfile.heading) ?? [])[0];
    if (!occurrence) continue;
    const expectedLabel = controlledLabelForSection(
      sectionProfile,
      record,
      service.valueSets,
    );
    if (expectedLabel && occurrence.text.trim() !== expectedLabel) {
      const fixId = `replace-controlled-section:${sectionProfile.id}`;
      const contentLine = Math.min(
        occurrence.endLineIndex,
        occurrence.lineIndex + 2,
      );
      quickFixes.set(fixId, {
        id: fixId,
        title: `Restore controlled ${sectionProfile.heading} value`,
        edits: [
          {
            range: {
              start: { line: occurrence.lineIndex + 1, character: 0 },
              end: {
                line: occurrence.endLineIndex,
                character: String(parsed.lines[occurrence.endLineIndex] ?? "").length,
              },
            },
            new_text: `\n${expectedLabel}`,
          },
        ],
      });
      diagnostics.push(
        diagnostic(
          rules.bodyStatusMirror ?? rules.bodyContent,
          `${sectionProfile.heading} must equal controlled label ${JSON.stringify(expectedLabel)}.`,
          lineRange(parsed.lines, contentLine),
          { quickFixIds: [fixId] },
        ),
      );
    }
  }

  applyGovernedMarkdownReferenceAssistance({
    profile,
    parsed,
    record,
    referenceService: service.referenceService,
    diagnostics,
    hovers,
    quickFixes,
    lineRange,
  });

  const position = {
    line: Math.max(0, Number(input.position?.line ?? 0)),
    character: Math.max(0, Number(input.position?.character ?? 0)),
  };
  const currentLine = String(parsed.lines[position.line] ?? "");
  const beforeCursor = currentLine.slice(0, position.character);
  const completions = [];
  if (/^\s*##\s*[^#]*$/u.test(beforeCursor) || /^\s*$/u.test(beforeCursor)) {
    const available = profileSections.filter((sectionProfile) => {
      const count = (sectionOccurrences.get(sectionProfile.heading) ?? []).length;
      return count === 0 &&
        (sectionProfile.cardinality === "exactly_one" ||
          sectionProfile.cardinality === "zero_or_one");
    });
    const ordered = [
      ...available.filter((entry) => entry.cardinality === "exactly_one"),
      ...available.filter((entry) => entry.cardinality !== "exactly_one"),
    ].sort((left, right) => {
      const cardinality =
        Number(left.cardinality !== "exactly_one") -
        Number(right.cardinality !== "exactly_one");
      return cardinality || Number(left.order) - Number(right.order);
    });
    ordered.forEach((sectionProfile, index) => {
      completions.push({
        id: `section:${sectionProfile.id}`,
        kind: "section",
        label: sectionProfile.heading,
        detail: `${sectionProfile.cardinality} · ${sectionProfile.content_kind}`,
        documentation: `Canonical section from ${profile.profile_id}.`,
        insert_text: renderSection(sectionProfile, {
          controlledLabel: controlledLabelForSection(
            sectionProfile,
            record,
            service.valueSets,
          ),
        }),
        range: completionRangeForLine(parsed.lines, position),
        filter_text: `## ${sectionProfile.heading}`,
        sort_text: String(index).padStart(4, "0"),
        preselect: index === 0,
      });
    });
  }

  const currentSection = findCurrentSection(parsed.sections, position.line);
  const currentSectionProfile = currentSection
    ? profileByHeading.get(currentSection.heading)
    : null;
  if (currentSectionProfile?.content_kind === "controlled_scalar_label") {
    const allEntries = service.valueSets.get(
      String(currentSectionProfile.value_set_id),
    ) ?? [];
    const isMirror = Boolean(currentSectionProfile.mirrors_member_id);
    const currentValue = controlledValueForSection(currentSectionProfile, record);
    const entries = isMirror
      ? allEntries.filter((entry) => String(entry.value) === currentValue)
      : allEntries;
    entries.forEach((entry, index) => {
      const metadataField = String(
        currentSectionProfile.value_metadata_field ?? "value",
      );
      const label = String(entry[metadataField] ?? entry.value ?? "");
      const meaning = String(entry.meaning ?? "Controlled canonical value");
      completions.push({
        id: `controlled:${currentSectionProfile.id}:${entry.value}`,
        kind: "value",
        label,
        detail: isMirror ? `${meaning} · current registry mirror` : meaning,
        documentation: isMirror
          ? `Current authoritative registry value \`${entry.value}\` from ${currentSectionProfile.value_set_id}. Direct body edits cannot select a different lifecycle value.`
          : `Canonical value \`${entry.value}\` from ${currentSectionProfile.value_set_id}.`,
        insert_text: label,
        range: lineRange(parsed.lines, position.line),
        filter_text: label,
        sort_text: `1000-${String(index).padStart(4, "0")}`,
      });
    });
  }
  if (currentSectionProfile && /^\s*-\s*.*$/u.test(beforeCursor)) {
    resolveSectionPrefixes(currentSectionProfile).forEach((prefix, index) => {
      completions.push({
        id: `prefix:${currentSectionProfile.id}:${prefix}`,
        kind: "value",
        label: prefix,
        detail: `Canonical item prefix for ${currentSectionProfile.heading}`,
        documentation: `Derived from ${currentSectionProfile.id}.`,
        insert_text: `- ${prefix} `,
        range: completionRangeForLine(parsed.lines, position),
        sort_text: `2000-${String(index).padStart(4, "0")}`,
      });
    });
  }

  const applicableHovers = hovers.filter(
    (hover) =>
      position.line >= hover.range.start.line &&
      position.line <= hover.range.end.line,
  );

  const orderedDiagnostics = diagnostics.sort((left, right) => {
    const line = left.range.start.line - right.range.start.line;
    if (line) return line;
    const character = left.range.start.character - right.range.start.character;
    if (character) return character;
    return compare(
      `${left.rule_id}|${left.message}`,
      `${right.rule_id}|${right.message}`,
    );
  });

  return {
    contract_version: governedMarkdownAssistanceContractVersion,
    supported: true,
    project_path: projectPath,
    document: {
      model_id: record.modelId,
      id: record.id,
      title: record.title,
      registry_path: record.registryPath,
      profile_id: profile.profile_id,
      profile_path: profileEntry.path,
    },
    diagnostics: orderedDiagnostics,
    completions,
    hovers: applicableHovers,
    quick_fixes: [...quickFixes.values()].sort((left, right) =>
      compare(left.id, right.id),
    ),
  };
}

/**
 * Creates a reusable assistance service from canonical repository sources.
 *
 * @param {{rootDir: string}} input - Repository root.
 * @returns {{analyze: (input: {projectPath: string, text: string, position?: {line: number, character: number}}) => Record<string, unknown>}}
 */
export function createGovernedMarkdownAssistanceService({
  rootDir,
  referenceService = null,
}) {
  const absoluteRoot = path.resolve(rootDir);
  const sourceSet = loadGovernedDocumentModelSourceSet({ rootDir: absoluteRoot });
  const recordsByPath = loadBodyRecords(absoluteRoot);
  const valueSets = loadValueSets(absoluteRoot);
  const governedEntityReferenceService =
    referenceService ??
    createDefaultGovernedEntityReferenceService({
      rootDir: absoluteRoot,
      recordsByPath,
    });
  const service = {
    rootDir: absoluteRoot,
    sourceSet,
    recordsByPath,
    valueSets,
    referenceService: governedEntityReferenceService,
  };
  return {
    analyze(input) {
      return buildAssistanceResult(service, input);
    },
  };
}

/**
 * Performs one side-effect-free governed Markdown analysis.
 *
 * @param {{rootDir: string, projectPath: string, text: string, position?: {line: number, character: number}}} input - Analysis request.
 * @returns {Record<string, unknown>} Versioned assistance result.
 */
export function analyzeGovernedMarkdown(input) {
  return createGovernedMarkdownAssistanceService({ rootDir: input.rootDir }).analyze(
    input,
  );
}
