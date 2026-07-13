#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Requirement authoring catalog builder.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0003GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Builds a deterministic, read-only requirement authoring catalog exclusively
 * from the canonical Macro-requirement, Decision, Requirement and controlled
 * documentation field value registries. The catalog is written as JSON to
 * stdout and no repository file is created or modified.
 *
 * Side effects: reads governed registry files; writes JSON or diagnostics only
 * to stdout/stderr; exits non-zero on missing, malformed, duplicate or
 * relationally ambiguous canonical data.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_REQUIREMENT_AUTHORING_CATALOG_ROOT
  ? path.resolve(process.env.TF_REQUIREMENT_AUTHORING_CATALOG_ROOT)
  : defaultRootDir;

const macroRequirementsRegistryProjectPath =
  "docs/reference/project-model/registers/macro-requirements.registry.yml";
const requirementsDirectoryProjectPath =
  "docs/reference/project-model/registers/requirements";
const taxonomyRegistryProjectPath =
  "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml";

const macroRequirementIdPattern = /^MR-\d{4}$/u;
const decisionIdPattern = /^ADR-\d{4}$/u;
const requirementIdPattern = /^(MR-\d{4})(ADR-\d{4})REQ-\d{4}(?:GOV-\d{4})?$/u;

/** @param {string} value @returns {string} */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/").trim();
}

/** @param {string} projectPath @returns {string} */
function resolveProjectPath(projectPath) {
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

/** @param {string} filePath @returns {string} */
function readText(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Canonical source is missing: ${filePath}`);
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
}

/** @param {string} value @returns {string} */
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

/** @param {string} value @returns {string|number|boolean|null|Array<unknown>|Record<string, unknown>} */
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

/** @param {string} line @returns {number} */
function countIndent(line) {
  return line.match(/^ */u)?.[0].length ?? 0;
}

/**
 * Parses the restricted YAML subset used by current governed registries.
 *
 * @param {string} text - Governed YAML text.
 * @returns {Record<string, unknown>} Parsed object.
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
      block.push(next.slice(Math.min(baseIndent + 2, next.length)));
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
      if (!Array.isArray(parent)) throw new Error(`Invalid YAML sequence indentation at line ${index + 1}.`);
      const itemText = trimmed.slice(2).trim();
      const colonIndex = itemText.indexOf(":");
      if (colonIndex === -1) {
        parent.push(parseScalar(itemText));
        continue;
      }
      const key = itemText.slice(0, colonIndex).trim();
      const rawValue = itemText.slice(colonIndex + 1).trim();
      const item = {};
      parent.push(item);
      if (rawValue === "|") {
        const block = readBlock(index, indent);
        item[key] = block.text;
        index = block.nextIndex;
      } else if (rawValue === "") {
        const nextLine = nextMeaningfulLine(index);
        const value = nextLine.trim().startsWith("- ") ? [] : {};
        item[key] = value;
        stack.push({ indent, value: item });
        stack.push({ indent: indent + 2, value });
      } else {
        item[key] = parseScalar(rawValue);
        stack.push({ indent, value: item });
      }
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) throw new Error(`Invalid YAML mapping entry at line ${index + 1}.`);
    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();
    const parent = getParent(indent);
    if (Array.isArray(parent) || typeof parent !== "object" || parent === null) {
      throw new Error(`Invalid YAML mapping parent at line ${index + 1}.`);
    }
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

/** @param {string} projectPath @returns {Record<string, unknown>} */
function readYaml(projectPath) {
  try {
    return parseYaml(readText(resolveProjectPath(projectPath)));
  } catch (error) {
    throw new Error(`Cannot read canonical YAML source ${projectPath}: ${error.message}`);
  }
}

/** @param {unknown} value @param {string} label @returns {Record<string, unknown>} */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}

/** @param {unknown} value @param {string} label @returns {Array<unknown>} */
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

/** @param {Set<string>} seen @param {string} id @param {string} label @returns {void} */
function requireUnique(seen, id, label) {
  if (seen.has(id)) throw new Error(`Duplicate ${label}: ${id}`);
  seen.add(id);
}

/** @param {string} a @param {string} b @returns {number} */
function compareIds(a, b) {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

/** @param {Array<Record<string, unknown>>} sources @param {string} kind @param {string} projectPath @param {Record<string, unknown>} registry */
function registerSource(sources, kind, projectPath, registry) {
  const schemaVersion = registry.schema_version;
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error(`${projectPath}.schema_version must be a positive integer.`);
  }
  sources.push({
    kind,
    path: normalizeProjectPath(projectPath),
    schema_version: schemaVersion,
    registry_id: requireString(registry.registry_id, `${projectPath}.registry_id`),
  });
}

/** @param {Record<string, unknown>} taxonomyRegistry @returns {Array<Record<string, unknown>>} */
function loadRequirementTypes(taxonomyRegistry) {
  const valueSets = requireArray(taxonomyRegistry.field_value_sets, "taxonomy.field_value_sets");
  const matches = valueSets.filter((entry) => requireObject(entry, "field value set").name === "requirement_type");
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one requirement_type value set, found ${matches.length}.`);
  }
  const valueSet = requireObject(matches[0], "requirement_type value set");
  const values = requireArray(valueSet.values, "requirement_type.values");
  const seen = new Set();
  const types = values.map((entry) => {
    const value = requireObject(entry, "requirement_type value");
    const typeName = requireString(value.value, "requirement_type.value");
    requireUnique(seen, typeName, "requirement_type value");
    if (typeName === "specialized") throw new Error("specialized is an abstract category and cannot be a requirement_type value.");
    if (typeof value.is_specialized !== "boolean") {
      throw new Error(`${typeName}.is_specialized must be boolean.`);
    }
    if (typeof value.requires_parent_requirement !== "boolean") {
      throw new Error(`${typeName}.requires_parent_requirement must be boolean.`);
    }
    const allowedParentTypes = requireArray(
      value.allowed_parent_requirement_types,
      `${typeName}.allowed_parent_requirement_types`,
    ).map((item) => requireString(item, `${typeName}.allowed_parent_requirement_types entry`));
    const seenParentTypes = new Set();
    for (const parentType of allowedParentTypes) {
      requireUnique(seenParentTypes, parentType, `${typeName} allowed parent requirement type`);
    }
    return {
      value: typeName,
      meaning: requireString(value.meaning, `${typeName}.meaning`),
      is_specialized: value.is_specialized,
      requires_parent_requirement: value.requires_parent_requirement,
      allowed_parent_requirement_types: allowedParentTypes.sort(compareIds),
    };
  }).sort((left, right) => compareIds(left.value, right.value));

  const knownTypes = new Set(types.map((entry) => entry.value));
  for (const type of types) {
    for (const parentType of type.allowed_parent_requirement_types) {
      if (!knownTypes.has(parentType)) {
        throw new Error(`${type.value} allows unknown parent requirement type: ${parentType}`);
      }
    }
    if (!type.requires_parent_requirement && type.allowed_parent_requirement_types.length > 0) {
      throw new Error(`${type.value} forbids a parent but declares allowed parent types.`);
    }
    if (type.requires_parent_requirement && type.allowed_parent_requirement_types.length === 0) {
      throw new Error(`${type.value} requires a parent but declares no allowed parent types.`);
    }
  }
  return types;
}

