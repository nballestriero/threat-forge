#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Governed documentation field value taxonomy checker.
 *
 * @implementsRequirement MR-0001ADR-0004REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0004
 * @macroRequirement MR-0001
 *
 * This checker validates the governed documentation field value taxonomy and
 * the controlled vocabulary records that consume taxonomy values. It keeps
 * synonyms, translations and temporary operational phrases explicit instead of
 * treating them as free interchangeable labels.
 *
 * Side effects: reads restart-workspace Project Model registries and governed
 * documentation files; writes JSON and Markdown reports under
 * restart-workspace/artifacts/documentation-field-values; exits non-zero on
 * taxonomy, controlled-label or forbidden-phrase errors.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..", "..");
const rootDir = process.env.TF_DOCUMENTATION_FIELD_VALUES_ROOT
  ? path.resolve(process.env.TF_DOCUMENTATION_FIELD_VALUES_ROOT)
  : defaultRootDir;

const taxonomyRegistryProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_TAXONOMY_REGISTRY_PATH ??
  "restart-workspace/docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml";
const vocabularyRegistryProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_VOCABULARY_REGISTRY_PATH ??
  "restart-workspace/docs/reference/project-model/registers/vocabularies/documentation-terms.registry.yml";
const governedDocumentationRootProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_DOCS_ROOT ??
  "restart-workspace/docs/reference/project-model";
const reportDirProjectPath =
  process.env.TF_DOCUMENTATION_FIELD_VALUES_REPORT_DIR ??
  "restart-workspace/artifacts/documentation-field-values";

const requiredTaxonomyFields = new Set(["vocabulary_label_role", "lifecycle_status"]);
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
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
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
 * Builds a map from field name to allowed taxonomy values.
 *
 * @returns {Map<string, Set<string>>} Taxonomy field name to allowed values.
 */
function validateTaxonomyRegistry() {
  const registry = readProjectYaml(taxonomyRegistryProjectPath);
  const taxonomyValuesByField = new Map();

  if (!registry) return taxonomyValuesByField;
  if (!Array.isArray(registry.taxonomies)) {
    errors.push("Documentation field values registry must define a taxonomies array.");
    return taxonomyValuesByField;
  }

  const taxonomyIds = new Set();
  const fieldNames = new Set();

  for (const taxonomy of registry.taxonomies) {
    const id = requireString(taxonomy, "id", "Taxonomy record");
    const fieldName = requireString(taxonomy, "field_name", id || "Taxonomy record");
    const status = requireString(taxonomy, "status", id || "Taxonomy record");
    const description = requireString(taxonomy, "description", id || "Taxonomy record");

    if (id) {
      if (taxonomyIds.has(id)) errors.push(`Duplicate taxonomy id: ${id}`);
      taxonomyIds.add(id);
    }

    if (fieldName) {
      if (fieldNames.has(fieldName)) errors.push(`Duplicate taxonomy field_name: ${fieldName}`);
      fieldNames.add(fieldName);
    }

    if (!description) errors.push(`${id || fieldName} must describe the controlled field.`);
    if (!status) errors.push(`${id || fieldName} must declare status.`);

    if (!Array.isArray(taxonomy.values) || taxonomy.values.length === 0) {
      errors.push(`${id || fieldName} must define non-empty values.`);
      continue;
    }

    const values = new Set();
    for (const valueRecord of taxonomy.values) {
      const value = requireString(valueRecord, "value", `${id || fieldName} value`);
      const meaning = requireString(valueRecord, "meaning", `${id || fieldName}:${value || "<empty>"}`);
      if (value) {
        if (values.has(value)) errors.push(`${id || fieldName} has duplicate value: ${value}`);
        values.add(value);
      }
      if (!meaning) errors.push(`${id || fieldName}:${value || "<empty>"} must define meaning.`);
    }
    if (fieldName) taxonomyValuesByField.set(fieldName, values);
  }

  for (const requiredField of requiredTaxonomyFields) {
    if (!taxonomyValuesByField.has(requiredField)) {
      errors.push(`Missing required controlled field taxonomy: ${requiredField}`);
    }
  }

  const lifecycleStatuses = taxonomyValuesByField.get("lifecycle_status");
  if (lifecycleStatuses) {
    for (const taxonomy of registry.taxonomies) {
      const id = String(taxonomy?.id ?? "<unknown>");
      const status = String(taxonomy?.status ?? "").trim();
      if (status && !lifecycleStatuses.has(status)) {
        errors.push(`${id} uses lifecycle status not registered in lifecycle_status taxonomy: ${status}`);
      }
    }
  }

  return taxonomyValuesByField;
}

