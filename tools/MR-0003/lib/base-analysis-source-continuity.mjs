import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "../../MR-0001/lib/governed-yaml.mjs";
import {
  loadGovernedDocumentModelSourceSet,
} from "../../MR-0001/lib/governed-document-model-sources.mjs";

/**
 * @file BAE source continuity and occurrence projection core.
 *
 * @implementsRequirement MR-0003ADR-0002REQ-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0003/ADR-0002
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Validates immutable historical origin, current documentary authority,
 * append-only source-history topology, natural documentary origin evidence and
 * deterministic repository-wide BAE reference occurrences. Side effects:
 * reads governed registries and Markdown bodies only when loading the canonical
 * repository context; validation and projection are side-effect free.
 */

export const baseAnalysisSourceContinuityRuleIds = Object.freeze({
  documentContext: "bae.source-continuity.document-context",
  authoritativeSourceRecord:
    "bae.source-continuity.authoritative-source.record",
  authoritativeSourceUnresolved:
    "bae.source-continuity.authoritative-source.unresolved",
  sourceHistoryRecord: "bae.source-continuity.source-history.record",
  sourceHistorySequence: "bae.source-continuity.source-history.sequence",
  sourceHistoryOriginStart:
    "bae.source-continuity.source-history.origin-start",
  sourceHistoryAuthoritativeEnd:
    "bae.source-continuity.source-history.authoritative-end",
  sourceHistoryDiscontinuity:
    "bae.source-continuity.source-history.discontinuity",
  sourceHistoryCycle: "bae.source-continuity.source-history.cycle",
  sourceHistoryOutcome: "bae.source-continuity.source-history.outcome",
  sourceHistoryReviewEvidence:
    "bae.source-continuity.source-history.review-evidence",
  lifecycleAuthority: "bae.source-continuity.lifecycle.authority",
  originDeclarationMissing:
    "bae.source-continuity.origin-declaration.missing",
  originDeclarationMultiple:
    "bae.source-continuity.origin-declaration.multiple",
  originDeclarationOwner:
    "bae.source-continuity.origin-declaration.owner",
  originDeclarationPayload:
    "bae.source-continuity.origin-declaration.payload",
  referenceOccurrenceUnknown:
    "bae.source-continuity.reference-occurrence.unknown",
  referenceOccurrenceTitle:
    "bae.source-continuity.reference-occurrence.title",
  occurrenceProjectionDivergence:
    "bae.source-continuity.reference-occurrence.projection-divergence",
});

export const canonicalSourceHistoryOutcomes = Object.freeze([
  "continuity_confirmed",
  "authority_transferred",
  "bae_superseded",
  "bae_deprecated",
]);

const macroRegistryProjectPath =
  "docs/reference/project-model/registers/macro-requirements.registry.yml";

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return String(value ?? "").trim();
}

function normalizeProjectPath(value) {
  return text(value).replaceAll("\\", "/").replace(/^\.\//u, "");
}

function problem(ruleId, message, context = "") {
  return { rule_id: ruleId, message, context };
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compare)
      .map((key) => [key, stableJson(value[key])]),
  );
}

function sourceRecord(value) {
  if (!isRecord(value)) return null;
  const kind = text(value.kind || value.source_kind);
  const sourceId = text(value.source_id);
  const sourcePath = normalizeProjectPath(value.source_path);
  return kind && sourceId && sourcePath
    ? { kind, source_id: sourceId, source_path: sourcePath }
    : null;
}

function sourceKey(value) {
  const source = sourceRecord(value);
  return source
    ? `${source.kind}|${source.source_id}|${source.source_path}`
    : "";
}

function sourceForResolver(value) {
  const source = sourceRecord(value);
  return source
    ? {
        source_kind: source.kind,
        source_id: source.source_id,
        source_path: source.source_path,
      }
    : null;
}

function sourceEquals(left, right) {
  const leftKey = sourceKey(left);
  return Boolean(leftKey) && leftKey === sourceKey(right);
}

