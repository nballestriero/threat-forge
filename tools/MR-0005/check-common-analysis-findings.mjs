#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readGovernedYamlFile } from "../MR-0001/lib/governed-yaml.mjs";
import {
  loadGovernedEntityResolverRegistry,
} from "../MR-0001/lib/governed-entity-references.mjs";
import {
  discoverMethodologySpecificAnalysisRecordPaths,
  validateMethodologySpecificAnalysisRecordRepository,
} from "./check-methodology-specific-analysis-records.mjs";
import {
  indexMethodologySpecificAnalysisRecords,
  validateMethodologySpecificAnalysisRecord,
} from "./lib/methodology-specific-analysis-record-model.mjs";
import {
  commonAnalysisFindingAffectedSubjectKinds,
  commonAnalysisFindingModel,
  commonAnalysisFindingProfile,
  commonAnalysisFindingReviewStates,
  commonAnalysisFindingRuleIds,
  indexCommonAnalysisFindings,
  validateCommonAnalysisFinding,
} from "./lib/common-analysis-finding-model.mjs";

/**
 * @file Deterministic common analysis finding validator.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0001
 * @implementsRequirement MR-0005ADR-0004REQ-0001GOV-0001
 * @derivedFromDecision MR-0005/ADR-0002
 * @derivedFromDecision MR-0005/ADR-0004
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Validates the canonical methodology-neutral Finding model boundary, discovers
 * authored common analysis Findings and resolves their originating Analysis
 * Record and affected governed subjects through the owning canonical models.
 *
 * Side effects: reads governed repository files and writes diagnostics only to
 * stdout or stderr. It never modifies Findings, Analysis Records, Base Analysis
 * sources or governed Functional Requirements.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");

const canonicalBaseAnalysisRegistryPath =
  "docs/reference/project-model/registers/base-analysis/" +
  "base-analysis-elements.registry.yml";

const canonicalRequirementsDirectory =
  "docs/reference/project-model/registers/requirements";

const commonFindingSuffix = ".analysis-finding.yml";

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
export const commonAnalysisFindingValidatorRuleIds = Object.freeze({
  modelProfile: "common-finding.validation.model-profile",
  sourceRegistry: "common-finding.validation.source-registry",
  referenceGrammar: "common-finding.validation.reference-grammar",
  yamlSource: "common-finding.validation.yaml-source",
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
 * Discovers common analysis Finding YAML files deterministically.
 *
 * @param {string} rootDir - Repository root.
 * @returns {string[]} Repository-relative Finding paths.
 */
