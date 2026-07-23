#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readGovernedYamlFile } from "../MR-0001/lib/governed-yaml.mjs";
import {
  loadGovernedEntityResolverRegistry,
} from "../MR-0001/lib/governed-entity-references.mjs";
import {
  indexMethodologySpecificAnalysisRecords,
  methodologySpecificAnalysisRecordModel,
  methodologySpecificAnalysisRecordProfile,
  methodologySpecificAnalysisRecordRuleIds,
  methodologySpecificAnalysisRecordSubjectKinds,
  validateMethodologySpecificAnalysisRecord,
} from "./lib/methodology-specific-analysis-record-model.mjs";

/**
 * @file Deterministic methodology-specific analysis record validator.
 *
 * @implementsRequirement MR-0005ADR-0001REQ-0004GOV-0001
 * @derivedFromDecision MR-0005/ADR-0001
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Validates the canonical analysis-domain model boundary, discovers authored
 * methodology-specific analysis records and resolves governed subjects through
 * their owning canonical registries.
 *
 * Side effects: reads governed repository files and writes diagnostics only to
 * stdout or stderr. It never modifies analysis records, Base Analysis sources
 * or governed Functional Requirements.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");

const canonicalBaseAnalysisRegistryPath =
  "docs/reference/project-model/registers/base-analysis/" +
  "base-analysis-elements.registry.yml";

const canonicalRequirementsDirectory =
  "docs/reference/project-model/registers/requirements";

const analysisRecordSuffix = ".analysis-record.yml";

const ignoredDirectoryNames = new Set([
  ".git",
  ".threat-forge",
  "artifacts",
  "examples",
  "node_modules",
  "old",
]);

/**
 * Stable validator-owned diagnostic identifiers.
 */
export const methodologySpecificAnalysisRecordValidatorRuleIds =
  Object.freeze({
    modelProfile: "analysis-record.validation.model-profile",
    sourceRegistry: "analysis-record.validation.source-registry",
    referenceGrammar: "analysis-record.validation.reference-grammar",
    yamlSource: "analysis-record.validation.yaml-source",
  });

/**
 * Compares canonical strings deterministically.
 *
 * @param {unknown} left - Left value.
 * @param {unknown} right - Right value.
 * @returns {number} Stable comparison result.
 */
function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Creates one stable diagnostic.
 *
 * @param {string} ruleId - Stable diagnostic identifier.
 * @param {string} message - Human-readable diagnostic.
 * @param {string} [context] - Source context.
 * @returns {{rule_id: string, message: string, context: string}} Diagnostic.
 */
function problem(ruleId, message, context = "") {
  return {
    rule_id: ruleId,
    message,
    context,
  };
}

/**
 * Returns true for a mapping.
 *
 * @param {unknown} value - Candidate value.
 * @returns {boolean} Whether the value is a mapping.
 */
