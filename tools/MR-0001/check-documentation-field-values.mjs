#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  loadDocumentationFieldValueCatalog,
  resolveDocumentationFieldValue,
  resolveDocumentationFieldValueSet,
} from "./lib/documentation-field-values.mjs";
import { readGovernedYamlFile } from "./lib/governed-yaml.mjs";

/**
 * @file Governed documentation field value taxonomy checker.
 *
 * @implementsRequirement MR-0001ADR-0004REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0004REQ-0001GOV-0002
 * @implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0004
 * @macroRequirement MR-0001
 *
 * This checker validates governed documentation structures and obtains all
 * controlled field values, meanings and applicability from the canonical
 * documentation field value catalog. It does not maintain a local YAML parser,
 * value inventory, alias map or applicability map.
 *
 * Side effects: reads ThreatForge Project Model registries and governed
 * documentation files; writes JSON and Markdown reports under
 * artifacts/documentation-field-values; executes governed negative fixtures
 * unless disabled; exits non-zero on taxonomy, controlled-label,
 * contextual-status, forbidden-phrase or negative-fixture errors.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_DOCUMENTATION_FIELD_VALUES_ROOT
  ? path.resolve(process.env.TF_DOCUMENTATION_FIELD_VALUES_ROOT)
  : defaultRootDir;

const taxonomyRegistryProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_TAXONOMY_REGISTRY_PATH ??
  "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml";
const vocabularyRegistryProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_VOCABULARY_REGISTRY_PATH ??
  "docs/reference/project-model/registers/vocabularies/documentation-terms.registry.yml";
const checksRegistryProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_CHECKS_REGISTRY_PATH ??
  "docs/reference/project-model/registers/checks/local-governance-checks.registry.yml";
const implementationTraceRegistryProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_IMPLEMENTATION_TRACE_REGISTRY_PATH ??
  "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml";
const decisionsRegistryProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_DECISIONS_REGISTRY_PATH ??
  "docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml";
const requirementsRegistryProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_REQUIREMENTS_REGISTRY_PATH ??
  "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml";
const governedDocumentationRootProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_DOCS_ROOT ??
  "docs/reference/project-model";
const reportDirProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_REPORT_DIR ??
  "artifacts/documentation-field-values";
const negativeFixturesRegistryProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_NEGATIVE_FIXTURES_REGISTRY_PATH ??
  "tools/MR-0001/fixtures/documentation-field-values/negative-fixtures.registry.yml";
const skipNegativeFixtures =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_SKIP_NEGATIVE_FIXTURES === "1";
const disableReports =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_DISABLE_REPORTS === "1";

const implementedRequirementIds = Object.freeze([
  "MR-0001ADR-0004REQ-0001GOV-0001",
  "MR-0001ADR-0004REQ-0001GOV-0002",
  "MR-0001ADR-0004REQ-0002GOV-0001",
]);

const errors = [];
const warnings = [];

/**
 * Reads UTF-8 text from a file, removing a possible byte-order mark.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {string} File text without a leading UTF-8 BOM.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
}

/**
 * Converts path separators to stable forward slashes.
 *
 * @param {string|null|undefined} value - Path-like value.
 * @returns {string} Normalized path text.
 */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Resolves a repository-relative path against the repository root.
 *
 * @param {string|null|undefined} projectPath - Repository-relative path.
 * @returns {string} Absolute path, or an empty string when input is blank.
 */
function resolveProjectPath(projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  return normalized ? path.join(rootDir, ...normalized.split("/")) : "";
}

/**
 * Converts an absolute path into a repository-relative path with forward slashes.
 *
 * @param {string} absolutePath - Absolute file path.
 * @returns {string} Repository-relative path.
 */
function toProjectPath(absolutePath) {
  return normalizeProjectPath(path.relative(rootDir, absolutePath));
}

