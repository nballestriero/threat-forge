import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGovernedYamlFile } from "./governed-yaml.mjs";

/**
 * @file Lettore e resolver condiviso della tassonomia dei campi controllati.
 *
 * @implementsRequirement MR-0001ADR-0004REQ-0002
 * @derivedFromDecision MR-0001/ADR-0004
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Reads the canonical documentation field value taxonomy without introducing
 * a second source of truth. It preserves canonical value metadata and resolves
 * value sets by registry path, record context and field name.
 *
 * Side effects: loadDocumentationFieldValueCatalog reads one governed YAML
 * registry; all build and resolution functions are side-effect free.
 */

const modulePath = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(modulePath);
const defaultRootDir = path.resolve(moduleDir, "..", "..", "..");

export const documentationFieldValuesRegistryProjectPath =
  "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml";

/** @param {unknown} value @returns {unknown} */
function cloneData(value) {
  if (Array.isArray(value)) return value.map((item) => cloneData(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneData(item)]),
    );
  }
  return value;
}

/** @template T @param {T} value @returns {T} */
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

/** @param {unknown} value @param {string} label @returns {Record<string, unknown>} */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

/** @param {unknown} value @param {string} label @returns {unknown[]} */
function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

/** @param {unknown} value @param {string} label @returns {string} */
function requireString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string.`);
  return normalized;
}

/** @param {string} value @returns {string} */
function normalizeProjectPath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//u, "")
    .trim();
}

/** @param {string} rootDir @param {string} projectPath @returns {string} */
function resolveProjectPath(rootDir, projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  if (!normalized) throw new Error("Canonical source path must not be empty.");
  if (path.isAbsolute(normalized) || path.win32.isAbsolute(normalized) || path.posix.isAbsolute(normalized)) {
    throw new Error(`Canonical source path must be repository-relative: ${normalized}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Canonical source path is unsafe: ${normalized}`);
  }
  const absolutePath = path.resolve(rootDir, ...segments);
  if (absolutePath !== rootDir && !absolutePath.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`Canonical source path resolves outside repository root: ${normalized}`);
  }
  return absolutePath;
}

/** @param {string} value @returns {string} */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** @param {string} pattern @returns {RegExp} */
function compileProjectPattern(pattern) {
  const normalized = normalizeProjectPath(pattern);
  if (!normalized) throw new Error("Applicability pattern must not be empty.");
  let source = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === "*" && normalized[index + 1] === "*") {
      source += ".*";
      index += 1;
    } else if (character === "*") {
      source += "[^/]*";
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(character);
    }
  }
  return new RegExp(`${source}$`, "u");
}

/** @param {string} left @param {string} right @returns {number} */
function compareCanonicalText(left, right) {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

/**
 * Builds an immutable, deterministic catalog from one parsed canonical registry.
 * Unknown metadata fields are preserved so later taxonomy schema versions can
 * add labels, selectability, aliases or presentation metadata without requiring
 * consumer-specific copies.
 *
 * @param {Record<string, unknown>} registry - Parsed canonical taxonomy registry.
 * @param {{sourcePath?: string}} [options] - Canonical source identity.
 * @returns {Record<string, unknown>} Immutable serializable catalog.
 */
export function buildDocumentationFieldValueCatalog(registry, options = {}) {
  const root = requireObject(registry, "Documentation field value registry");
  const schemaVersion = root.schema_version;
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error("Documentation field value registry schema_version must be a positive integer.");
  }
  const registryId = requireString(root.registry_id, "Documentation field value registry registry_id");
  const sourcePath = normalizeProjectPath(
    options.sourcePath ?? documentationFieldValuesRegistryProjectPath,
  );
  const valueSets = requireArray(root.field_value_sets, "Documentation field value registry field_value_sets");
  const seenIds = new Set();
  const seenNames = new Set();
  const seenApplicability = new Set();

  const normalizedValueSets = valueSets.map((entry, valueSetIndex) => {
    const valueSet = requireObject(entry, `field_value_sets[${valueSetIndex}]`);
    const id = requireString(valueSet.id, `field_value_sets[${valueSetIndex}].id`);
    const name = requireString(valueSet.name, `${id}.name`);
    const fieldName = requireString(valueSet.field_name, `${id}.field_name`);
    const appliesToRegistry = normalizeProjectPath(
      requireString(valueSet.applies_to_registry, `${id}.applies_to_registry`),
    );
    const appliesToRecord = requireString(valueSet.applies_to_record, `${id}.applies_to_record`);
    requireString(valueSet.status, `${id}.status`);
    requireString(valueSet.description, `${id}.description`);

    if (seenIds.has(id)) throw new Error(`Duplicate field value set id: ${id}`);
    if (seenNames.has(name)) throw new Error(`Duplicate field value set name: ${name}`);
    seenIds.add(id);
    seenNames.add(name);

    const applicabilityKey = `${appliesToRegistry}::${appliesToRecord}::${fieldName}`;
    if (seenApplicability.has(applicabilityKey)) {
      throw new Error(`Duplicate field value set applicability: ${applicabilityKey}`);
    }
    seenApplicability.add(applicabilityKey);

    const values = requireArray(valueSet.values, `${id}.values`);
    if (values.length === 0) throw new Error(`${id}.values must not be empty.`);
    const seenValues = new Set();
    const normalizedValues = values.map((valueEntry, valueIndex) => {
      const valueRecord = requireObject(valueEntry, `${id}.values[${valueIndex}]`);
      const value = requireString(valueRecord.value, `${id}.values[${valueIndex}].value`);
      requireString(valueRecord.meaning, `${id}:${value}.meaning`);
      if (seenValues.has(value)) throw new Error(`${id} has duplicate value: ${value}`);
      seenValues.add(value);
      return {
        ...cloneData(valueRecord),
        value,
        canonical_source: {
          registry_id: registryId,
          registry_path: sourcePath,
          value_set_id: id,
        },
      };
    }).sort((left, right) => compareCanonicalText(left.value, right.value));

    return {
      ...cloneData(valueSet),
      id,
      name,
      field_name: fieldName,
      applies_to_registry: appliesToRegistry,
      applies_to_record: appliesToRecord,
      values: normalizedValues,
      canonical_source: {
        registry_id: registryId,
        registry_path: sourcePath,
        value_set_id: id,
      },
    };
  }).sort((left, right) => compareCanonicalText(left.id, right.id));

  return deepFreeze({
    schema_version: 1,
    catalog_id: "documentation-field-value-catalog",
    canonical_source: {
      registry_id: registryId,
      registry_path: sourcePath,
      schema_version: schemaVersion,
    },
    taxonomy: {
      registry_id: registryId,
      scope: requireString(root.scope, `${registryId}.scope`),
      status: requireString(root.status, `${registryId}.status`),
    },
    field_value_sets: normalizedValueSets,
  });
}

/**
 * Loads the canonical taxonomy and builds its immutable derived catalog.
 *
 * @param {{rootDir?: string, taxonomyProjectPath?: string}} [options]
 * @returns {Record<string, unknown>} Immutable serializable catalog.
 */
export function loadDocumentationFieldValueCatalog(options = {}) {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : defaultRootDir;
  const sourcePath = normalizeProjectPath(
    options.taxonomyProjectPath ?? documentationFieldValuesRegistryProjectPath,
  );
  const registry = readGovernedYamlFile(resolveProjectPath(rootDir, sourcePath));
  return buildDocumentationFieldValueCatalog(registry, { sourcePath });
}

/**
 * Resolves exactly one value set by its canonical semantic name.
 *
 * @param {Record<string, unknown>} catalog - Derived catalog.
 * @param {string} name - Canonical value set name.
 * @returns {Record<string, unknown>} Matching immutable value set.
 */
export function getDocumentationFieldValueSetByName(catalog, name) {
  const catalogObject = requireObject(catalog, "Documentation field value catalog");
  const canonicalName = requireString(name, "Field value set name");
  const matches = requireArray(catalogObject.field_value_sets, "catalog.field_value_sets")
    .filter((valueSet) => requireObject(valueSet, "catalog field value set").name === canonicalName);
  if (matches.length === 0) throw new Error(`Unknown field value set name: ${canonicalName}`);
  if (matches.length > 1) throw new Error(`Ambiguous field value set name: ${canonicalName}`);
  return matches[0];
}

/**
 * Resolves exactly one contextual value set.
 *
 * @param {Record<string, unknown>} catalog - Derived catalog.
 * @param {{registryPath: string, recordType: string, fieldName: string}} query - Canonical context.
 * @returns {Record<string, unknown>} Matching immutable value set.
 */
export function resolveDocumentationFieldValueSet(catalog, query) {
  const catalogObject = requireObject(catalog, "Documentation field value catalog");
  const queryObject = requireObject(query, "Controlled field resolution query");
  const registryPath = normalizeProjectPath(
    requireString(queryObject.registryPath, "Controlled field registryPath"),
  );
  const recordType = requireString(queryObject.recordType, "Controlled field recordType");
  const fieldName = requireString(queryObject.fieldName, "Controlled field fieldName");

  const matches = requireArray(catalogObject.field_value_sets, "catalog.field_value_sets")
    .filter((entry) => {
      const valueSet = requireObject(entry, "catalog field value set");
      return valueSet.field_name === fieldName &&
        valueSet.applies_to_record === recordType &&
        compileProjectPattern(String(valueSet.applies_to_registry)).test(registryPath);
    });

  const context = `${registryPath}::${recordType}::${fieldName}`;
  if (matches.length === 0) throw new Error(`No controlled field value set matches context: ${context}`);
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous controlled field value set context ${context}; matches: ${matches.map((item) => item.id).join(", ")}`,
    );
  }
  return matches[0];
}

/**
 * Resolves one canonical value inside its contextual value set.
 *
 * @param {Record<string, unknown>} catalog - Derived catalog.
 * @param {{registryPath: string, recordType: string, fieldName: string, value: string}} query - Canonical context and value.
 * @returns {Record<string, unknown>} Matching immutable canonical value record.
 */
export function resolveDocumentationFieldValue(catalog, query) {
  const queryObject = requireObject(query, "Controlled value resolution query");
  const canonicalValue = requireString(queryObject.value, "Controlled value");
  const valueSet = resolveDocumentationFieldValueSet(catalog, queryObject);
  const values = requireArray(valueSet.values, `${valueSet.id}.values`);
  const match = values.find((entry) => requireObject(entry, `${valueSet.id} value`).value === canonicalValue);
  if (!match) {
    throw new Error(
      `${valueSet.id} does not define controlled value ${canonicalValue}; allowed values: ${values.map((entry) => entry.value).join(", ")}`,
    );
  }
  return match;
}