function normalizeAllowedPrefix(value) {
  if (typeof value === "string") return value;
  if (isRecord(value)) {
    const key = text(Object.keys(value)[0])
      .replace(/^["']+/u, "")
      .replace(/["']+$/u, "")
      .replace(/:+$/u, "");
    return key ? `${key}:` : "";
  }
  return "";
}

function safeProjectPath(rootDir, projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  if (
    !normalized ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Unsafe repository path: ${normalized || "<empty>"}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Unsafe repository path: ${normalized}`);
  }
  const absolute = path.resolve(rootDir, ...segments);
  if (
    absolute !== rootDir &&
    !absolute.startsWith(`${path.resolve(rootDir)}${path.sep}`)
  ) {
    throw new Error(`Repository path escapes root: ${normalized}`);
  }
  return { normalized, absolute };
}

function readYaml(rootDir, projectPath) {
  return readGovernedYamlFile(safeProjectPath(rootDir, projectPath).absolute);
}

function documentAliases(document) {
  return new Set(
    [
      document.id,
      document.canonical_id,
      ...(Array.isArray(document.aliases) ? document.aliases : []),
    ]
      .map(text)
      .filter(Boolean),
  );
}

function findDocumentForSource(source, documents) {
  const normalized = sourceRecord(source);
  if (!normalized) return null;
  return (
    documents.find(
      (document) =>
        normalizeProjectPath(document.body_path) === normalized.source_path &&
        documentAliases(document).has(normalized.source_id),
    ) ?? null
  );
}

function nonActiveDocumentStatus(status) {
  return new Set(["superseded", "deprecated", "removed"]).has(text(status));
}

function addDocument(output, input, rootDir) {
  const bodyPath = normalizeProjectPath(input.body_path);
  const resolved = safeProjectPath(rootDir, bodyPath);
  if (!fs.existsSync(resolved.absolute) || !fs.statSync(resolved.absolute).isFile()) {
    throw new Error(`Registered governed body does not exist: ${bodyPath}`);
  }
  output.push({
    id: text(input.id),
    canonical_id: text(input.canonical_id || input.id),
    aliases: Array.isArray(input.aliases)
      ? input.aliases.map(text).filter(Boolean)
      : [],
    model_id: text(input.model_id),
    macro_requirement_id: text(input.macro_requirement_id),
    decision_id: text(input.decision_id),
    parent_requirement_id: text(input.parent_requirement_id),
    status: text(input.status),
    title: text(input.title),
    body_path: bodyPath,
    profile_id: text(input.profile_id),
    body_text: fs.readFileSync(resolved.absolute, "utf8").replace(/^\uFEFF/u, ""),
  });
}

/**
 * Loads the deterministic governed-document corpus from canonical registry
 * ownership and registered body paths.
 *
 * @param {{rootDir?: string}} [options] - Repository root.
 * @returns {{
 *   documents: Array<Record<string, unknown>>,
 *   profiles: Array<Record<string, unknown>>,
 *   reviewEvidenceResolver: (id: string) => boolean
 * }} Canonical document context.
 */
export function loadBaseAnalysisDocumentContext(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const sourceSet = loadGovernedDocumentModelSourceSet({ rootDir });
  const profiles = sourceSet.profiles.map((entry) => structuredClone(entry.value));
  const profileByModel = new Map([
    ["macro-requirement", "macro-requirement-body"],
    ["decision", "decision-body"],
    ["functional-requirement", "functional-requirement-body"],
    ["governance-requirement", "governance-requirement-body"],
  ]);
  const macroRegistry = readYaml(rootDir, macroRegistryProjectPath);
  const documents = [];

  for (const macro of macroRegistry.macro_requirements ?? []) {
    const macroId = text(macro.id);
    addDocument(
      documents,
      {
        ...macro,
        canonical_id: macroId,
        model_id: "macro-requirement",
        macro_requirement_id: macroId,
        profile_id: profileByModel.get("macro-requirement"),
      },
      rootDir,
    );

    const decisionRegistryPath = normalizeProjectPath(
      macro.decisions_registry_path,
    );
    const decisionRegistry = readYaml(rootDir, decisionRegistryPath);
    for (const decision of decisionRegistry.decisions ?? []) {
      const decisionId = text(decision.id);
      addDocument(
        documents,
        {
          ...decision,
          canonical_id: `${macroId}/${decisionId}`,
          aliases: [decisionId],
          model_id: "decision",
          macro_requirement_id: macroId,
          profile_id: profileByModel.get("decision"),
        },
        rootDir,
      );
    }

    const requirementRegistryPath = normalizeProjectPath(
      macro.requirements_registry_path,
    );
    const requirementRegistry = readYaml(rootDir, requirementRegistryPath);
    for (const requirement of requirementRegistry.requirements ?? []) {
      const requirementType = text(requirement.requirement_type);
      const modelId =
        requirementType === "governance"
          ? "governance-requirement"
          : "functional-requirement";
      addDocument(
        documents,
        {
          ...requirement,
          canonical_id: text(requirement.id),
          model_id: modelId,
          macro_requirement_id: macroId,
          profile_id: profileByModel.get(modelId),
        },
        rootDir,
      );
    }
  }

  documents.sort((left, right) =>
    compare(
      `${left.model_id}|${left.canonical_id}|${left.body_path}`,
      `${right.model_id}|${right.canonical_id}|${right.body_path}`,
    ),
  );
  const evidenceIds = new Set();
  for (const document of documents) {
    for (const alias of documentAliases(document)) evidenceIds.add(alias);
  }

  return {
    documents,
    profiles,
    reviewEvidenceResolver: (id) => evidenceIds.has(text(id)),
  };
}

function parseCanonicalPayload(value) {
  const match = text(value).match(/^\[(BAE-\d{4})\]\s+(.+)$/u);
  return match ? { id: match[1], title: match[2].trim() } : null;
}

function sectionRange(lines, heading) {
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return null;
  let end = lines.length - 1;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/u.test(lines[index])) {
      end = index - 1;
      break;
    }
  }
  return { start, end };
}

function extractPositionPayload(line, position) {
  if (text(position.container_kind) !== "classified_list_item") return null;
  const prefixes = (position.allowed_prefixes ?? [])
    .map(normalizeAllowedPrefix)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  const itemMatch = String(line).match(/^\s*-\s+(.+)$/u);
  if (!itemMatch) return null;
  const item = itemMatch[1];
  const prefix = prefixes.find(
    (candidate) => item === candidate || item.startsWith(`${candidate} `),
  );
  if (!prefix || item === prefix) return null;
  let payload = item.slice(prefix.length).trim();

  const excluded = (position.excluded_payload_prefixes ?? [])
    .map(normalizeAllowedPrefix)
    .filter(Boolean);
  if (excluded.some((candidate) => payload.startsWith(candidate))) return null;

  const payloadPrefixes = (position.payload_prefixes ?? [])
    .map(normalizeAllowedPrefix)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  if (payloadPrefixes.length > 0) {
    const payloadPrefix = payloadPrefixes.find((candidate) =>
      payload.startsWith(candidate),
    );
    if (!payloadPrefix) return null;
    payload = payload.slice(payloadPrefix.length).trim();
  }

  if (
    text(position.terminal_punctuation) === "period" &&
    payload.endsWith(".")
  ) {
    payload = payload.slice(0, -1).trimEnd();
  }
  const column = Math.max(0, String(line).indexOf(payload));
  return { payload, column };
}

function scanDeclaredPositions({ documents, profiles, elementsById }) {
  const errors = [];
  const originDeclarations = [];
  const occurrences = [];
  const profileById = new Map(
    profiles.map((profile) => [text(profile.profile_id), profile]),
  );

  for (const document of documents) {
    const profile = profileById.get(text(document.profile_id));
    if (!profile) continue;
    const lines = String(document.body_text ?? "").replace(/\r\n/gu, "\n").split("\n");
    const sectionById = new Map(
      (profile.sections ?? []).map((section) => [text(section.id), section]),
    );
    const positionGroups = [
      {
        role: "origin",
        positions: Array.isArray(profile.origin_evidence_positions)
          ? profile.origin_evidence_positions
          : [],
      },
      {
        role: "reference",
        positions: Array.isArray(profile.reference_positions)
          ? profile.reference_positions
          : [],
      },
    ];

    for (const { role, positions } of positionGroups) {
      for (const position of positions) {
        const section = sectionById.get(text(position.section_id));
        if (!section) continue;
        const range = sectionRange(lines, text(section.heading));
        if (!range) continue;

        for (
          let lineIndex = range.start + 1;
          lineIndex <= range.end;
          lineIndex += 1
        ) {
        const extracted = extractPositionPayload(lines[lineIndex], position);
        if (!extracted) continue;
        const parsed = parseCanonicalPayload(extracted.payload);
        const context = `${document.body_path}:${lineIndex + 1}:${extracted.column + 1}`;

        if (!parsed) {
          if (
            role === "origin" &&
            /^\[BAE-/u.test(text(extracted.payload))
          ) {
            errors.push(
              problem(
                baseAnalysisSourceContinuityRuleIds.originDeclarationPayload,
                `BAE origin evidence must contain canonical payload [BAE-0000] Canonical title.`,
                context,
              ),
            );
          }
          continue;
        }

        const element = elementsById.get(parsed.id);
        if (!element) {
          errors.push(
            problem(
              role === "origin"
                ? baseAnalysisSourceContinuityRuleIds.originDeclarationPayload
                : baseAnalysisSourceContinuityRuleIds.referenceOccurrenceUnknown,
              `Governed ${role} position references unknown BAE ${parsed.id}.`,
              context,
            ),
          );
          continue;
        }
        if (text(element.title) !== parsed.title) {
          errors.push(
            problem(
              role === "origin"
                ? baseAnalysisSourceContinuityRuleIds.originDeclarationPayload
                : baseAnalysisSourceContinuityRuleIds.referenceOccurrenceTitle,
              `BAE ${parsed.id} title must equal ${text(element.title)}.`,
              context,
            ),
          );
          continue;
        }

        const record = {
          bae_id: parsed.id,
          document_model: text(document.model_id),
          document_id: text(document.canonical_id || document.id),
          body_path: normalizeProjectPath(document.body_path),
          profile_id: text(profile.profile_id),
          position_id: text(position.id),
          line: lineIndex + 1,
          column: extracted.column + 1,
          source_offset: lines
            .slice(0, lineIndex)
            .reduce((total, current) => total + current.length + 1, 0) +
            extracted.column,
          canonical_payload: `[${parsed.id}] ${parsed.title}`,
        };

          if (role === "origin") originDeclarations.push(record);
          else occurrences.push(record);
        }
      }
    }
  }

  const ordering = (entry) =>
    [
      entry.bae_id,
      entry.document_model,
      entry.document_id,
      entry.body_path,
      entry.position_id,
      String(entry.source_offset).padStart(12, "0"),
    ].join("|");
  originDeclarations.sort((left, right) =>
    compare(ordering(left), ordering(right)),
  );
  occurrences.sort((left, right) => compare(ordering(left), ordering(right)));

  return { errors, originDeclarations, occurrences };
}

/**
 * Validates BAE source continuity and derives canonical reference occurrences.
 *
 * @param {{
 *   inventory?: Record<string, unknown>,
 *   documents?: Array<Record<string, unknown>>,
 *   profiles?: Array<Record<string, unknown>>,
 *   sourceResolver?: (source: Record<string, unknown>) => boolean,
 *   reviewEvidenceResolver?: (id: string) => boolean,
 *   allowedOutcomes?: Set<string> | string[],
 *   candidateOccurrenceProjection?: Array<Record<string, unknown>>
 * }} input - Canonical BAE and governed document inputs.
 * @returns {{
 *   valid: boolean,
 *   errors: Array<Record<string, string>>,
 *   warnings: Array<Record<string, string>>,
 *   source_history_count: number,
 *   origin_evidence_count: number,
 *   occurrences: Array<Record<string, unknown>>
 * }} Deterministic side-effect-free result.
 */
export function validateBaseAnalysisSourceContinuity(input = {}) {
  const inventory = isRecord(input.inventory) ? input.inventory : {};
  const elements = Array.isArray(inventory.elements) ? inventory.elements : [];
  const documents = Array.isArray(input.documents) ? input.documents : [];
  const profiles = Array.isArray(input.profiles) ? input.profiles : [];
  const sourceResolver =
    typeof input.sourceResolver === "function" ? input.sourceResolver : () => true;
  const reviewEvidenceResolver =
    typeof input.reviewEvidenceResolver === "function"
      ? input.reviewEvidenceResolver
      : null;
  const allowedOutcomes = new Set(
    input.allowedOutcomes ?? canonicalSourceHistoryOutcomes,
  );
  const errors = [];
  const warnings = [];
  const elementsById = new Map(
    elements
      .filter(isRecord)
      .map((element) => [text(element.id), element])
      .filter(([id]) => id),
  );
  let sourceHistoryCount = 0;

  const sourceResolves = (source) => {
    const normalized = sourceRecord(source);
    if (!normalized) return false;
    if (
      normalized.kind === "governed_document" &&
      documents.length > 0
    ) {
      return Boolean(findDocumentForSource(normalized, documents));
    }
    return sourceResolver(sourceForResolver(normalized));
  };

  for (const [index, element] of elements.entries()) {
    if (!isRecord(element)) continue;
    const context = `elements[${index}]`;
    const origin = sourceRecord(element.origin);
    const authoritativeSource = sourceRecord(element.authoritative_source);
    if (!authoritativeSource) {
      errors.push(
        problem(
          baseAnalysisSourceContinuityRuleIds.authoritativeSourceRecord,
          `${context} authoritative_source must declare kind, source_id and source_path.`,
          context,
        ),
      );
    } else if (!sourceResolves(authoritativeSource)) {
      errors.push(
        problem(
          baseAnalysisSourceContinuityRuleIds.authoritativeSourceUnresolved,
          `${context} authoritative_source does not resolve.`,
          context,
        ),
      );
    }

    const history = Array.isArray(element.source_history)
      ? element.source_history
      : [];
    if (!Array.isArray(element.source_history) || history.length === 0) {
      errors.push(
        problem(
          baseAnalysisSourceContinuityRuleIds.sourceHistoryRecord,
          `${context} source_history must be a non-empty ordered list.`,
          context,
        ),
      );
      continue;
    }
    sourceHistoryCount += history.length;

    let previousTerminal = null;
    const visited = new Set(origin ? [sourceKey(origin)] : []);
    for (const [historyIndex, entry] of history.entries()) {
      const historyContext = `${context}.source_history[${historyIndex}]`;
      if (!isRecord(entry)) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryRecord,
            `${historyContext} must be a mapping.`,
            historyContext,
          ),
        );
        continue;
      }
      const expectedSequence = historyIndex + 1;
      if (Number(entry.sequence) !== expectedSequence) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistorySequence,
            `${historyContext} sequence must equal ${expectedSequence}.`,
            historyContext,
          ),
        );
      }

      const previousSource = sourceRecord(entry.previous_source);
      const nextSource = sourceRecord(entry.next_source);
      const outcome = text(entry.outcome);
      const evidenceId = text(entry.review_evidence_id);
      if (!previousSource || !nextSource) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryRecord,
            `${historyContext} must declare previous_source and next_source.`,
            historyContext,
          ),
        );
        continue;
      }
      if (!sourceResolves(previousSource) || !sourceResolves(nextSource)) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryRecord,
            `${historyContext} contains an unresolved source.`,
            historyContext,
          ),
        );
      }
      if (!allowedOutcomes.has(outcome)) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryOutcome,
            `${historyContext} uses unsupported outcome ${outcome || "<empty>"}.`,
            historyContext,
          ),
        );
      }
      if (
        outcome === "continuity_confirmed" &&
        !sourceEquals(previousSource, nextSource)
      ) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryOutcome,
            `${historyContext} continuity_confirmed requires equivalent previous and next sources.`,
            historyContext,
          ),
        );
      }
      if (
        outcome === "authority_transferred" &&
        sourceEquals(previousSource, nextSource)
      ) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryOutcome,
            `${historyContext} authority_transferred requires different previous and next sources.`,
            historyContext,
          ),
        );
      }
      if (
        outcome === "bae_superseded" &&
        text(element.lifecycle_state) !== "superseded"
      ) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryOutcome,
            `${historyContext} bae_superseded requires lifecycle_state superseded.`,
            historyContext,
          ),
        );
      }
      if (
        outcome === "bae_deprecated" &&
        text(element.lifecycle_state) !== "deprecated"
      ) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryOutcome,
            `${historyContext} bae_deprecated requires lifecycle_state deprecated.`,
            historyContext,
          ),
        );
      }
      if (
        !evidenceId ||
        (reviewEvidenceResolver && !reviewEvidenceResolver(evidenceId))
      ) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryReviewEvidence,
            `${historyContext} review_evidence_id must resolve.`,
            historyContext,
          ),
        );
      }

      if (historyIndex === 0 && origin && !sourceEquals(previousSource, origin)) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryOriginStart,
            `${historyContext} previous_source must equal the immutable historical origin.`,
            historyContext,
          ),
        );
      }
      if (
        previousTerminal &&
        !sourceEquals(previousSource, previousTerminal)
      ) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryDiscontinuity,
            `${historyContext} previous_source must equal the prior transition next_source.`,
            historyContext,
          ),
        );
      }

      const nextKey = sourceKey(nextSource);
      if (
        !sourceEquals(previousSource, nextSource) &&
        nextKey &&
        visited.has(nextKey)
      ) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.sourceHistoryCycle,
            `${historyContext} re-enters an earlier authoritative source.`,
            historyContext,
          ),
        );
      }
      if (nextKey) visited.add(nextKey);
      previousTerminal = nextSource;
    }

    if (
      authoritativeSource &&
      previousTerminal &&
      !sourceEquals(previousTerminal, authoritativeSource)
    ) {
      errors.push(
        problem(
          baseAnalysisSourceContinuityRuleIds.sourceHistoryAuthoritativeEnd,
          `${context} terminal source-history next_source must equal authoritative_source.`,
          context,
        ),
      );
    }

    if (
      authoritativeSource &&
      text(element.lifecycle_state) === "active" &&
      documents.length > 0
    ) {
      const authoritativeDocument = findDocumentForSource(
        authoritativeSource,
        documents,
      );
      const terminalOutcome = text(history.at(-1)?.outcome);
      if (
        authoritativeDocument &&
        nonActiveDocumentStatus(authoritativeDocument.status) &&
        !new Set(["bae_superseded", "bae_deprecated"]).has(terminalOutcome)
      ) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.lifecycleAuthority,
            `${context} active BAE resolves to a non-active authoritative document without an explicit lifecycle outcome.`,
            context,
          ),
        );
      }
    }
  }

  let originDeclarations = [];
  let occurrences = [];
  if (documents.length > 0 && profiles.length > 0) {
    const scanned = scanDeclaredPositions({
      documents,
      profiles,
      elementsById,
    });
    errors.push(...scanned.errors);
    originDeclarations = scanned.originDeclarations;
    occurrences = scanned.occurrences;

    for (const [id, element] of elementsById.entries()) {
      const origin = sourceRecord(element.origin);
      if (!origin || origin.kind !== "governed_document") continue;
      const expectedDocument = findDocumentForSource(origin, documents);
      const declarations = originDeclarations.filter(
        (entry) => entry.bae_id === id,
      );
      const owned = expectedDocument
        ? declarations.filter(
            (entry) =>
              normalizeProjectPath(entry.body_path) ===
              normalizeProjectPath(expectedDocument.body_path),
          )
        : [];

      if (owned.length === 0) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.originDeclarationMissing,
            `BAE ${id} historical origin body must contain exactly one canonical origin evidence.`,
            id,
          ),
        );
      } else if (owned.length > 1) {
        errors.push(
          problem(
            baseAnalysisSourceContinuityRuleIds.originDeclarationMultiple,
            `BAE ${id} historical origin body contains multiple canonical origin evidence occurrences.`,
            id,
          ),
        );
      }
      for (const declaration of declarations) {
        if (
          !expectedDocument ||
          normalizeProjectPath(declaration.body_path) !==
            normalizeProjectPath(expectedDocument.body_path)
        ) {
          errors.push(
            problem(
              baseAnalysisSourceContinuityRuleIds.originDeclarationOwner,
              `BAE ${id} origin evidence belongs to a document different from its immutable historical origin.`,
              `${declaration.body_path}:${declaration.line}`,
            ),
          );
        }
      }
    }
  }

  if (input.candidateOccurrenceProjection !== undefined) {
    if (
      JSON.stringify(stableJson(input.candidateOccurrenceProjection)) !==
      JSON.stringify(stableJson(occurrences))
    ) {
      errors.push(
        problem(
          baseAnalysisSourceContinuityRuleIds.occurrenceProjectionDivergence,
          "Candidate BAE reference occurrence projection differs from canonical governed bodies.",
          "reference-occurrence-projection",
        ),
      );
    }
  }

  errors.sort((left, right) =>
    compare(
      `${left.rule_id}|${left.context}|${left.message}`,
      `${right.rule_id}|${right.context}|${right.message}`,
    ),
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    source_history_count: sourceHistoryCount,
    origin_evidence_count: originDeclarations.length,
    occurrences,
  };
}