/**
 * Reads one governed YAML registry through the shared restricted parser.
 *
 * @param {string} projectPath - Repository-relative YAML file path.
 * @returns {Record<string, unknown>|null} Parsed registry, or null after recording an error.
 */
function readGovernedProjectRegistry(projectPath) {
  const filePath = resolveProjectPath(projectPath);

  if (!filePath || !fs.existsSync(filePath)) {
    errors.push(`Missing governed YAML file: ${projectPath}`);
    return null;
  }

  try {
    return readGovernedYamlFile(filePath);
  } catch (error) {
    errors.push(`${projectPath}: ${error.message}`);
    return null;
  }
}

/**
 * Validates a required string field.
 *
 * @param {Record<string, unknown>} record - Record to inspect.
 * @param {string} fieldName - Required field name.
 * @param {string} context - Human-readable context.
 * @returns {string} Trimmed string value.
 */
function requireString(record, fieldName, context) {
  const value = String(record?.[fieldName] ?? "").trim();
  if (!value) errors.push(`${context} is missing ${fieldName}.`);
  return value;
}

/**
 * Resolves a canonical controlled value and records resolver failures.
 *
 * @param {Record<string, unknown>|null} catalog - Canonical derived catalog.
 * @param {string} context - Human-readable consuming record context.
 * @param {{registryPath: string, recordType: string, fieldName: string, value: string}} query - Canonical resolver query.
 * @returns {Record<string, unknown>|null} Canonical value record, or null.
 */
function validateControlledValue(catalog, context, query) {
  if (!catalog || !query.value) return null;

  try {
    return resolveDocumentationFieldValue(catalog, query);
  } catch (error) {
    errors.push(`${context}: ${error.message}`);
    return null;
  }
}

/**
 * Validates one required controlled field through its canonical context.
 *
 * @param {Record<string, unknown>|null} catalog - Canonical derived catalog.
 * @param {string} context - Human-readable consuming record context.
 * @param {string} registryPath - Canonical registry path.
 * @param {string} recordType - Canonical record type.
 * @param {Record<string, unknown>} record - Record containing the field.
 * @param {string} fieldName - Controlled field name.
 * @returns {Record<string, unknown>|null} Canonical value record, or null.
 */
function validateControlledField(
  catalog,
  context,
  registryPath,
  recordType,
  record,
  fieldName,
) {
  const value = requireString(record, fieldName, context);
  return validateControlledValue(catalog, context, {
    registryPath,
    recordType,
    fieldName,
    value,
  });
}

/**
 * Resolves one contextual value set for structural checks without copying it.
 *
 * @param {Record<string, unknown>|null} catalog - Canonical derived catalog.
 * @param {string} context - Human-readable consuming context.
 * @param {{registryPath: string, recordType: string, fieldName: string}} query - Canonical resolver query.
 * @returns {Record<string, unknown>|null} Canonical value set, or null.
 */
function resolveControlledValueSet(catalog, context, query) {
  if (!catalog) return null;

  try {
    return resolveDocumentationFieldValueSet(catalog, query);
  } catch (error) {
    errors.push(`${context}: ${error.message}`);
    return null;
  }
}

/**
 * Loads the canonical catalog and validates taxonomy-specific policy.
 *
 * @returns {{catalog: Record<string, unknown>|null, valueSetCount: number}} Canonical catalog state.
 */
