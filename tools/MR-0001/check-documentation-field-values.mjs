#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * @file Governed documentation field value taxonomy checker.
 *
 * @implementsRequirement MR-0001ADR-0004REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0004REQ-0001GOV-0002
 * @derivedFromDecision MR-0001/ADR-0004
 * @macroRequirement MR-0001
 *
 * This checker validates scoped field value sets for governed documentation
 * registries. It deliberately avoids a single global `status` taxonomy: each
 * recurring field value set must declare its field, registry context, record
 * context, allowed values and meanings.
 *
 * Side effects: reads ThreatForge Project Model registries and governed
 * documentation files; writes JSON and Markdown reports under
 * artifacts/documentation-field-values; executes governed negative fixtures unless disabled; exits non-zero on
 * taxonomy, controlled-label, contextual-status, forbidden-phrase or negative-fixture errors.
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
const skipNegativeFixtures = process.env.TF_DOCUMENTATION_FIELD_VALUES_SKIP_NEGATIVE_FIXTURES === "1";
const disableReports = process.env.TF_DOCUMENTATION_FIELD_VALUES_DISABLE_REPORTS === "1";

const requiredValueSetNames = new Set([
  "field_value_set_status",
  "vocabulary_registry_status",
  "vocabulary_term_status",
  "vocabulary_label_role",
  "check_status",
  "implementation_artifact_status",
  "decision_status",
  "requirement_lifecycle_status",
  "execution_result_status",
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
  return normalized ? path.join(rootDir, normalized) : "";
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
 * Removes surrounding single or double quotes from a simple YAML scalar.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string} Unquoted scalar text when quotes are present.
 */
function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Parses a simple scalar value used by governed YAML registries.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string|number|boolean|null|Array<object>|object} Parsed scalar value.
 */
function parseScalar(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+$/u.test(trimmed)) return Number.parseInt(trimmed, 10);
  return stripQuotes(trimmed);
}

/**
 * Counts leading space indentation for a YAML line.
 *
 * @param {string} line - YAML line.
 * @returns {number} Number of leading spaces.
 */
function countIndent(line) {
  return line.match(/^ */u)?.[0].length ?? 0;
}

/**
 * Parses the restricted YAML subset used by current governed registries.
 *
 * @param {string} text - YAML text.
 * @returns {Record<string, unknown>} Parsed YAML object.
 */