export function discoverCommonAnalysisFindingPaths(rootDir) {
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
        entry.name.endsWith(commonFindingSuffix)
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
 * @param {{
 *   model?: Record<string, unknown>,
 *   profile?: Record<string, unknown>,
 *   modelRuleIds?: Record<string, string>,
 *   validatorRuleIds?: Record<string, string>
 * }} [input] - Optional model boundary overrides for deterministic tests.
 * @returns {Array<Record<string, string>>} Model diagnostics.
 */
export function validateCommonAnalysisFindingModelBoundary(input = {}) {
  const model = input.model ?? commonAnalysisFindingModel;
  const profile = input.profile ?? commonAnalysisFindingProfile;
  const modelRuleIds = input.modelRuleIds ?? commonAnalysisFindingRuleIds;
  const validatorRuleIds =
    input.validatorRuleIds ?? commonAnalysisFindingValidatorRuleIds;
  const errors = [];
  const ruleId = validatorRuleIds.modelProfile;

  if (model.profile_id !== profile.profile_id) {
    errors.push(
      problem(
        ruleId,
        "Common Finding model and profile identifiers diverge.",
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
        "Common Finding model and profile must remain in the analysis domain.",
        "record_domain",
      ),
    );
  }

  if (
    model.governed_document_model !== false ||
    model.authorable_governed_document_type !== false
  ) {
    errors.push(
      problem(
        ruleId,
        "Common Findings must remain outside governed document models and authoring types.",
        "governed_document_model",
      ),
    );
  }

  if (profile.additional_properties !== false) {
    errors.push(
      problem(
        ruleId,
        "Common Finding profile must reject undeclared top-level members.",
        "additional_properties",
      ),
    );
  }

  const requiredFields = new Set(
    Array.isArray(profile.required_fields) ? profile.required_fields : [],
  );

  for (const requiredField of [
    "schema_version",
    "id",
    "title",
    "analysis_record_id",
    "affected_subjects",
    "threat_scenario",
    "expected_consequences",
    "rationale_or_evidence",
    "review_state",
  ]) {
    if (!requiredFields.has(requiredField)) {
      errors.push(
        problem(
          ruleId,
          `Canonical common Finding profile is missing required field ${requiredField}.`,
          requiredField,
        ),
      );
    }
  }

  if (
    profile.fields?.title?.type !== "string" ||
    profile.fields?.title?.min_length !== 1 ||
    profile.fields?.title?.pattern !== model.title_pattern
  ) {
    errors.push(
      problem(
        ruleId,
        "Canonical Common Finding title constraints are inconsistent.",
        "title",
      ),
    );
  }

  if (
    profile.fields?.analysis_record_id?.type !== "string" ||
    profile.fields?.affected_subjects?.type !== "array" ||
    profile.fields?.affected_subjects?.min_items !== 1
  ) {
    errors.push(
      problem(
        ruleId,
        "Canonical Analysis Record origin and affected subject constraints are inconsistent.",
        "fields",
      ),
    );
  }

  const profileReviewStates = Array.isArray(profile.fields?.review_state?.enum)
    ? profile.fields.review_state.enum
    : [];
  const expectedReviewStates = [...commonAnalysisFindingReviewStates];

  if (
    profileReviewStates.length !== expectedReviewStates.length ||
    profileReviewStates.some(
      (value, index) => value !== expectedReviewStates[index],
    )
  ) {
    errors.push(
      problem(
        ruleId,
        "Common Finding review-state values diverge from the canonical model.",
        "review_state",
      ),
    );
  }

  const profileSubjectKinds = Array.isArray(
    profile.fields?.affected_subjects?.item?.fields?.kind?.enum,
  )
    ? profile.fields.affected_subjects.item.fields.kind.enum
    : [];
  const expectedSubjectKinds = commonAnalysisFindingAffectedSubjectKinds.map(
    ({ value }) => value,
  );

  if (
    profileSubjectKinds.length !== expectedSubjectKinds.length ||
    profileSubjectKinds.some(
      (value, index) => value !== expectedSubjectKinds[index],
    )
  ) {
    errors.push(
      problem(
        ruleId,
        "Common Finding affected subject kinds diverge from the canonical model.",
        "affected_subjects",
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
        "Common Finding diagnostic identifiers must be unique.",
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
  const ruleId = commonAnalysisFindingValidatorRuleIds.sourceRegistry;
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

    return { elementIds, relationIds };
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

    return { elementIds, relationIds };
  }

  for (const element of Array.isArray(registry?.elements)
    ? registry.elements
    : []) {
    const id = String(element?.id ?? "").trim();
    if (id) elementIds.add(id);
  }

  for (const relation of Array.isArray(registry?.relations)
    ? registry.relations
    : []) {
    const id = String(relation?.id ?? "").trim();
    if (id) relationIds.add(id);
  }

  return { elementIds, relationIds };
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
  const ruleId = commonAnalysisFindingValidatorRuleIds.sourceRegistry;
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
        /^MR-\d{4}\.requirements\.registry\.yml$/u.test(entry.name),
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
        String(requirement?.requirement_type ?? "").trim() !== "functional"
      ) {
        continue;
      }

      const id = String(requirement?.id ?? "").trim();
      if (!id) continue;

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
 * Loads canonical methodology-specific Analysis Record identities.
 *
 * @param {string} rootDir - Repository root.
 * @param {Array<Record<string, string>>} errors - Diagnostic sink.
 * @returns {Set<string>} Unique canonical Analysis Record identities.
 */
function loadAnalysisRecordIds(rootDir, errors) {
  const analysisRecordIds = new Set();
  const ruleId = commonAnalysisFindingValidatorRuleIds.sourceRegistry;
  const recordPaths = discoverMethodologySpecificAnalysisRecordPaths(rootDir);
  const repositoryResult =
    validateMethodologySpecificAnalysisRecordRepository({
      rootDir,
      recordPaths,
    });

  for (const diagnostic of repositoryResult.errors) {
    errors.push(
      problem(
        ruleId,
        `Originating Analysis Record source is invalid (${diagnostic.rule_id}): ${diagnostic.message}`,
        diagnostic.context,
      ),
    );
  }

  const validRecords = [];

  for (const recordPath of recordPaths) {
    let absolute;

    try {
      absolute = resolveProjectPath(rootDir, recordPath);
    } catch (error) {
      errors.push(problem(ruleId, error.message, recordPath));
      continue;
    }

    if (!fs.existsSync(absolute)) {
      errors.push(
        problem(
          ruleId,
          `Originating Analysis Record source is missing: ${recordPath}.`,
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
          ruleId,
          `Unable to parse originating Analysis Record YAML: ${error.message}`,
          recordPath,
        ),
      );
      continue;
    }

    const result = validateMethodologySpecificAnalysisRecord(candidate);

    if (result.valid && isRecord(result.value)) {
      validRecords.push(result.value);
    }
  }

  const index = indexMethodologySpecificAnalysisRecords(validRecords);

  for (const duplicateId of index.duplicateIds) {
    errors.push(
      problem(
        ruleId,
        `Originating Analysis Record identity resolves more than once: ${duplicateId}.`,
        duplicateId,
      ),
    );
  }

  for (const [id] of index.byId) {
    if (!index.duplicateIds.includes(id)) {
      analysisRecordIds.add(id);
    }
  }

  return analysisRecordIds;
}

/**
 * Loads the canonical BAE reference grammar.
 *
 * @param {string} rootDir - Repository root.
 * @param {Array<Record<string, string>>} errors - Diagnostic sink.
 * @returns {RegExp|null} Canonical BAE identifier pattern.
 */
function loadBaseAnalysisElementGrammar(rootDir, errors) {
  const ruleId = commonAnalysisFindingValidatorRuleIds.referenceGrammar;
  let registry;

  try {
    registry = loadGovernedEntityResolverRegistry({ rootDir });
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
 * Loads the read-only Finding reference resolution context.
 *
 * @param {string} rootDir - Repository root.
 * @returns {{
 *   errors: Array<Record<string, string>>,
 *   resolveAnalysisRecord: (analysisRecordId: string) => boolean,
 *   resolveAffectedSubject: (kind: string, id: string) => boolean
 * }} Resolution context.
 */
function loadFindingResolutionContext(rootDir) {
  const errors = [];
  const analysisRecordIds = loadAnalysisRecordIds(rootDir, errors);
  const { elementIds, relationIds } =
    loadBaseAnalysisIdentities(rootDir, errors);
  const functionalRequirementIds =
    loadFunctionalRequirementIds(rootDir, errors);
  const baePattern = loadBaseAnalysisElementGrammar(rootDir, errors);

  const supportedKinds = new Set(
    commonAnalysisFindingAffectedSubjectKinds.map(({ value }) => value),
  );

  return {
    errors,

    resolveAnalysisRecord(analysisRecordId) {
      return analysisRecordIds.has(analysisRecordId);
    },

    resolveAffectedSubject(kind, id) {
      if (!supportedKinds.has(kind)) return false;

      if (kind === "base_analysis_element") {
        if (baePattern) {
          baePattern.lastIndex = 0;
          if (!baePattern.test(id)) return false;
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
 * Validates all common analysis Findings in one repository.
 *
 * @param {{
 *   rootDir?: string,
 *   findingPaths?: string[]
 * }} [input] - Repository validation context.
 * @returns {{
 *   valid: boolean,
 *   finding_count: number,
 *   finding_paths: string[],
 *   errors: Array<Record<string, string>>
 * }} Deterministic validation result.
 */
export function validateCommonAnalysisFindingRepository(input = {}) {
  const rootDir = path.resolve(input.rootDir ?? defaultRootDir);
  const errors = validateCommonAnalysisFindingModelBoundary();
  const resolution = loadFindingResolutionContext(rootDir);

  errors.push(...resolution.errors);

  const findingPaths = Array.isArray(input.findingPaths)
    ? [...input.findingPaths]
      .map((value) => String(value).replaceAll("\\", "/"))
      .sort(compare)
    : discoverCommonAnalysisFindingPaths(rootDir);

  const validFindings = [];

  for (const findingPath of findingPaths) {
    let absolute;

    try {
      absolute = resolveProjectPath(rootDir, findingPath);
    } catch (error) {
      errors.push(
        problem(
          commonAnalysisFindingValidatorRuleIds.yamlSource,
          error.message,
          findingPath,
        ),
      );
      continue;
    }

    if (!fs.existsSync(absolute)) {
      errors.push(
        problem(
          commonAnalysisFindingValidatorRuleIds.yamlSource,
          `Common analysis Finding source is missing: ${findingPath}.`,
          findingPath,
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
          commonAnalysisFindingValidatorRuleIds.yamlSource,
          `Unable to parse common analysis Finding YAML: ${error.message}`,
          findingPath,
        ),
      );
      continue;
    }

    const result = validateCommonAnalysisFinding(candidate, {
      resolveAnalysisRecord: resolution.resolveAnalysisRecord,
      resolveAffectedSubject: resolution.resolveAffectedSubject,
    });

    for (const diagnostic of result.errors) {
      errors.push({
        ...diagnostic,
        context: diagnostic.context
          ? `${findingPath}:${diagnostic.context}`
          : findingPath,
      });
    }

    if (result.valid && isRecord(result.value)) {
      validFindings.push({
        path: findingPath,
        value: result.value,
      });
    }
  }

  const index = indexCommonAnalysisFindings(
    validFindings.map(({ value }) => value),
  );

  for (const duplicateId of index.duplicateIds) {
    const matchingPaths = validFindings
      .filter(({ value }) => value.id === duplicateId)
      .map(({ path: matchingPath }) => matchingPath)
      .sort(compare);

    errors.push(
      problem(
        commonAnalysisFindingRuleIds.duplicateIdentifier,
        `Common analysis Finding identifier resolves more than once: ${duplicateId}.`,
        matchingPaths.join(", "),
      ),
    );
  }

  return {
    valid: errors.length === 0,
    finding_count: findingPaths.length,
    finding_paths: findingPaths,
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
    process.env.TF_COMMON_FINDING_ROOT ?? defaultRootDir,
  );

  const result = validateCommonAnalysisFindingRepository({ rootDir });

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
      `Common analysis Finding validation failed ` +
      `with ${result.errors.length} error(s).`,
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    `Common analysis Finding validation passed ` +
    `(${result.finding_count} Finding(s)).`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === scriptPath
) {
  run();
}