function validateTaxonomyRegistry() {
  const taxonomy = readGovernedProjectRegistry(taxonomyRegistryProjectPath);
  const valueSetCount = Array.isArray(taxonomy?.field_value_sets)
    ? taxonomy.field_value_sets.length
    : 0;

  if (!taxonomy) return { catalog: null, valueSetCount };

  if (Array.isArray(taxonomy.taxonomies)) {
    errors.push(
      "Documentation field values registry still contains deprecated generic taxonomies array.",
    );
  }

  let catalog;
  try {
    catalog = loadDocumentationFieldValueCatalog({
      rootDir,
      taxonomyProjectPath: taxonomyRegistryProjectPath,
    });
  } catch (error) {
    errors.push(error.message);
    return { catalog: null, valueSetCount };
  }

  validateControlledField(
    catalog,
    "Documentation field values registry root",
    taxonomyRegistryProjectPath,
    "registry_root_and_field_value_sets",
    taxonomy,
    "status",
  );

  for (const valueSet of taxonomy.field_value_sets) {
    const id = String(valueSet?.id ?? valueSet?.name ?? "<unknown value set>");
    validateControlledField(
      catalog,
      `${id} field value set`,
      taxonomyRegistryProjectPath,
      "registry_root_and_field_value_sets",
      valueSet,
      "status",
    );
  }

  return { catalog, valueSetCount };
}

/**
 * Validates controlled vocabulary labels and structural vocabulary rules.
 *
 * @param {Record<string, unknown>|null} catalog - Canonical derived catalog.
 * @returns {string[]} Forbidden phrases declared by the vocabulary.
 */
