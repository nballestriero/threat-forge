#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * @file Requirement authoring JSON Schema builder.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0003
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Builds a deterministic JSON Schema for a governed Requirement authoring
 * request by consuming the canonical requirement authoring catalog. The schema
 * exposes selectable Macro-requirements, scoped Decisions, concrete Requirement
 * types, canonical meanings and parent Requirement constraints without
 * duplicating those rules in source code.
 *
 * Side effects: executes the governed catalog builder as a child Node process;
 * reads canonical registries through that builder; writes JSON or diagnostics
 * only to stdout/stderr; creates or modifies no repository file.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_REQUIREMENT_AUTHORING_SCHEMA_ROOT
  ? path.resolve(process.env.TF_REQUIREMENT_AUTHORING_SCHEMA_ROOT)
  : defaultRootDir;
const catalogBuilderProjectPath =
  "tools/MR-0002/build-requirement-authoring-catalog.mjs";

const macroRequirementIdPattern = "^MR-\\d{4}$";
const decisionIdPattern = "^ADR-\\d{4}$";
const requirementIdPattern = "^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}(?:GOV-\\d{4})?$";

/** @param {unknown} value @param {string} label @returns {Record<string, unknown>} */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
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

/** @param {unknown} value @param {string} label @returns {boolean} */
function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean.`);
  return value;
}

/** @param {string} left @param {string} right @returns {number} */
function compareIds(left, right) {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

/** @param {Array<Record<string, unknown>>} entries @param {(entry: Record<string, unknown>) => string} getValue @param {(entry: Record<string, unknown>) => string} getDescription */
function buildEnumProjection(entries, getValue, getDescription) {
  const ordered = [...entries].sort((left, right) => compareIds(getValue(left), getValue(right)));
  const values = ordered.map(getValue);
  const descriptions = ordered.map(getDescription);
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Schema enum contains duplicate value: ${value}`);
    seen.add(value);
  }
  return {
    type: "string",
    enum: values,
    markdownEnumDescriptions: descriptions,
    "x-threatforge-enum-metadata": ordered.map((entry, index) => ({
      value: values[index],
      description: descriptions[index],
    })),
  };
}

/** @returns {Record<string, unknown>} */
function loadCatalog() {
  const builderPath = path.join(rootDir, ...catalogBuilderProjectPath.split("/"));
  const result = spawnSync(process.execPath, [builderPath], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TF_REQUIREMENT_AUTHORING_CATALOG_ROOT: rootDir,
    },
  });
  if (result.error) throw new Error(`Cannot execute requirement authoring catalog builder: ${result.error.message}`);
  if (result.status !== 0) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(
      `Requirement authoring catalog builder failed with exit code ${result.status ?? "unknown"}` +
        (diagnostics ? `: ${diagnostics}` : "."),
    );
  }
  try {
    return requireObject(JSON.parse(result.stdout), "requirement authoring catalog");
  } catch (error) {
    throw new Error(`Requirement authoring catalog output is not valid JSON: ${error.message}`);
  }
}

/**
 * Builds a deterministic JSON Schema from a validated requirement authoring catalog.
 *
 * @param {Record<string, unknown>} catalog - Catalog produced by the governed catalog builder.
 * @returns {Record<string, unknown>} JSON Schema draft 2020-12 document.
 */