/**
 * Validates controlled vocabulary labels against registered label roles.
 *
 * @param {Map<string, Set<string>>} taxonomyValuesByField - Taxonomy values by field.
 * @returns {string[]} Forbidden phrases declared by the vocabulary.
 */
function validateVocabularyRegistry(taxonomyValuesByField) {
  const registryPath = resolveProjectPath(vocabularyRegistryProjectPath);
  const rawText = fs.existsSync(registryPath) ? readText(registryPath) : "";
  const vocabulary = readProjectYaml(vocabularyRegistryProjectPath);
  const forbiddenPhrases = [];

  if (!vocabulary) return forbiddenPhrases;
  if (/\ballowed_labels\b/u.test(rawText)) {
    errors.push("documentation-terms registry still contains deprecated allowed_labels field.");
  }

  const allowedLabelRoles = taxonomyValuesByField.get("vocabulary_label_role") ?? new Set();
  const lifecycleStatuses = taxonomyValuesByField.get("lifecycle_status") ?? new Set();
  const canonicalLanguage = String(vocabulary.canonical_language ?? "").trim();

  if (!canonicalLanguage) errors.push("documentation-terms registry must declare canonical_language.");

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
    const status = requireString(term, "status", id || "Vocabulary term");
    const definition = requireString(term, "definition", id || "Vocabulary term");

    if (id) {
      if (termIds.has(id)) errors.push(`Duplicate vocabulary term id: ${id}`);
      termIds.add(id);
    }
    if (canonicalName) {
      if (canonicalNames.has(canonicalName)) errors.push(`Duplicate vocabulary canonical_name: ${canonicalName}`);
      canonicalNames.add(canonicalName);
    }
    if (status && !lifecycleStatuses.has(status)) {
      errors.push(`${id || canonicalName} uses lifecycle status not registered in lifecycle_status taxonomy: ${status}`);
    }
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
 * Writes machine-readable and Markdown reports for this checker.
 */
function writeReports() {
  const reportDir = resolveProjectPath(reportDirProjectPath);
  fs.mkdirSync(reportDir, { recursive: true });

  const report = {
    implemented_requirement: "MR-0001ADR-0004REQ-0001GOV-0001",
    taxonomy_registry: taxonomyRegistryProjectPath,
    vocabulary_registry: vocabularyRegistryProjectPath,
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
    `Implemented requirement: ${report.implemented_requirement}`,
    `Taxonomy registry: ${taxonomyRegistryProjectPath}`,
    `Vocabulary registry: ${vocabularyRegistryProjectPath}`,
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

const taxonomyValuesByField = validateTaxonomyRegistry();
const forbiddenPhrases = validateVocabularyRegistry(taxonomyValuesByField);
validateForbiddenPhraseUsage(forbiddenPhrases);
writeReports();

if (errors.length > 0) {
  console.error("Documentation field value taxonomy check failed.");
  console.error(`Implemented requirement: MR-0001ADR-0004REQ-0001GOV-0001`);
  console.error(`Warnings: ${warnings.length}`);
  console.error(`Errors: ${errors.length}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log("Documentation field value taxonomy check passed.");
console.log("Implemented requirement: MR-0001ADR-0004REQ-0001GOV-0001");
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);