function validateVocabularyRegistry(catalog) {
  const registryPath = resolveProjectPath(vocabularyRegistryProjectPath);
  const rawText = fs.existsSync(registryPath) ? readText(registryPath) : "";
  const vocabulary = readGovernedProjectRegistry(vocabularyRegistryProjectPath);
  const forbiddenPhrases = [];

  if (!vocabulary) return forbiddenPhrases;
  if (/\ballowed_labels\b/u.test(rawText)) {
    errors.push(
      "documentation-terms registry still contains deprecated allowed_labels field.",
    );
  }

  const labelRoleValueSet = resolveControlledValueSet(
    catalog,
    "documentation vocabulary label roles",
    {
      registryPath: vocabularyRegistryProjectPath,
      recordType: "terms.labels",
      fieldName: "role",
    },
  );
  const canonicalLabelRoles = Array.isArray(labelRoleValueSet?.values)
    ? labelRoleValueSet.values.map((entry) => String(entry.value))
    : [];
  const canonicalLanguage = String(vocabulary.canonical_language ?? "").trim();

  if (!canonicalLanguage) {
    errors.push("documentation-terms registry must declare canonical_language.");
  }
  validateControlledField(
    catalog,
    "documentation-terms registry root",
    vocabularyRegistryProjectPath,
    "registry_root",
    vocabulary,
    "status",
  );

  if (!Array.isArray(vocabulary.label_roles) || vocabulary.label_roles.length === 0) {
    errors.push("documentation-terms registry must declare label_roles.");
  } else {
    const declaredRoles = new Set();
    for (const roleRecord of vocabulary.label_roles) {
      const value = requireString(
        roleRecord,
        "value",
        "vocabulary label_roles record",
      );
      const meaning = requireString(
        roleRecord,
        "meaning",
        `vocabulary label role ${value || "<empty>"}`,
      );

      if (value) {
        if (declaredRoles.has(value)) {
          errors.push(`Duplicate vocabulary label role declaration: ${value}`);
        }
        declaredRoles.add(value);
        validateControlledValue(
          catalog,
          `vocabulary label role ${value}`,
          {
            registryPath: vocabularyRegistryProjectPath,
            recordType: "terms.labels",
            fieldName: "role",
            value,
          },
        );
      }
      if (!meaning) {
        errors.push(
          `vocabulary label role ${value || "<empty>"} must define meaning.`,
        );
      }
    }

    for (const role of canonicalLabelRoles) {
      if (!declaredRoles.has(role)) {
        warnings.push(
          `Taxonomy label role is not repeated in vocabulary label_roles: ${role}`,
        );
      }
    }
  }

  if (Array.isArray(vocabulary.forbidden_documentation_phrases)) {
    const phraseKeys = new Set();
    for (const phrase of vocabulary.forbidden_documentation_phrases) {
      const value = requireString(
        phrase,
        "value",
        "forbidden_documentation_phrases record",
      );
      const language = requireString(
        phrase,
        "language",
        `forbidden phrase ${value || "<empty>"}`,
      );
      const reason = requireString(
        phrase,
        "reason",
        `forbidden phrase ${value || "<empty>"}`,
      );
      if (value) forbiddenPhrases.push(value);
      const key = `${language}:${value}`.toLowerCase();
      if (phraseKeys.has(key)) {
        errors.push(`Duplicate forbidden documentation phrase: ${language}:${value}`);
      }
      phraseKeys.add(key);
      if (!reason) {
        errors.push(`Forbidden phrase ${value || "<empty>"} must define reason.`);
      }
    }
  }

  if (!Array.isArray(vocabulary.terms) || vocabulary.terms.length === 0) {
    errors.push("documentation-terms registry must define a non-empty terms array.");
    return forbiddenPhrases;
  }

  const termIds = new Set();
  const canonicalNames = new Set();
  const labelKeys = new Set();

  for (const term of vocabulary.terms) {
    const id = requireString(term, "id", "Vocabulary term");
    const canonicalName = requireString(
      term,
      "canonical_name",
      id || "Vocabulary term",
    );
    const termCanonicalLanguage = requireString(
      term,
      "canonical_language",
      id || "Vocabulary term",
    );
    const definition = requireString(
      term,
      "definition",
      id || "Vocabulary term",
    );

    if (id) {
      if (termIds.has(id)) errors.push(`Duplicate vocabulary term id: ${id}`);
      termIds.add(id);
    }
    if (canonicalName) {
      if (canonicalNames.has(canonicalName)) {
        errors.push(`Duplicate vocabulary canonical_name: ${canonicalName}`);
      }
      canonicalNames.add(canonicalName);
    }
    validateControlledField(
      catalog,
      `${id || canonicalName} vocabulary term`,
      vocabularyRegistryProjectPath,
      "terms",
      term,
      "status",
    );
    if (
      canonicalLanguage &&
      termCanonicalLanguage &&
      termCanonicalLanguage !== canonicalLanguage
    ) {
      warnings.push(
        `${id || canonicalName} uses canonical_language ${termCanonicalLanguage}, expected ${canonicalLanguage}.`,
      );
    }
    if (!definition) errors.push(`${id || canonicalName} must define definition.`);

    if (!Array.isArray(term.labels) || term.labels.length === 0) {
      errors.push(`${id || canonicalName} must define non-empty labels.`);
      continue;
    }

    let preferredLabels = 0;
    for (const label of term.labels) {
      const value = requireString(label, "value", `${id || canonicalName} label`);
      const language = requireString(
        label,
        "language",
        `${id || canonicalName}:${value || "<empty>"}`,
      );
      const role = requireString(
        label,
        "role",
        `${id || canonicalName}:${value || "<empty>"}`,
      );
      const reason = requireString(
        label,
        "reason",
        `${id || canonicalName}:${value || "<empty>"}`,
      );

      if (role) {
        validateControlledValue(
          catalog,
          `${id || canonicalName}:${value || "<empty>"} label role`,
          {
            registryPath: vocabularyRegistryProjectPath,
            recordType: "terms.labels",
            fieldName: "role",
            value: role,
          },
        );
      }
      if (role === "preferred") {
        preferredLabels += 1;
        if (
          language &&
          termCanonicalLanguage &&
          language !== termCanonicalLanguage
        ) {
          errors.push(
            `${id || canonicalName} preferred label language ${language} must match canonical_language ${termCanonicalLanguage}.`,
          );
        }
      }
      if (!reason) {
        errors.push(
          `${id || canonicalName}:${value || "<empty>"} label must define reason.`,
        );
      }

      const labelKey = `${language}:${String(value).toLowerCase()}`;
      if (value && language) {
        if (labelKeys.has(labelKey)) {
          warnings.push(
            `Label value appears more than once across vocabulary terms: ${language}:${value}`,
          );
        }
        labelKeys.add(labelKey);
      }
    }

    if (preferredLabels !== 1) {
      errors.push(
        `${id || canonicalName} must define exactly one preferred label; found ${preferredLabels}.`,
      );
    }
  }

  return forbiddenPhrases;
}