/**
 * Builds the deterministic requirement authoring catalog.
 *
 * @param {string} [baseRootDir] - Repository root; primarily for deterministic tests.
 * @returns {Record<string, unknown>} Catalog derived only from canonical registries.
 */
export function buildRequirementAuthoringCatalog() {
  const sources = [];
  const macroRegistry = readYaml(macroRequirementsRegistryProjectPath);
  registerSource(sources, "macro_requirements", macroRequirementsRegistryProjectPath, macroRegistry);
  const taxonomyRegistry = readYaml(taxonomyRegistryProjectPath);
  registerSource(sources, "documentation_field_values", taxonomyRegistryProjectPath, taxonomyRegistry);
  const requirementTypes = loadRequirementTypes(taxonomyRegistry);
  const requirementTypesByName = new Map(requirementTypes.map((entry) => [entry.value, entry]));

  const macroRecords = requireArray(macroRegistry.macro_requirements, "macro_requirements");
  const seenMacroIds = new Set();
  const catalogMacros = [];

  for (const macroValue of macroRecords) {
    const macro = requireObject(macroValue, "macro-requirement record");
    const macroId = requireString(macro.id, "macro-requirement id");
    if (!macroRequirementIdPattern.test(macroId)) throw new Error(`Invalid macro-requirement id: ${macroId}`);
    requireUnique(seenMacroIds, macroId, "macro-requirement id");

    const decisionsPath = normalizeProjectPath(
      requireString(macro.decisions_registry_path, `${macroId}.decisions_registry_path`),
    );
    const requirementsPath = `${requirementsDirectoryProjectPath}/${macroId}.requirements.registry.yml`;
    const decisionsRegistry = readYaml(decisionsPath);
    const requirementsRegistry = readYaml(requirementsPath);
    registerSource(sources, "decisions", decisionsPath, decisionsRegistry);
    registerSource(sources, "requirements", requirementsPath, requirementsRegistry);

    if (requireString(decisionsRegistry.macro_requirement_id, `${decisionsPath}.macro_requirement_id`) !== macroId) {
      throw new Error(`${decisionsPath} does not belong to ${macroId}.`);
    }
    if (requireString(requirementsRegistry.macro_requirement_id, `${requirementsPath}.macro_requirement_id`) !== macroId) {
      throw new Error(`${requirementsPath} does not belong to ${macroId}.`);
    }

    const decisions = requireArray(decisionsRegistry.decisions, `${macroId}.decisions`);
    const seenDecisionIds = new Set();
    const decisionById = new Map();
    for (const decisionValue of decisions) {
      const decision = requireObject(decisionValue, `${macroId} decision record`);
      const decisionId = requireString(decision.id, `${macroId} decision id`);
      if (!decisionIdPattern.test(decisionId)) throw new Error(`Invalid Decision id in ${macroId}: ${decisionId}`);
      requireUnique(seenDecisionIds, decisionId, `${macroId} Decision id`);
      if (requireString(decision.macro_requirement_id, `${macroId}/${decisionId}.macro_requirement_id`) !== macroId) {
        throw new Error(`${macroId}/${decisionId} declares a different macro_requirement_id.`);
      }
      decisionById.set(decisionId, {
        id: decisionId,
        reference: `${macroId}/${decisionId}`,
        title: requireString(decision.title, `${macroId}/${decisionId}.title`),
        status: requireString(decision.status, `${macroId}/${decisionId}.status`),
        decision_type: requireString(decision.decision_type, `${macroId}/${decisionId}.decision_type`),
        body_path: normalizeProjectPath(requireString(decision.body_path, `${macroId}/${decisionId}.body_path`)),
        requirements: [],
      });
    }

    const requirements = requireArray(requirementsRegistry.requirements, `${macroId}.requirements`);
    const seenRequirementIds = new Set();
    const requirementRecords = new Map();
    for (const requirementValue of requirements) {
      const requirement = requireObject(requirementValue, `${macroId} Requirement record`);
      const requirementId = requireString(requirement.id, `${macroId} Requirement id`);
      const idMatch = requirementId.match(requirementIdPattern);
      if (!idMatch || idMatch[1] !== macroId) throw new Error(`Invalid Requirement id for ${macroId}: ${requirementId}`);
      requireUnique(seenRequirementIds, requirementId, `${macroId} Requirement id`);
      if (requireString(requirement.macro_requirement_id, `${requirementId}.macro_requirement_id`) !== macroId) {
        throw new Error(`${requirementId} declares a different macro_requirement_id.`);
      }
      const decisionId = idMatch[2];
      if (!decisionById.has(decisionId)) throw new Error(`${requirementId} references unknown Decision ${macroId}/${decisionId}.`);
      const requirementType = requireString(requirement.requirement_type, `${requirementId}.requirement_type`);
      if (!requirementTypesByName.has(requirementType)) {
        throw new Error(`${requirementId} uses unknown concrete requirement_type: ${requirementType}`);
      }
      requirementRecords.set(requirementId, {
        id: requirementId,
        title: requireString(requirement.title, `${requirementId}.title`),
        status: requireString(requirement.status, `${requirementId}.status`),
        requirement_type: requirementType,
        parent_requirement_id: requirement.parent_requirement_id
          ? requireString(requirement.parent_requirement_id, `${requirementId}.parent_requirement_id`)
          : null,
        body_path: normalizeProjectPath(requireString(requirement.body_path, `${requirementId}.body_path`)),
        decisionId,
      });
    }

    for (const requirement of requirementRecords.values()) {
      const typeRule = requirementTypesByName.get(requirement.requirement_type);
      if (typeRule.requires_parent_requirement && !requirement.parent_requirement_id) {
        throw new Error(`${requirement.id} requires parent_requirement_id.`);
      }
      if (!typeRule.requires_parent_requirement && requirement.parent_requirement_id) {
        throw new Error(`${requirement.id} must not declare parent_requirement_id.`);
      }
      if (requirement.parent_requirement_id) {
        const parent = requirementRecords.get(requirement.parent_requirement_id);
        if (!parent) throw new Error(`${requirement.id} references unknown parent Requirement ${requirement.parent_requirement_id}.`);
        if (!typeRule.allowed_parent_requirement_types.includes(parent.requirement_type)) {
          throw new Error(
            `${requirement.id} cannot use parent type ${parent.requirement_type}; allowed: ${typeRule.allowed_parent_requirement_types.join(", ")}`,
          );
        }
      }
      const { decisionId, ...catalogRequirement } = requirement;
      decisionById.get(decisionId).requirements.push(catalogRequirement);
    }

    const catalogDecisions = [...decisionById.values()]
      .map((decision) => ({
        ...decision,
        requirements: decision.requirements.sort((left, right) => compareIds(left.id, right.id)),
      }))
      .sort((left, right) => compareIds(left.id, right.id));

    catalogMacros.push({
      id: macroId,
      title: requireString(macro.title, `${macroId}.title`),
      status: requireString(macro.status, `${macroId}.status`),
      type: requireString(macro.type, `${macroId}.type`),
      body_path: normalizeProjectPath(requireString(macro.body_path, `${macroId}.body_path`)),
      decisions: catalogDecisions,
    });
  }

  return {
    schema_version: 1,
    catalog_id: "requirement-authoring-catalog",
    sources: sources.sort((left, right) => compareIds(left.path, right.path)),
    requirement_types: requirementTypes,
    macro_requirements: catalogMacros.sort((left, right) => compareIds(left.id, right.id)),
  };
}

function main() {
  if (process.argv.length > 2) throw new Error(`Unsupported argument: ${process.argv[2]}`);
  const catalog = buildRequirementAuthoringCatalog();
  process.stdout.write(`${JSON.stringify(catalog, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  console.error(`Requirement authoring catalog build failed: ${error.message}`);
  process.exitCode = 1;
}