function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = String(text ?? "").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n").split("\n");

  function getParent(indent) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    return stack[stack.length - 1].value;
  }

  function nextMeaningfulLine(startIndex) {
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      if (lines[index].trim() && !lines[index].trimStart().startsWith("#")) return lines[index];
    }
    return "";
  }

  function readBlock(startIndex, baseIndent) {
    const block = [];
    let index = startIndex;
    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      const nextIndent = countIndent(next);
      if (next.trim() && nextIndent <= baseIndent) break;
      index += 1;
      const sliceAt = Math.min(baseIndent + 2, next.length);
      block.push(next.slice(sliceAt));
    }
    return { text: block.join("\n").replace(/\n$/u, ""), nextIndex: index };
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;

    const indent = countIndent(raw);
    const trimmed = raw.trim();

    if (trimmed.startsWith("- ")) {
      const parent = getParent(indent);
      if (!Array.isArray(parent)) continue;

      const itemText = trimmed.slice(2).trim();
      const colonIndex = itemText.indexOf(":");

      if (colonIndex === -1) {
        parent.push(parseScalar(itemText));
        continue;
      }

      const key = itemText.slice(0, colonIndex).trim();
      const rawValue = itemText.slice(colonIndex + 1).trim();
      const obj = {};
      parent.push(obj);

      if (rawValue === "|") {
        const block = readBlock(index, indent);
        obj[key] = block.text;
        index = block.nextIndex;
      } else if (rawValue === "") {
        const nextLine = nextMeaningfulLine(index);
        const value = nextLine.trim().startsWith("- ") ? [] : {};
        obj[key] = value;
        stack.push({ indent, value: obj });
        stack.push({ indent: indent + 2, value });
      } else {
        obj[key] = parseScalar(rawValue);
        stack.push({ indent, value: obj });
      }
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();
    const parent = getParent(indent);

    if (rawValue === "|") {
      const block = readBlock(index, indent);
      parent[key] = block.text;
      index = block.nextIndex;
    } else if (rawValue === "") {
      const nextLine = nextMeaningfulLine(index);
      const value = nextLine.trim().startsWith("- ") ? [] : {};
      parent[key] = value;
      stack.push({ indent, value });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

/**
 * Reads and parses a governed YAML file.
 *
 * @param {string} projectPath - Repository-relative YAML file path.
 * @returns {Record<string, unknown>|null} Parsed YAML object, or null when missing.
 */
function readProjectYaml(projectPath) {
  const filePath = resolveProjectPath(projectPath);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing governed YAML file: ${projectPath}`);
    return null;
  }
  return parseYaml(readText(filePath));
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
 * Reads the scoped value-set registry and returns lookup maps.
 *
 * @returns {{byName: Map<string, Set<string>>, byApplicability: Map<string, Set<string>>, valueSetCount: number}} Value sets by semantic name and by registry/field context.
 */
function validateTaxonomyRegistry() {
  const registry = readProjectYaml(taxonomyRegistryProjectPath);
  const byName = new Map();
  const byApplicability = new Map();

  if (!registry) return { byName, byApplicability, valueSetCount: 0 };
  if (!Array.isArray(registry.field_value_sets)) {
    errors.push("Documentation field values registry must define a field_value_sets array.");
    return { byName, byApplicability, valueSetCount: 0 };
  }
  if (Array.isArray(registry.taxonomies)) {
    errors.push("Documentation field values registry still contains deprecated generic taxonomies array.");
  }

  const valueSetIds = new Set();
  const valueSetNames = new Set();
  const applicabilityKeys = new Set();

  for (const valueSet of registry.field_value_sets) {
    const id = requireString(valueSet, "id", "Field value set");
    const name = requireString(valueSet, "name", id || "Field value set");
    const fieldName = requireString(valueSet, "field_name", id || name || "Field value set");
    const appliesToRegistry = normalizeProjectPath(requireString(valueSet, "applies_to_registry", id || name || "Field value set"));
    const appliesToRecord = requireString(valueSet, "applies_to_record", id || name || "Field value set");
    const status = requireString(valueSet, "status", id || name || "Field value set");
    const description = requireString(valueSet, "description", id || name || "Field value set");

    if (id) {
      if (valueSetIds.has(id)) errors.push(`Duplicate field value set id: ${id}`);
      valueSetIds.add(id);
    }
    if (name) {
      if (valueSetNames.has(name)) errors.push(`Duplicate field value set name: ${name}`);
      valueSetNames.add(name);
    }
    const applicabilityKey = `${appliesToRegistry}::${appliesToRecord}::${fieldName}`;
    if (appliesToRegistry && appliesToRecord && fieldName) {
      if (applicabilityKeys.has(applicabilityKey)) errors.push(`Duplicate field value set applicability: ${applicabilityKey}`);
      applicabilityKeys.add(applicabilityKey);
    }
    if (!description) errors.push(`${id || name} must describe the controlled value set.`);
    if (!status) errors.push(`${id || name} must declare status.`);

    if (!Array.isArray(valueSet.values) || valueSet.values.length === 0) {
      errors.push(`${id || name} must define non-empty values.`);
      continue;
    }

    const values = new Set();
    for (const valueRecord of valueSet.values) {
      const value = requireString(valueRecord, "value", `${id || name} value`);
      const meaning = requireString(valueRecord, "meaning", `${id || name}:${value || "<empty>"}`);
      if (value) {
        if (values.has(value)) errors.push(`${id || name} has duplicate value: ${value}`);
        values.add(value);
      }
      if (!meaning) errors.push(`${id || name}:${value || "<empty>"} must define meaning.`);
    }

    if (name) byName.set(name, values);
    if (applicabilityKey) byApplicability.set(applicabilityKey, values);
  }

  for (const requiredValueSetName of requiredValueSetNames) {
    if (!byName.has(requiredValueSetName)) {
      errors.push(`Missing required controlled field value set: ${requiredValueSetName}`);
    }
  }

  const valueSetStatuses = byName.get("field_value_set_status") ?? new Set();
  if (valueSetStatuses.size > 0) {
    const registryStatus = String(registry.status ?? "").trim();
    if (registryStatus && !valueSetStatuses.has(registryStatus)) {
      errors.push(`Documentation field values registry uses unregistered field value set status: ${registryStatus}`);
    }
    for (const valueSet of registry.field_value_sets) {
      const name = String(valueSet?.name ?? valueSet?.id ?? "<unknown>");
      const status = String(valueSet?.status ?? "").trim();
      if (status && !valueSetStatuses.has(status)) {
        errors.push(`${name} uses field value set status not registered in field_value_set_status: ${status}`);
      }
    }
  }

  return { byName, byApplicability, valueSetCount: registry.field_value_sets.length };
}

/**
 * Returns an allowed value set by semantic name, recording an error if absent.
 *
 * @param {Map<string, Set<string>>} byName - Value sets by semantic name.
 * @param {string} valueSetName - Required semantic value set name.
 * @returns {Set<string>} Allowed values.
 */
function getValueSet(byName, valueSetName) {
  const valueSet = byName.get(valueSetName);
  if (!valueSet) errors.push(`Missing value set required by checker: ${valueSetName}`);
  return valueSet ?? new Set();
}

/**
 * Validates one status-like field against its contextual value set.
 *
 * @param {string} context - Human-readable context.
 * @param {Record<string, unknown>} record - Record containing the field.
 * @param {string} fieldName - Field name to inspect.
 * @param {Set<string>} allowedValues - Allowed values for this context.
 */
function validateControlledField(context, record, fieldName, allowedValues) {
  const value = requireString(record, fieldName, context);
  if (value && allowedValues.size > 0 && !allowedValues.has(value)) {
    errors.push(`${context} uses ${fieldName} value not registered for this context: ${value}`);
  }
}

/**
 * Validates controlled vocabulary labels against registered value sets.
 *
 * @param {Map<string, Set<string>>} byName - Value sets by semantic name.
 * @returns {string[]} Forbidden phrases declared by the vocabulary.
 */
function validateVocabularyRegistry(byName) {
  const registryPath = resolveProjectPath(vocabularyRegistryProjectPath);
  const rawText = fs.existsSync(registryPath) ? readText(registryPath) : "";
  const vocabulary = readProjectYaml(vocabularyRegistryProjectPath);
  const forbiddenPhrases = [];

  if (!vocabulary) return forbiddenPhrases;
  if (/\ballowed_labels\b/u.test(rawText)) {
    errors.push("documentation-terms registry still contains deprecated allowed_labels field.");
  }

  const allowedLabelRoles = getValueSet(byName, "vocabulary_label_role");
  const vocabularyRegistryStatuses = getValueSet(byName, "vocabulary_registry_status");
  const vocabularyTermStatuses = getValueSet(byName, "vocabulary_term_status");
  const canonicalLanguage = String(vocabulary.canonical_language ?? "").trim();

  if (!canonicalLanguage) errors.push("documentation-terms registry must declare canonical_language.");
  validateControlledField("documentation-terms registry root", vocabulary, "status", vocabularyRegistryStatuses);

  if (!Array.isArray(vocabulary.label_roles) || vocabulary.label_roles.length === 0) {
    errors.push("documentation-terms registry must declare label_roles.");
  } else {
    const declaredRoles = new Set();
    for (const roleRecord of vocabulary.label_roles) {
      const value = requireString(roleRecord, "value", "vocabulary label_roles record");
      const meaning = requireString(roleRecord, "meaning", `vocabulary label role ${value || "<empty>"}`);
      if (value) {
        declaredRoles.add(value);
        if (!allowedLabelRoles.has(value)) errors.push(`vocabulary label_roles contains unregistered role: ${value}`);
      }
      if (!meaning) errors.push(`vocabulary label role ${value || "<empty>"} must define meaning.`);
    }
    for (const role of allowedLabelRoles) {
      if (!declaredRoles.has(role)) warnings.push(`Taxonomy label role is not repeated in vocabulary label_roles: ${role}`);
    }
  }

  if (Array.isArray(vocabulary.forbidden_documentation_phrases)) {
    const phraseKeys = new Set();
    for (const phrase of vocabulary.forbidden_documentation_phrases) {
      const value = requireString(phrase, "value", "forbidden_documentation_phrases record");
      const language = requireString(phrase, "language", `forbidden phrase ${value || "<empty>"}`);
      const reason = requireString(phrase, "reason", `forbidden phrase ${value || "<empty>"}`);
      if (value) forbiddenPhrases.push(value);
      const key = `${language}:${value}`.toLowerCase();
      if (phraseKeys.has(key)) errors.push(`Duplicate forbidden documentation phrase: ${language}:${value}`);
      phraseKeys.add(key);
      if (!reason) errors.push(`Forbidden phrase ${value || "<empty>"} must define reason.`);
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
    const canonicalName = requireString(term, "canonical_name", id || "Vocabulary term");
    const termCanonicalLanguage = requireString(term, "canonical_language", id || "Vocabulary term");
    const definition = requireString(term, "definition", id || "Vocabulary term");

    if (id) {
      if (termIds.has(id)) errors.push(`Duplicate vocabulary term id: ${id}`);
      termIds.add(id);
    }
    if (canonicalName) {
      if (canonicalNames.has(canonicalName)) errors.push(`Duplicate vocabulary canonical_name: ${canonicalName}`);
      canonicalNames.add(canonicalName);
    }
    validateControlledField(`${id || canonicalName} vocabulary term`, term, "status", vocabularyTermStatuses);
    if (canonicalLanguage && termCanonicalLanguage && termCanonicalLanguage !== canonicalLanguage) {
      warnings.push(`${id || canonicalName} uses canonical_language ${termCanonicalLanguage}, expected ${canonicalLanguage}.`);
    }
    if (!definition) errors.push(`${id || canonicalName} must define definition.`);

    if (!Array.isArray(term.labels) || term.labels.length === 0) {
      errors.push(`${id || canonicalName} must define non-empty labels.`);
      continue;
    }

    let preferredLabels = 0;
    for (const label of term.labels) {
      const value = requireString(label, "value", `${id || canonicalName} label`);
      const language = requireString(label, "language", `${id || canonicalName}:${value || "<empty>"}`);
      const role = requireString(label, "role", `${id || canonicalName}:${value || "<empty>"}`);
      const reason = requireString(label, "reason", `${id || canonicalName}:${value || "<empty>"}`);

      if (role && !allowedLabelRoles.has(role)) {
        errors.push(`${id || canonicalName}:${value || "<empty>"} uses unregistered label role: ${role}`);
      }
      if (role === "preferred") {
        preferredLabels += 1;
        if (language && termCanonicalLanguage && language !== termCanonicalLanguage) {
          errors.push(`${id || canonicalName} preferred label language ${language} must match canonical_language ${termCanonicalLanguage}.`);
        }
      }
      if (!reason) errors.push(`${id || canonicalName}:${value || "<empty>"} label must define reason.`);

      const labelKey = `${language}:${String(value).toLowerCase()}`;
      if (value && language) {
        if (labelKeys.has(labelKey)) warnings.push(`Label value appears more than once across vocabulary terms: ${language}:${value}`);
        labelKeys.add(labelKey);
      }
    }

    if (preferredLabels !== 1) {
      errors.push(`${id || canonicalName} must define exactly one preferred label; found ${preferredLabels}.`);
    }
  }

  return forbiddenPhrases;
}

/**
 * Validates check statuses against the check_status value set.
 *
 * @param {Map<string, Set<string>>} byName - Value sets by semantic name.
 */
function validateChecksRegistry(byName) {
  const registry = readProjectYaml(checksRegistryProjectPath);
  if (!registry) return;
  const checkStatuses = getValueSet(byName, "check_status");
  if (!Array.isArray(registry.checks)) {
    errors.push("Local governance checks registry must define a checks array.");
    return;
  }
  for (const check of registry.checks) {
    const id = String(check?.id ?? "<unknown check>");
    validateControlledField(`${id} check`, check, "status", checkStatuses);
  }
}

/**
 * Validates implementation artifact statuses against the implementation_artifact_status value set.
 *
 * @param {Map<string, Set<string>>} byName - Value sets by semantic name.
 */
function validateImplementationTraceRegistry(byName) {
  const registry = readProjectYaml(implementationTraceRegistryProjectPath);
  if (!registry) return;
  const artifactStatuses = getValueSet(byName, "implementation_artifact_status");
  if (!Array.isArray(registry.artifacts)) {
    errors.push("Implementation trace registry must define an artifacts array.");
    return;
  }
  for (const artifact of registry.artifacts) {
    const id = String(artifact?.id ?? "<unknown artifact>");
    validateControlledField(`${id} implementation artifact`, artifact, "status", artifactStatuses);
  }
}

/**
 * Validates decision statuses against the decision_status value set.
 *
 * @param {Map<string, Set<string>>} byName - Value sets by semantic name.
 */
function validateDecisionRegistry(byName) {
  const registry = readProjectYaml(decisionsRegistryProjectPath);
  if (!registry) return;
  const decisionStatuses = getValueSet(byName, "decision_status");
  if (!Array.isArray(registry.decisions)) {
    errors.push("Decision registry must define a decisions array.");
    return;
  }
  for (const decision of registry.decisions) {
    const id = String(decision?.id ?? "<unknown decision>");
    validateControlledField(`${id} decision`, decision, "status", decisionStatuses);
  }
}

/**
 * Validates requirement statuses against the requirement_lifecycle_status value set.
 *
 * @param {Map<string, Set<string>>} byName - Value sets by semantic name.
 */
function validateRequirementRegistry(byName) {
  const registry = readProjectYaml(requirementsRegistryProjectPath);
  if (!registry) return;
  const requirementStatuses = getValueSet(byName, "requirement_lifecycle_status");
  if (!Array.isArray(registry.requirements)) {
    errors.push("Requirement registry must define a requirements array.");
    return;
  }
  for (const requirement of registry.requirements) {
    const id = String(requirement?.id ?? "<unknown requirement>");
    validateControlledField(`${id} requirement`, requirement, "status", requirementStatuses);
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
  const vocabularyProjectPath = normalizeProjectPath(vocabularyRegistryProjectPath);
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
          errors.push(`${projectPath}:${index + 1} contains forbidden documentation phrase: ${phrase}`);
        }
      }
    }
  }
}


/**
 * Executes governed negative fixtures for the documentation field values checker.
 *
 * Each fixture contains a minimal isolated ThreatForge tree that must fail
 * this same checker with a specific expected error substring. The checker is
 * re-invoked in a child process with fixture execution and report writes disabled
 * to avoid recursive fixture runs and generated files inside fixture trees.
 *
 * @returns {number} Number of negative fixtures checked.
 */
function validateNegativeFixtures() {
  const registryPath = resolveProjectPath(negativeFixturesRegistryProjectPath);
  if (!fs.existsSync(registryPath)) {
    errors.push(`Missing documentation field values negative fixture registry: ${negativeFixturesRegistryProjectPath}`);
    return 0;
  }

  const registry = parseYaml(readText(registryPath));
  if (!Array.isArray(registry.fixtures)) {
    errors.push("Documentation field values negative fixture registry must define a fixtures array.");
    return 0;
  }

  let checked = 0;
  for (const fixture of registry.fixtures) {
    const id = requireString(fixture, "id", "documentation field values negative fixture");
    const fixtureRootProjectPath = normalizeProjectPath(
      requireString(fixture, "fixture_root", `${id || "<unknown>"} negative fixture`),
    );
    const expectedErrorSubstrings = Array.isArray(fixture.expected_error_substrings)
      ? fixture.expected_error_substrings.map((value) => String(value))
      : [];

    if (expectedErrorSubstrings.length === 0) {
      errors.push(`${id || "<unknown>"} negative fixture must declare expected_error_substrings.`);
      continue;
    }

    const fixtureRoot = path.resolve(rootDir, fixtureRootProjectPath);
    if (!fs.existsSync(fixtureRoot)) {
      errors.push(`${id || "<unknown>"} negative fixture root does not exist: ${fixtureRootProjectPath}`);
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
        errors.push(`${id || "<unknown>"} negative fixture did not emit expected error substring: ${expected}`);
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
    implemented_requirements: [
      "MR-0001ADR-0004REQ-0001GOV-0001",
      "MR-0001ADR-0004REQ-0001GOV-0002",
    ],
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
    ...report.implemented_requirements.map((requirementId) => `- ${requirementId}`),
    `Taxonomy registry: ${taxonomyRegistryProjectPath}`,
    `Value sets checked: ${valueSetCount}`,
    `Negative fixtures checked: ${negativeFixtureCount}`,
    `Warnings: ${warnings.length}`,
    `Errors: ${errors.length}`,
    "",
    "## Warnings",
    "",
    ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ["None."]),
    "",
    "## Errors",
    "",
    ...(errors.length ? errors.map((error) => `- ${error}`) : ["None."]),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(reportDir, "documentation-field-values.report.md"), markdown, "utf8");
}

const { byName, valueSetCount } = validateTaxonomyRegistry();
const forbiddenPhrases = validateVocabularyRegistry(byName);
validateChecksRegistry(byName);
validateImplementationTraceRegistry(byName);
validateDecisionRegistry(byName);
validateRequirementRegistry(byName);
validateForbiddenPhraseUsage(forbiddenPhrases);
const negativeFixtureCount = skipNegativeFixtures ? 0 : validateNegativeFixtures();
writeReports(valueSetCount, negativeFixtureCount);

if (errors.length > 0) {
  console.error("Documentation field value taxonomy check failed.");
  console.error("Implemented requirement: MR-0001ADR-0004REQ-0001GOV-0001");
  console.error("Implemented requirement: MR-0001ADR-0004REQ-0001GOV-0002");
  console.error(`Value sets checked: ${valueSetCount}`);
  if (!skipNegativeFixtures) console.error(`Negative fixtures checked: ${negativeFixtureCount}`);
  console.error(`Warnings: ${warnings.length}`);
  console.error(`Errors: ${errors.length}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log("Documentation field value taxonomy check passed.");
console.log("Implemented requirement: MR-0001ADR-0004REQ-0001GOV-0001");
console.log("Implemented requirement: MR-0001ADR-0004REQ-0001GOV-0002");
console.log(`Value sets checked: ${valueSetCount}`);
if (!skipNegativeFixtures) console.log(`Negative fixtures checked: ${negativeFixtureCount}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);