/**
 * Validates check statuses through the canonical contextual resolver.
 *
 * @param {Record<string, unknown>|null} catalog - Canonical derived catalog.
 */
function validateChecksRegistry(catalog) {
  const registry = readGovernedProjectRegistry(checksRegistryProjectPath);
  if (!registry) return;
  if (!Array.isArray(registry.checks)) {
    errors.push("Local governance checks registry must define a checks array.");
    return;
  }
  for (const check of registry.checks) {
    const id = String(check?.id ?? "<unknown check>");
    validateControlledField(
      catalog,
      `${id} check`,
      checksRegistryProjectPath,
      "checks",
      check,
      "status",
    );
  }
}

/**
 * Validates implementation artifact statuses through the canonical resolver.
 *
 * @param {Record<string, unknown>|null} catalog - Canonical derived catalog.
 */
function validateImplementationTraceRegistry(catalog) {
  const registry = readGovernedProjectRegistry(
    implementationTraceRegistryProjectPath,
  );
  if (!registry) return;
  if (!Array.isArray(registry.artifacts)) {
    errors.push("Implementation trace registry must define an artifacts array.");
    return;
  }
  for (const artifact of registry.artifacts) {
    const id = String(artifact?.id ?? "<unknown artifact>");
    validateControlledField(
      catalog,
      `${id} implementation artifact`,
      implementationTraceRegistryProjectPath,
      "artifacts",
      artifact,
      "status",
    );
  }
}

/**
 * Validates decision statuses through the canonical contextual resolver.
 *
 * @param {Record<string, unknown>|null} catalog - Canonical derived catalog.
 */
function validateDecisionRegistry(catalog) {
  const registry = readGovernedProjectRegistry(decisionsRegistryProjectPath);
  if (!registry) return;
  if (!Array.isArray(registry.decisions)) {
    errors.push("Decision registry must define a decisions array.");
    return;
  }
  for (const decision of registry.decisions) {
    const id = String(decision?.id ?? "<unknown decision>");
    validateControlledField(
      catalog,
      `${id} decision`,
      decisionsRegistryProjectPath,
      "decisions",
      decision,
      "status",
    );
  }
}

/**
 * Validates requirement statuses through the canonical contextual resolver.
 *
 * @param {Record<string, unknown>|null} catalog - Canonical derived catalog.
 */
function validateRequirementRegistry(catalog) {
  const registry = readGovernedProjectRegistry(requirementsRegistryProjectPath);
  if (!registry) return;
  if (!Array.isArray(registry.requirements)) {
    errors.push("Requirement registry must define a requirements array.");
    return;
  }
  for (const requirement of registry.requirements) {
    const id = String(requirement?.id ?? "<unknown requirement>");
    validateControlledField(
      catalog,
      `${id} requirement`,
      requirementsRegistryProjectPath,
      "requirements",
      requirement,
      "status",
    );
  }
}

/**
 * Recursively walks a directory and returns governed documentation files.
 *
 * @param {string} rootPath - Absolute directory path.
 * @returns {string[]} Markdown and YAML file paths.
 */
