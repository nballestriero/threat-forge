import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "./governed-yaml.mjs";
import { loadGovernedDocumentModelSourceSet } from "./governed-document-model-sources.mjs";
import {
  createDiagnostic,
  extractCollectionRecordFieldOrders,
  extractTopLevelYamlFieldOrder,
  parseMarkdownDocument,
  readUtf8,
  resolveSafeProjectPath,
  sortDiagnostics,
  validateSectionContent,
} from "./governed-document-model-validation.mjs";

/**
 * @file Complete Functional Requirement model validation core.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Validates Functional Requirement registry records and Markdown bodies through
 * the canonical model and profiles. Validation is side-effect free and returns
 * stable, deterministically ordered diagnostics for migration reports and gates.
 */

export const functionalRequirementModelRuleIds = Object.freeze({
  registryRootFields: "functional-requirement.registry.root.fields",
  registryRootIdentity: "functional-requirement.registry.root.identity",
  registryRecordFields: "functional-requirement.registry.record.fields",
  registryRecordOrder: "functional-requirement.registry.record.order",
  registryIdentity: "functional-requirement.registry.record.identity",
  registryControlledValue:
    "functional-requirement.registry.record.controlled-value",
  registryOwner: "functional-requirement.registry.record.owner",
  registryParentForbidden:
    "functional-requirement.registry.record.parent.forbidden",
  registryDerivedPath: "functional-requirement.registry.record.derived-path",
  bodyHeader: "functional-requirement.body.header.identity",
  bodySections: "functional-requirement.body.section.structure",
  bodyContent: "functional-requirement.body.section.content",
  modelTitleMirror: "functional-requirement.model.title.mirror",
});

function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "").trim();
}

function formatTemplate(template, values) {
  return String(template ?? "").replace(/\{([^}]+)\}/gu, (_, key) =>
    String(values[key] ?? `{${key}}`),
  );
}

function expectedNames(fields) {
  return [...(fields ?? [])]
    .sort((left, right) => left.order - right.order)
    .map((field) => field.name);
}