export function buildRequirementAuthoringSchema(catalog) {
  const catalogId = requireString(catalog.catalog_id, "catalog.catalog_id");
  if (catalogId !== "requirement-authoring-catalog") {
    throw new Error(`Unsupported catalog_id: ${catalogId}`);
  }
  if (!Number.isInteger(catalog.schema_version) || catalog.schema_version < 1) {
    throw new Error("catalog.schema_version must be a positive integer.");
  }
  const sources = requireArray(catalog.sources, "catalog.sources").map((value) => {
    const source = requireObject(value, "catalog source");
    return {
      kind: requireString(source.kind, "catalog source kind"),
      path: requireString(source.path, "catalog source path"),
      schema_version: source.schema_version,
      registry_id: requireString(source.registry_id, "catalog source registry_id"),
    };
  }).sort((left, right) => compareIds(left.path, right.path));

  const requirementTypes = requireArray(catalog.requirement_types, "catalog.requirement_types")
    .map((value) => {
      const type = requireObject(value, "catalog requirement type");
      const name = requireString(type.value, "requirement type value");
      if (name === "specialized") {
        throw new Error("specialized is an abstract category and cannot be projected as a concrete requirement_type.");
      }
      return {
        value: name,
        meaning: requireString(type.meaning, `${name}.meaning`),
        is_specialized: requireBoolean(type.is_specialized, `${name}.is_specialized`),
        requires_parent_requirement: requireBoolean(
          type.requires_parent_requirement,
          `${name}.requires_parent_requirement`,
        ),
        allowed_parent_requirement_types: requireArray(
          type.allowed_parent_requirement_types,
          `${name}.allowed_parent_requirement_types`,
        ).map((item) => requireString(item, `${name}.allowed_parent_requirement_types entry`)).sort(compareIds),
      };
    })
    .sort((left, right) => compareIds(left.value, right.value));
  if (requirementTypes.length === 0) throw new Error("Catalog contains no concrete requirement types.");

  const knownTypeNames = new Set(requirementTypes.map((entry) => entry.value));
  for (const type of requirementTypes) {
    for (const parentType of type.allowed_parent_requirement_types) {
      if (!knownTypeNames.has(parentType)) {
        throw new Error(`${type.value} allows unknown parent requirement type: ${parentType}`);
      }
    }
  }

  const macros = requireArray(catalog.macro_requirements, "catalog.macro_requirements")
    .map((macroValue) => {
      const macro = requireObject(macroValue, "catalog macro-requirement");
      const macroId = requireString(macro.id, "macro-requirement id");
      const decisions = requireArray(macro.decisions, `${macroId}.decisions`)
        .map((decisionValue) => {
          const decision = requireObject(decisionValue, `${macroId} decision`);
          const decisionId = requireString(decision.id, `${macroId} decision id`);
          const requirements = requireArray(decision.requirements, `${macroId}/${decisionId}.requirements`)
            .map((requirementValue) => {
              const requirement = requireObject(requirementValue, `${macroId}/${decisionId} Requirement`);
              const requirementType = requireString(requirement.requirement_type, "Requirement requirement_type");
              if (!knownTypeNames.has(requirementType)) {
                throw new Error(`${requirement.id} uses unknown requirement_type: ${requirementType}`);
              }
              return {
                id: requireString(requirement.id, "Requirement id"),
                title: requireString(requirement.title, "Requirement title"),
                status: requireString(requirement.status, "Requirement status"),
                requirement_type: requirementType,
              };
            })
            .sort((left, right) => compareIds(left.id, right.id));
          return {
            id: decisionId,
            reference: requireString(decision.reference, `${macroId}/${decisionId}.reference`),
            title: requireString(decision.title, `${macroId}/${decisionId}.title`),
            status: requireString(decision.status, `${macroId}/${decisionId}.status`),
            requirements,
          };
        })
        .sort((left, right) => compareIds(left.id, right.id));
      return {
        id: macroId,
        title: requireString(macro.title, `${macroId}.title`),
        status: requireString(macro.status, `${macroId}.status`),
        decisions,
      };
    })
    .sort((left, right) => compareIds(left.id, right.id));
  if (macros.length === 0) throw new Error("Catalog contains no Macro-requirements.");

  const macroEnum = buildEnumProjection(
    macros,
    (macro) => macro.id,
    (macro) => `${macro.title} — status: ${macro.status}`,
  );
  const requirementTypeEnum = buildEnumProjection(
    requirementTypes,
    (type) => type.value,
    (type) => type.meaning,
  );

  const allOf = [];
  for (const type of requirementTypes) {
    const thenSchema = type.requires_parent_requirement
      ? { required: ["parent_requirement_id"] }
      : { not: { required: ["parent_requirement_id"] } };
    allOf.push({
      if: {
        required: ["requirement_type"],
        properties: { requirement_type: { const: type.value } },
      },
      then: thenSchema,
    });
  }

  for (const macro of macros) {
    const macroThen = {
      properties: {
        decision_id: {
          ...buildEnumProjection(
            macro.decisions,
            (decision) => decision.id,
            (decision) => `${decision.title} — ${decision.reference} — status: ${decision.status}`,
          ),
          description: `Decision belonging to ${macro.id}.`,
        },
      },
    };
    allOf.push({
      if: {
        required: ["macro_requirement_id"],
        properties: { macro_requirement_id: { const: macro.id } },
      },
      then: macroThen,
    });

    for (const decision of macro.decisions) {
      for (const type of requirementTypes.filter((entry) => entry.requires_parent_requirement)) {
        const candidates = decision.requirements.filter((requirement) =>
          type.allowed_parent_requirement_types.includes(requirement.requirement_type),
        );
        const condition = {
          required: ["macro_requirement_id", "decision_id", "requirement_type"],
          properties: {
            macro_requirement_id: { const: macro.id },
            decision_id: { const: decision.id },
            requirement_type: { const: type.value },
          },
        };
        const then = candidates.length === 0
          ? false
          : {
              properties: {
                parent_requirement_id: {
                  ...buildEnumProjection(
                    candidates,
                    (requirement) => requirement.id,
                    (requirement) => `${requirement.title} — type: ${requirement.requirement_type} — status: ${requirement.status}`,
                  ),
                  description:
                    `Existing parent Requirement allowed for ${type.value} under ${macro.id}/${decision.id}.`,
                },
              },
            };
        allOf.push({ if: condition, then });
      }
    }
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "urn:threatforge:schema:requirement-authoring-request:1",
    title: "ThreatForge governed Requirement authoring request",
    description:
      "IDE-independent input contract for previewing and creating one governed Requirement. " +
      "Identifiers, paths and the initial registry status are generated by the authoring core.",
    type: "object",
    additionalProperties: false,
    required: ["macro_requirement_id", "decision_id", "requirement_type", "title"],
    properties: {
      macro_requirement_id: {
        ...macroEnum,
        pattern: macroRequirementIdPattern,
        description: "Canonical Macro-requirement that owns the new Requirement.",
      },
      decision_id: {
        type: "string",
        pattern: decisionIdPattern,
        description: "Canonical Decision selected within macro_requirement_id.",
      },
      requirement_type: {
        ...requirementTypeEnum,
        description:
          "Concrete storable Requirement type. Abstract categories such as specialized are not accepted.",
      },
      parent_requirement_id: {
        type: "string",
        pattern: requirementIdPattern,
        description:
          "Existing parent Requirement. Required or forbidden according to the selected concrete Requirement type.",
      },
      title: {
        type: "string",
        minLength: 1,
        pattern: "^[^\\r\\n]+$",
        description: "Single-line title of the governed Requirement.",
      },
    },
    allOf,
    "x-threatforge": {
      schema_id: "requirement-authoring-request-schema",
      schema_version: 1,
      catalog_id: catalogId,
      catalog_schema_version: catalog.schema_version,
      sources,
      generated_fields: ["id", "status", "body_path"],
      concrete_requirement_types: requirementTypes.map((type) => ({
        value: type.value,
        is_specialized: type.is_specialized,
        requires_parent_requirement: type.requires_parent_requirement,
        allowed_parent_requirement_types: type.allowed_parent_requirement_types,
      })),
    },
  };
}

function main() {
  if (process.argv.length > 2) throw new Error(`Unsupported argument: ${process.argv[2]}`);
  const schema = buildRequirementAuthoringSchema(loadCatalog());
  process.stdout.write(`${JSON.stringify(schema, null, 2)}\n`);
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) {
  try {
    main();
  } catch (error) {
    console.error(`Requirement authoring JSON Schema build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