function listGovernedDocumentationFiles(rootPath) {
  if (!fs.existsSync(rootPath)) return [];
  const files = [];
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listGovernedDocumentationFiles(absolutePath));
    } else if (/\.(md|ya?ml)$/iu.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

/**
 * Checks forbidden temporary phrases outside their declaring vocabulary registry.
 *
 * @param {string[]} forbiddenPhrases - Phrases that must not appear in governed docs.
 */
function validateForbiddenPhraseUsage(forbiddenPhrases) {
  const docsRoot = resolveProjectPath(governedDocumentationRootProjectPath);
  const vocabularyProjectPath = normalizeProjectPath(
    vocabularyRegistryProjectPath,
  );
  const files = listGovernedDocumentationFiles(docsRoot);

  for (const filePath of files) {
    const projectPath = toProjectPath(filePath);
    if (projectPath === vocabularyProjectPath) continue;

    const text = readText(filePath);
    const lines = text.split(/\r?\n/u);
    for (let index = 0; index < lines.length; index += 1) {
      const lowerLine = lines[index].toLowerCase();
      for (const phrase of forbiddenPhrases) {
        const normalizedPhrase = String(phrase).toLowerCase();
        if (normalizedPhrase && lowerLine.includes(normalizedPhrase)) {
          errors.push(
            `${projectPath}:${index + 1} contains forbidden documentation phrase: ${phrase}`,
          );
        }
      }
    }
  }
}

/**
 * Executes governed negative fixtures for this checker.
 *
 * @returns {number} Number of negative fixtures checked.
 */
function validateNegativeFixtures() {
  const registry = readGovernedProjectRegistry(
    negativeFixturesRegistryProjectPath,
  );
  if (!registry) return 0;
  if (!Array.isArray(registry.fixtures)) {
    errors.push(
      "Documentation field values negative fixture registry must define a fixtures array.",
    );
    return 0;
  }

  let checked = 0;
  for (const fixture of registry.fixtures) {
    const id = requireString(
      fixture,
      "id",
      "documentation field values negative fixture",
    );
    const fixtureRootProjectPath = normalizeProjectPath(
      requireString(
        fixture,
        "fixture_root",
        `${id || "<unknown>"} negative fixture`,
      ),
    );
    const expectedErrorSubstrings = Array.isArray(
      fixture.expected_error_substrings,
    )
      ? fixture.expected_error_substrings.map((value) => String(value))
      : [];

    if (expectedErrorSubstrings.length === 0) {
      errors.push(
        `${id || "<unknown>"} negative fixture must declare expected_error_substrings.`,
      );
      continue;
    }

    const fixtureRoot = path.resolve(rootDir, fixtureRootProjectPath);
    if (!fs.existsSync(fixtureRoot)) {
      errors.push(
        `${id || "<unknown>"} negative fixture root does not exist: ${fixtureRootProjectPath}`,
      );
      continue;
    }

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: rootDir,
      encoding: "utf8",
      env: {
        ...process.env,
        TF_DOCUMENTATION_FIELD_VALUES_ROOT: fixtureRoot,
        TF_DOCUMENTATION_FIELD_VALUES_SKIP_NEGATIVE_FIXTURES: "1",
        TF_DOCUMENTATION_FIELD_VALUES_DISABLE_REPORTS: "1",
        TF_DOCUMENTATION_FIELD_VALUES_TAXONOMY_REGISTRY_PATH:
          "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
        TF_DOCUMENTATION_FIELD_VALUES_VOCABULARY_REGISTRY_PATH:
          "docs/reference/project-model/registers/vocabularies/documentation-terms.registry.yml",
        TF_DOCUMENTATION_FIELD_VALUES_CHECKS_REGISTRY_PATH:
          "docs/reference/project-model/registers/checks/local-governance-checks.registry.yml",
        TF_DOCUMENTATION_FIELD_VALUES_IMPLEMENTATION_TRACE_REGISTRY_PATH:
          "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml",
        TF_DOCUMENTATION_FIELD_VALUES_DECISIONS_REGISTRY_PATH:
          "docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml",
        TF_DOCUMENTATION_FIELD_VALUES_REQUIREMENTS_REGISTRY_PATH:
          "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
        TF_DOCUMENTATION_FIELD_VALUES_DOCS_ROOT:
          "docs/reference/project-model",
      },
    });

    checked += 1;
    const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (result.status === 0) {
      errors.push(`${id || "<unknown>"} negative fixture unexpectedly passed.`);
      continue;
    }

    for (const expected of expectedErrorSubstrings) {
      if (!combinedOutput.includes(expected)) {
        errors.push(
          `${id || "<unknown>"} negative fixture did not emit expected error substring: ${expected}`,
        );
      }
    }
  }

  return checked;
}