function isRecord(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

/**
 * Produces deterministic diagnostic ordering.
 *
 * @param {Array<Record<string, string>>} problems - Diagnostics.
 * @returns {Array<Record<string, string>>} Sorted diagnostics.
 */
function stableProblems(problems) {
  return [...problems].sort((left, right) =>
    compare(
      `${left.rule_id}|${left.context}|${left.message}`,
      `${right.rule_id}|${right.context}|${right.message}`,
    ),
  );
}

/**
 * Resolves a safe repository-relative path.
 *
 * @param {string} rootDir - Repository root.
 * @param {string} projectPath - Repository-relative path.
 * @returns {string} Absolute safe path.
 */
function resolveProjectPath(rootDir, projectPath) {
  const absoluteRoot = path.resolve(rootDir);
  const normalized = String(projectPath ?? "")
    .replaceAll("\\", "/")
    .trim();

  if (!normalized || path.isAbsolute(normalized)) {
    throw new Error(
      `Repository path must be relative and non-empty: ${projectPath}`,
    );
  }

  const absolute = path.resolve(absoluteRoot, ...normalized.split("/"));
  const relative = path.relative(absoluteRoot, absolute);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Repository path escapes root: ${projectPath}`);
  }

  return absolute;
}

/**
 * Converts an absolute path to canonical repository notation.
 *
 * @param {string} rootDir - Repository root.
 * @param {string} absolutePath - Absolute path.
 * @returns {string} Repository-relative path.
 */
function projectPath(rootDir, absolutePath) {
  return path.relative(rootDir, absolutePath).replaceAll("\\", "/");
}

/**
 * Discovers analysis record YAML files deterministically.
 *
 * @param {string} rootDir - Repository root.
 * @returns {string[]} Repository-relative analysis record paths.
 */
export function discoverMethodologySpecificAnalysisRecordPaths(rootDir) {
  const absoluteRoot = path.resolve(rootDir);
  const discovered = [];

  function visit(directory) {
    const entries = fs.readdirSync(directory, {
      withFileTypes: true,
    }).sort((left, right) => compare(left.name, right.name));

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        ignoredDirectoryNames.has(entry.name)
      ) {
        continue;
      }

      const absolute = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }

      if (
        entry.isFile() &&
        entry.name.endsWith(analysisRecordSuffix)
      ) {
        discovered.push(projectPath(absoluteRoot, absolute));
      }
    }
  }

  visit(absoluteRoot);
  return discovered.sort(compare);
}

/**
 * Validates the canonical model and representation profile relationship.
 *
 * @returns {Array<Record<string, string>>} Model diagnostics.
 */
export function validateMethodologySpecificAnalysisRecordModelBoundary(
  input = {},
) {
  const model =
    input.model ?? methodologySpecificAnalysisRecordModel;
  const profile =
    input.profile ?? methodologySpecificAnalysisRecordProfile;
  const modelRuleIds =
    input.modelRuleIds ??
    methodologySpecificAnalysisRecordRuleIds;
  const validatorRuleIds =
    input.validatorRuleIds ??
    methodologySpecificAnalysisRecordValidatorRuleIds;
  const errors = [];
  const ruleId = validatorRuleIds.modelProfile;

  if (
    model.profile_id !==
    profile.profile_id
  ) {
    errors.push(
      problem(
        ruleId,
        "Analysis record model and profile identifiers diverge.",
        "profile_id",
      ),
    );
  }

  if (
    model.record_domain !== "analysis" ||
    profile.record_domain !== "analysis"
  ) {
    errors.push(
      problem(
        ruleId,
        "Analysis record model and profile must remain in the analysis domain.",
        "record_domain",
      ),
    );
  }

  if (
    model.governed_document_model !==
      false ||
    model
      .authorable_governed_document_type !== false
  ) {
    errors.push(
      problem(
        ruleId,
        "Analysis records must remain outside governed document models and authoring types.",
        "governed_document_model",
      ),
    );
  }

  const requiredFields = new Set(
    profile.required_fields,
  );

  for (const requiredField of [
    "schema_version",
    "id",
    "method_id",
    "contributor_id",
    "scope",
    "subjects",
    "derivation_state",
  ]) {
    if (!requiredFields.has(requiredField)) {
      errors.push(
        problem(
          ruleId,
          `Canonical analysis record profile is missing required field ${requiredField}.`,
          requiredField,
        ),
      );
    }
  }

  if (
    profile.fields.method_id?.type !==
      "string" ||
    profile.fields.subjects?.type !==
      "array" ||
    profile.fields.subjects?.min_items !== 1
  ) {
    errors.push(
      problem(
        ruleId,
        "Canonical method and governed subject constraints are inconsistent.",
        "fields",
      ),
    );
  }

  const diagnosticIds = [
    ...Object.values(modelRuleIds),
    ...Object.values(validatorRuleIds),
  ];

  if (new Set(diagnosticIds).size !== diagnosticIds.length) {
    errors.push(
      problem(
        ruleId,
        "Analysis record diagnostic identifiers must be unique.",
        "diagnostic_rule_ids",
      ),
    );
  }

  return errors;
}

/**
 * Loads Base Analysis identities.
 *
 * @param {string} rootDir - Repository root.
 * @param {Array<Record<string, string>>} errors - Diagnostic sink.
 * @returns {{elementIds: Set<string>, relationIds: Set<string>}}
 *   Canonical Base Analysis identity sets.
 */
function loadBaseAnalysisIdentities(rootDir, errors) {
  const elementIds = new Set();
  const relationIds = new Set();
  const ruleId =
    methodologySpecificAnalysisRecordValidatorRuleIds.sourceRegistry;
  const absolute = resolveProjectPath(
    rootDir,
    canonicalBaseAnalysisRegistryPath,
  );

  if (!fs.existsSync(absolute)) {
    errors.push(
      problem(
        ruleId,
        `Canonical Base Analysis registry is missing: ${canonicalBaseAnalysisRegistryPath}.`,
        canonicalBaseAnalysisRegistryPath,
      ),
    );

    return {
      elementIds,
      relationIds,
    };
  }

  let registry;

  try {
    registry = readGovernedYamlFile(absolute);
  } catch (error) {
    errors.push(
      problem(
        ruleId,
        `Unable to parse canonical Base Analysis registry: ${error.message}`,
        canonicalBaseAnalysisRegistryPath,
      ),
    );

    return {
      elementIds,
      relationIds,
    };
  }

  for (const element of Array.isArray(registry?.elements)
    ? registry.elements
    : []) {
    const id = String(element?.id ?? "").trim();

    if (id) {
      elementIds.add(id);
    }
  }

  for (const relation of Array.isArray(registry?.relations)
    ? registry.relations
    : []) {
    const id = String(relation?.id ?? "").trim();

    if (id) {
      relationIds.add(id);
    }
  }

  return {
    elementIds,
    relationIds,
  };
}

/**
 * Loads every governed Functional Requirement identity.
 *
 * @param {string} rootDir - Repository root.
 * @param {Array<Record<string, string>>} errors - Diagnostic sink.
 * @returns {Set<string>} Canonical Functional Requirement identities.
 */
function loadFunctionalRequirementIds(rootDir, errors) {
  const requirementIds = new Set();
  const ruleId =
    methodologySpecificAnalysisRecordValidatorRuleIds.sourceRegistry;
  const absoluteDirectory = resolveProjectPath(
    rootDir,
    canonicalRequirementsDirectory,
  );

  if (!fs.existsSync(absoluteDirectory)) {
    errors.push(
      problem(
        ruleId,
        `Canonical Requirements directory is missing: ${canonicalRequirementsDirectory}.`,
        canonicalRequirementsDirectory,
      ),
    );

    return requirementIds;
  }

  const registryFiles = fs.readdirSync(absoluteDirectory, {
    withFileTypes: true,
  })
    .filter(
      (entry) =>
        entry.isFile() &&
        /^MR-\d{4}\.requirements\.registry\.yml$/u.test(
          entry.name,
        ),
    )
    .sort((left, right) => compare(left.name, right.name));

  for (const entry of registryFiles) {
    const absolute = path.join(absoluteDirectory, entry.name);
    const context = projectPath(rootDir, absolute);
    let registry;

    try {
      registry = readGovernedYamlFile(absolute);
    } catch (error) {
      errors.push(
        problem(
          ruleId,
          `Unable to parse governed Requirements registry: ${error.message}`,
          context,
        ),
      );
      continue;
    }

    for (const requirement of Array.isArray(registry?.requirements)
      ? registry.requirements
      : []) {
      if (
        String(requirement?.requirement_type ?? "").trim() !==
        "functional"
      ) {
        continue;
      }

      const id = String(requirement?.id ?? "").trim();

      if (!id) {
        continue;
      }

      if (requirementIds.has(id)) {
        errors.push(
          problem(
            ruleId,
            `Functional Requirement identity resolves more than once: ${id}.`,
            context,
          ),
        );
        continue;
      }

      requirementIds.add(id);
    }
  }

  return requirementIds;
}

/**
 * Loads the canonical BAE reference grammar.
 *
 * @param {string} rootDir - Repository root.
 * @param {Array<Record<string, string>>} errors - Diagnostic sink.
 * @returns {RegExp|null} Canonical BAE identifier pattern.
 */
function loadBaseAnalysisElementGrammar(rootDir, errors) {
  const ruleId =
    methodologySpecificAnalysisRecordValidatorRuleIds.referenceGrammar;
  let registry;

  try {
    registry = loadGovernedEntityResolverRegistry({
      rootDir,
    });
  } catch (error) {
    errors.push(
      problem(
        ruleId,
        error.message,
        "governed-entity-resolvers.registry.yml",
      ),
    );
    return null;
  }

  const resolvers = (Array.isArray(registry?.resolvers)
    ? registry.resolvers
    : []).filter(
      (resolver) =>
        String(resolver?.status ?? "").trim() === "active" &&
        String(resolver?.entity_type ?? "").trim() ===
          "base_analysis_element",
    );

  if (resolvers.length !== 1) {
    errors.push(
      problem(
        ruleId,
        "Exactly one active Base Analysis Element reference resolver is required.",
        "base_analysis_element",
      ),
    );
    return null;
  }

  const patternText = String(
    resolvers[0]?.identifier_pattern ?? "",
  ).trim();

  try {
    return new RegExp(patternText, "u");
  } catch {
    errors.push(
      problem(
        ruleId,
        "Base Analysis Element resolver identifier_pattern is invalid.",
        "base_analysis_element",
      ),
    );
    return null;
  }
}

/**
 * Loads the read-only governed subject resolution context.
 *
 * @param {string} rootDir - Repository root.
 * @returns {{
 *   errors: Array<Record<string, string>>,
 *   resolveSubject: (kind: string, id: string) => boolean
 * }} Resolution context.
 */
function loadSubjectResolutionContext(rootDir) {
  const errors = [];
  const {
    elementIds,
    relationIds,
  } = loadBaseAnalysisIdentities(rootDir, errors);
  const functionalRequirementIds =
    loadFunctionalRequirementIds(rootDir, errors);
  const baePattern =
    loadBaseAnalysisElementGrammar(rootDir, errors);

  const supportedKinds = new Set(
    methodologySpecificAnalysisRecordSubjectKinds.map(
      ({ value }) => value,
    ),
  );

  return {
    errors,

    resolveSubject(kind, id) {
      if (!supportedKinds.has(kind)) {
        return false;
      }

      if (kind === "base_analysis_element") {
        if (baePattern) {
          baePattern.lastIndex = 0;

          if (!baePattern.test(id)) {
            return false;
          }
        }

        return elementIds.has(id);
      }

      if (kind === "base_analysis_relation") {
        return relationIds.has(id);
      }

      if (kind === "functional_requirement") {
        return functionalRequirementIds.has(id);
      }

      return false;
    },
  };
}

/**
 * Validates all methodology-specific analysis records in one repository.
 *
 * @param {{
 *   rootDir?: string,
 *   recordPaths?: string[]
 * }} [input] - Repository validation context.
 * @returns {{
 *   valid: boolean,
 *   record_count: number,
 *   record_paths: string[],
 *   errors: Array<Record<string, string>>
 * }} Deterministic validation result.
 */
export function validateMethodologySpecificAnalysisRecordRepository(
  input = {},
) {
  const rootDir = path.resolve(input.rootDir ?? defaultRootDir);
  const errors =
    validateMethodologySpecificAnalysisRecordModelBoundary();
  const resolution = loadSubjectResolutionContext(rootDir);

  errors.push(...resolution.errors);

  const recordPaths = Array.isArray(input.recordPaths)
    ? [...input.recordPaths]
      .map((value) => String(value).replaceAll("\\", "/"))
      .sort(compare)
    : discoverMethodologySpecificAnalysisRecordPaths(rootDir);

  const validRecords = [];

  for (const recordPath of recordPaths) {
    let absolute;

    try {
      absolute = resolveProjectPath(rootDir, recordPath);
    } catch (error) {
      errors.push(
        problem(
          methodologySpecificAnalysisRecordValidatorRuleIds.yamlSource,
          error.message,
          recordPath,
        ),
      );
      continue;
    }

    if (!fs.existsSync(absolute)) {
      errors.push(
        problem(
          methodologySpecificAnalysisRecordValidatorRuleIds.yamlSource,
          `Analysis record source is missing: ${recordPath}.`,
          recordPath,
        ),
      );
      continue;
    }

    let candidate;

    try {
      candidate = readGovernedYamlFile(absolute);
    } catch (error) {
      errors.push(
        problem(
          methodologySpecificAnalysisRecordValidatorRuleIds.yamlSource,
          `Unable to parse analysis record YAML: ${error.message}`,
          recordPath,
        ),
      );
      continue;
    }

    const result = validateMethodologySpecificAnalysisRecord(
      candidate,
      {
        resolveSubject: resolution.resolveSubject,
      },
    );

    for (const diagnostic of result.errors) {
      errors.push({
        ...diagnostic,
        context: diagnostic.context
          ? `${recordPath}:${diagnostic.context}`
          : recordPath,
      });
    }

    if (result.valid && isRecord(result.value)) {
      validRecords.push({
        path: recordPath,
        value: result.value,
      });
    }
  }

  const index = indexMethodologySpecificAnalysisRecords(
    validRecords.map(({ value }) => value),
  );

  for (const duplicateId of index.duplicateIds) {
    const matchingPaths = validRecords
      .filter(({ value }) => value.id === duplicateId)
      .map(({ path: matchingPath }) => matchingPath)
      .sort(compare);

    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds
          .duplicateIdentifier,
        `Analysis record identifier resolves more than once: ${duplicateId}.`,
        matchingPaths.join(", "),
      ),
    );
  }

  return {
    valid: errors.length === 0,
    record_count: recordPaths.length,
    record_paths: recordPaths,
    errors: stableProblems(errors),
  };
}

/**
 * Runs the repository validator command.
 *
 * @returns {void}
 */
function run() {
  const rootDir = path.resolve(
    process.env.TF_ANALYSIS_RECORD_ROOT ?? defaultRootDir,
  );

  const result =
    validateMethodologySpecificAnalysisRecordRepository({
      rootDir,
    });

  if (!result.valid) {
    for (const diagnostic of result.errors) {
      const context = diagnostic.context
        ? ` [${diagnostic.context}]`
        : "";

      console.error(
        `${diagnostic.rule_id}${context}: ${diagnostic.message}`,
      );
    }

    console.error(
      `Methodology-specific analysis record validation failed ` +
      `with ${result.errors.length} error(s).`,
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    `Methodology-specific analysis record validation passed ` +
    `(${result.record_count} record(s)).`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === scriptPath
) {
  run();
}