function sameArray(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function fieldsByName(variant) {
  return new Map((variant.fields ?? []).map((field) => [field.name, field]));
}

function push(diagnostics, ruleId, representation, sourcePath, location, message) {
  diagnostics.push(
    createDiagnostic(
      ruleId,
      "functional-requirement",
      representation,
      sourcePath,
      location,
      message,
    ),
  );
}

function loadValueSets(sourceSet) {
  const taxonomyPath = resolveSafeProjectPath(
    sourceSet.rootDir,
    "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
  );
  const taxonomy = readGovernedYamlFile(taxonomyPath.absolute);

  return new Map(
    (taxonomy.field_value_sets ?? []).map((valueSet) => [
      String(valueSet.id),
      new Set((valueSet.values ?? []).map((entry) => String(entry.value))),
    ]),
  );
}

function listRequirementRegistries(rootDir) {
  const directoryProjectPath =
    "docs/reference/project-model/registers/requirements";
  const resolved = resolveSafeProjectPath(rootDir, directoryProjectPath);

  if (!fs.existsSync(resolved.absolute)) {
    throw new Error(
      `Requirement registry directory is missing: ${directoryProjectPath}`,
    );
  }

  return fs
    .readdirSync(resolved.absolute, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        /^MR-\d{4}\.requirements\.registry\.yml$/u.test(entry.name),
    )
    .map((entry) => `${directoryProjectPath}/${entry.name}`)
    .sort((left, right) =>
      left.localeCompare(right, "en", {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

function loadMacroRequirementIds(rootDir) {
  const registryPath = resolveSafeProjectPath(
    rootDir,
    "docs/reference/project-model/registers/macro-requirements.registry.yml",
  );
  const registry = readGovernedYamlFile(registryPath.absolute);

  return new Set(
    (registry.macro_requirements ?? [])
      .map((record) => String(record.id ?? "").trim())
      .filter(Boolean),
  );
}

function loadDecisionKeys(rootDir) {
  const directoryProjectPath =
    "docs/reference/project-model/registers/decisions";
  const resolved = resolveSafeProjectPath(rootDir, directoryProjectPath);

  if (!fs.existsSync(resolved.absolute)) {
    throw new Error(`Decision registry directory is missing: ${directoryProjectPath}`);
  }

  const keys = new Set();
  for (const entry of fs.readdirSync(resolved.absolute, { withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !/^MR-\d{4}\.decisions\.registry\.yml$/u.test(entry.name)
    ) {
      continue;
    }

    const registry = readGovernedYamlFile(path.join(resolved.absolute, entry.name));
    const macroRequirementId = String(registry.macro_requirement_id ?? "").trim();
    for (const decision of registry.decisions ?? []) {
      const decisionId = String(decision.id ?? "").trim();
      if (macroRequirementId && decisionId) {
        keys.add(`${macroRequirementId}/${decisionId}`);
      }
    }
  }

  return keys;
}

function aggregateSectionDiagnostics(
  diagnostics,
  section,
  sectionProfile,
  bodyPath,
) {
  const sectionDiagnostics = validateSectionContent(section, sectionProfile, {
    ruleId: functionalRequirementModelRuleIds.bodyContent,
    modelId: "functional-requirement",
    sourcePath: bodyPath,
  });

  if (Array.isArray(sectionProfile.forbidden_normative_keywords)) {
    const escaped = sectionProfile.forbidden_normative_keywords
      .map((value) => String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
      .sort((left, right) => right.length - left.length);
    const pattern = escaped.length
      ? new RegExp(`\\b(?:${escaped.join("|")})\\b`, "iu")
      : null;

    if (pattern) {
      for (const item of section.items) {
        if (pattern.test(item)) {
          sectionDiagnostics.push(
            createDiagnostic(
              functionalRequirementModelRuleIds.bodyContent,
              "functional-requirement",
              "markdown_body",
              bodyPath,
              `line:${section.line}`,
              `Section ${sectionProfile.heading} must not contain forbidden normative keywords.`,
            ),
          );
        }
      }
    }
  }

  if (sectionDiagnostics.length === 0) return;

  const messages = [...new Set(sectionDiagnostics.map((item) => item.message))]
    .sort();

  push(
    diagnostics,
    functionalRequirementModelRuleIds.bodyContent,
    "markdown_body",
    bodyPath,
    `line:${section.line}`,
    messages.join(" "),
  );
}

/**
 * Validates the complete governed Functional Requirement corpus.
 *
 * @param {{
 *   rootDir: string,
 *   sourceSet?: Record<string, unknown>
 * }} options - Validation options.
 * @returns {{
 *   model_id: string,
 *   registry_paths: string[],
 *   records_checked: number,
 *   diagnostics: Array<Record<string, unknown>>
 * }} Deterministic validation result.
 */
export function validateFunctionalRequirementModel(options = {}) {
  const rootDir = options.rootDir;
  const sourceSet =
    options.sourceSet ?? loadGovernedDocumentModelSourceSet({ rootDir });

  const registryProfile = sourceSet.profiles.find(
    (entry) => entry.value.profile_id === "requirement-registry",
  )?.value;
  const bodyProfile = sourceSet.profiles.find(
    (entry) => entry.value.profile_id === "functional-requirement-body",
  )?.value;
  const recordVariant = registryProfile?.record_variants?.find(
    (entry) => entry.model_id === "functional-requirement",
  );

  if (!registryProfile || !bodyProfile || !recordVariant) {
    throw new Error("Canonical Functional Requirement profiles are missing.");
  }

  const diagnostics = [];
  const registryPaths = listRequirementRegistries(sourceSet.rootDir);
  const macroRequirementIds = loadMacroRequirementIds(sourceSet.rootDir);
  const decisionKeys = loadDecisionKeys(sourceSet.rootDir);
  const valueSets = loadValueSets(sourceSet);
  const fieldDefinitions = fieldsByName(recordVariant);
  const expectedRoot = expectedNames(registryProfile.root_fields);
  const expectedRecord = expectedNames(recordVariant.fields);
  const expectedSections = [...bodyProfile.sections].sort(
    (left, right) => left.order - right.order,
  );
  const expectedHeadings = expectedSections.map((section) => section.heading);
  const requiredHeadings = expectedSections
    .filter((section) => section.cardinality === "exactly_one")
    .map((section) => section.heading);

  let recordsChecked = 0;
  const globalIds = new Set();

  for (const registryPath of registryPaths) {
    const resolvedRegistry = resolveSafeProjectPath(
      sourceSet.rootDir,
      registryPath,
    );
    const registryText = readUtf8(resolvedRegistry.absolute);
    const registry = readGovernedYamlFile(resolvedRegistry.absolute);
    const actualRoot = extractTopLevelYamlFieldOrder(registryText);

    if (!sameArray(actualRoot, expectedRoot)) {
      push(
        diagnostics,
        functionalRequirementModelRuleIds.registryRootFields,
        "yaml_registry",
        registryPath,
        "$",
        `Root fields must appear exactly in canonical order: ${expectedRoot.join(", ")}. Found: ${actualRoot.join(", ")}.`,
      );
    }

    const fileName = path.posix.basename(registryPath);
    const pathMacroRequirementId =
      fileName.match(/^(MR-\d{4})\.requirements\.registry\.yml$/u)?.[1] ?? "";
    const rootMacroRequirementId = String(
      registry.macro_requirement_id ?? "",
    ).trim();
    const expectedRegistryId = formatTemplate(
      registryProfile.root_fields.find((field) => field.name === "registry_id")
        ?.template,
      { macro_requirement_id: rootMacroRequirementId },
    );

    if (
      !pathMacroRequirementId ||
      rootMacroRequirementId !== pathMacroRequirementId ||
      String(registry.registry_id ?? "") !== expectedRegistryId
    ) {
      push(
        diagnostics,
        functionalRequirementModelRuleIds.registryRootIdentity,
        "yaml_registry",
        registryPath,
        "$",
        `Registry identity must be derived from ${pathMacroRequirementId || "<invalid-path>"}.`,
      );
    }

    if (!macroRequirementIds.has(rootMacroRequirementId)) {
      push(
        diagnostics,
        functionalRequirementModelRuleIds.registryOwner,
        "logical_model",
        registryPath,
        "$/macro_requirement_id",
        `Requirement registry references unknown Macro-requirement ${rootMacroRequirementId || "<empty>"}.`,
      );
    }

    const requirements = Array.isArray(registry.requirements)
      ? registry.requirements
      : [];
    const recordOrders = extractCollectionRecordFieldOrders(
      registryText,
      "requirements",
    );

    requirements.forEach((record, index) => {
      const recordId = String(record.id ?? "").trim();
      const functionalIdentityCandidate =
        /^MR-\d{4}ADR-\d{4}REQ-\d{4}$/u.test(recordId);
      if (
        record.requirement_type !== "functional" &&
        !functionalIdentityCandidate
      ) {
        return;
      }

      recordsChecked += 1;
      const sourceLocation = `$/requirements/${index}`;
      const actualNames = Object.keys(record);
      const missing = expectedRecord.filter(
        (name) => !Object.prototype.hasOwnProperty.call(record, name),
      );
      const unknown = actualNames.filter(
        (name) => !expectedRecord.includes(name),
      );

      if (missing.length || unknown.length) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.registryRecordFields,
          "yaml_registry",
          registryPath,
          sourceLocation,
          `Record fields differ from the canonical functional variant. Missing: ${missing.join(", ") || "none"}. Unknown: ${unknown.join(", ") || "none"}.`,
        );
      }

      if (record.parent_requirement_id !== undefined) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.registryParentForbidden,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/parent_requirement_id`,
          "Functional Requirement records must not declare parent_requirement_id.",
        );
      }

      if (
        recordOrders[index] &&
        !sameArray(recordOrders[index], expectedRecord)
      ) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.registryRecordOrder,
          "yaml_registry",
          registryPath,
          sourceLocation,
          `Record fields must appear in canonical order: ${expectedRecord.join(", ")}.`,
        );
      }

      const id = String(record.id ?? "").trim();
      const idPattern = fieldDefinitions.get("id")?.pattern;
      const identity = id.match(
        /^(MR-\d{4})(ADR-\d{4})(REQ-\d{4})$/u,
      );

      if (
        !id ||
        (idPattern && !new RegExp(idPattern, "u").test(id)) ||
        globalIds.has(id)
      ) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.registryIdentity,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/id`,
          `Functional Requirement id must be globally unique and match ${idPattern}.`,
        );
      }
      globalIds.add(id);

      for (const name of ["status", "requirement_type"]) {
        const definition = fieldDefinitions.get(name);
        const allowed = valueSets.get(definition?.value_set_id);
        const value = String(record[name] ?? "");
        if (
          definition &&
          (!allowed || !allowed.has(value) ||
            (definition.required_value !== undefined &&
              value !== String(definition.required_value)))
        ) {
          push(
            diagnostics,
            functionalRequirementModelRuleIds.registryControlledValue,
            "yaml_registry",
            registryPath,
            `${sourceLocation}/${name}`,
            `${name} must use the canonical functional value from ${definition.value_set_id}.`,
          );
        }
      }

      const recordMacroRequirementId = String(
        record.macro_requirement_id ?? "",
      ).trim();
      const recordDecisionId = String(record.decision_id ?? "").trim();
      const embeddedMacroRequirementId = identity?.[1] ?? "";
      const embeddedDecisionId = identity?.[2] ?? "";
      const decisionKey = `${recordMacroRequirementId}/${recordDecisionId}`;

      if (
        recordMacroRequirementId !== rootMacroRequirementId ||
        recordMacroRequirementId !== embeddedMacroRequirementId ||
        !macroRequirementIds.has(recordMacroRequirementId) ||
        recordDecisionId !== embeddedDecisionId ||
        !decisionKeys.has(decisionKey)
      ) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.registryOwner,
          "logical_model",
          registryPath,
          sourceLocation,
          `Functional Requirement ownership must match registry ${rootMacroRequirementId}, embedded identity ${embeddedMacroRequirementId || "<invalid>"}/${embeddedDecisionId || "<invalid>"}, and an existing Decision.`,
        );
      }

      const bodyPathDefinition = fieldDefinitions.get("body_path");
      const expectedBodyPath = formatTemplate(
        bodyPathDefinition?.template,
        {
          id,
          macro_requirement_id: rootMacroRequirementId,
        },
      );
      const bodyPath = normalizeProjectPath(record.body_path);

      if (bodyPath !== expectedBodyPath) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.registryDerivedPath,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/body_path`,
          `body_path must equal ${expectedBodyPath}.`,
        );
      }

      if (!bodyPath) return;

      let resolvedBody;
      try {
        resolvedBody = resolveSafeProjectPath(sourceSet.rootDir, bodyPath);
      } catch (error) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.registryDerivedPath,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/body_path`,
          error.message,
        );
        return;
      }

      if (!fs.existsSync(resolvedBody.absolute)) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.registryDerivedPath,
          "yaml_registry",
          registryPath,
          `${sourceLocation}/body_path`,
          `Body file does not exist: ${bodyPath}.`,
        );
        return;
      }

      const parsed = parseMarkdownDocument(readUtf8(resolvedBody.absolute));
      const expectedHeader = formatTemplate(bodyProfile.header.template, {
        id,
        title: record.title,
      });
      const expectedHeaderText = expectedHeader.replace(/^# /u, "");

      if (
        parsed.h1.length !== 1 ||
        parsed.h1[0].text !== expectedHeaderText
      ) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.bodyHeader,
          "markdown_body",
          bodyPath,
          "$",
          `Body must contain exactly one canonical H1: ${expectedHeader}.`,
        );
      }

      const actualHeadings = parsed.sections.map((section) => section.heading);
      const missingHeadings = requiredHeadings.filter(
        (heading) => !actualHeadings.includes(heading),
      );
      const unknownHeadings = actualHeadings.filter(
        (heading) => !expectedHeadings.includes(heading),
      );
      const duplicateHeadings = actualHeadings.filter(
        (heading, position) => actualHeadings.indexOf(heading) !== position,
      );
      const canonicalPresentOrder = expectedHeadings.filter((heading) =>
        actualHeadings.includes(heading),
      );
      const actualCanonicalOrder = actualHeadings.filter((heading) =>
        expectedHeadings.includes(heading),
      );

      if (
        missingHeadings.length ||
        unknownHeadings.length ||
        duplicateHeadings.length ||
        !sameArray(actualCanonicalOrder, canonicalPresentOrder)
      ) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.bodySections,
          "markdown_body",
          bodyPath,
          "$",
          `Body sections violate canonical order or cardinality. Missing: ${missingHeadings.join(", ") || "none"}. Unknown: ${unknownHeadings.join(", ") || "none"}. Duplicates: ${duplicateHeadings.join(", ") || "none"}.`,
        );
      }

      for (const sectionProfile of expectedSections) {
        const section = parsed.sections.find(
          (item) => item.heading === sectionProfile.heading,
        );
        if (!section) continue;
        aggregateSectionDiagnostics(
          diagnostics,
          section,
          sectionProfile,
          bodyPath,
        );
      }

      if (
        parsed.h1.length === 1 &&
        String(record.title ?? "").trim() &&
        !parsed.h1[0].text.endsWith(`— ${record.title}`)
      ) {
        push(
          diagnostics,
          functionalRequirementModelRuleIds.modelTitleMirror,
          "logical_model",
          bodyPath,
          "line:1",
          "Body title must mirror the registry title exactly.",
        );
      }
    });
  }

  return {
    model_id: "functional-requirement",
    registry_paths: registryPaths,
    records_checked: recordsChecked,
    diagnostics: sortDiagnostics(diagnostics),
  };
}