/**
 * Writes machine-readable and Markdown reports for this checker.
 *
 * @param {number} valueSetCount - Number of scoped value sets checked.
 * @param {number} negativeFixtureCount - Number of negative fixtures checked.
 */
function writeReports(valueSetCount, negativeFixtureCount) {
  if (disableReports) return;

  const reportDir = resolveProjectPath(reportDirProjectPath);
  fs.mkdirSync(reportDir, { recursive: true });

  const report = {
    implemented_requirements: implementedRequirementIds,
    taxonomy_registry: taxonomyRegistryProjectPath,
    vocabulary_registry: vocabularyRegistryProjectPath,
    checks_registry: checksRegistryProjectPath,
    implementation_trace_registry: implementationTraceRegistryProjectPath,
    decisions_registry: decisionsRegistryProjectPath,
    requirements_registry: requirementsRegistryProjectPath,
    value_sets_checked: valueSetCount,
    negative_fixtures_checked: negativeFixtureCount,
    warnings,
    errors,
  };

  fs.writeFileSync(
    path.join(reportDir, "documentation-field-values.report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  const markdown = [
    "# Documentation field values report",
    "",
    "Implemented requirements:",
    ...report.implemented_requirements.map(
      (requirementId) => `- ${requirementId}`,
    ),
    `Taxonomy registry: ${taxonomyRegistryProjectPath}`,
    `Value sets checked: ${valueSetCount}`,
    `Negative fixtures checked: ${negativeFixtureCount}`,
    `Warnings: ${warnings.length}`,
    `Errors: ${errors.length}`,
    "",
    "## Warnings",
    "",
    ...(warnings.length
      ? warnings.map((warning) => `- ${warning}`)
      : ["None."]),
    "",
    "## Errors",
    "",
    ...(errors.length ? errors.map((error) => `- ${error}`) : ["None."]),
    "",
  ].join("\n");

  fs.writeFileSync(
    path.join(reportDir, "documentation-field-values.report.md"),
    markdown,
    "utf8",
  );
}

const { catalog, valueSetCount } = validateTaxonomyRegistry();
const forbiddenPhrases = validateVocabularyRegistry(catalog);
validateChecksRegistry(catalog);
validateImplementationTraceRegistry(catalog);
validateDecisionRegistry(catalog);
validateRequirementRegistry(catalog);
validateForbiddenPhraseUsage(forbiddenPhrases);
const negativeFixtureCount = skipNegativeFixtures
  ? 0
  : validateNegativeFixtures();
writeReports(valueSetCount, negativeFixtureCount);

if (errors.length > 0) {
  console.error("Documentation field value taxonomy check failed.");
  for (const requirementId of implementedRequirementIds) {
    console.error(`Implemented requirement: ${requirementId}`);
  }
  console.error(`Value sets checked: ${valueSetCount}`);
  if (!skipNegativeFixtures) {
    console.error(`Negative fixtures checked: ${negativeFixtureCount}`);
  }
  console.error(`Warnings: ${warnings.length}`);
  console.error(`Errors: ${errors.length}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log("Documentation field value taxonomy check passed.");
for (const requirementId of implementedRequirementIds) {
  console.log(`Implemented requirement: ${requirementId}`);
}
console.log(`Value sets checked: ${valueSetCount}`);
if (!skipNegativeFixtures) {
  console.log(`Negative fixtures checked: ${negativeFixtureCount}`);
}
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);
