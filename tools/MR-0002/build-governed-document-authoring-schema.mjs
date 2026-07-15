#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * @file Governed document authoring JSON Schema builder.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Builds one deterministic JSON Schema for Macro-requirement, Decision,
 * Functional Requirement and Governance Requirement request documents. Every
 * enum, relation candidate, body section and description is projected from the
 * canonical governed-document authoring catalog.
 *
 * Side effects: executes the catalog builder and writes JSON or diagnostics to
 * stdout/stderr only. It modifies no repository file.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_GOVERNED_DOCUMENT_AUTHORING_SCHEMA_ROOT
  ? path.resolve(process.env.TF_GOVERNED_DOCUMENT_AUTHORING_SCHEMA_ROOT)
  : defaultRootDir;
const catalogBuilderProjectPath =
  "tools/MR-0002/build-governed-document-authoring-catalog.mjs";

/** @param {unknown} value @param {string} label @returns {Record<string, unknown>} */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
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
/** @param {string} left @param {string} right */
function compareIds(left, right) {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

/** @param {Array<Record<string, unknown>>} entries @param {(entry: Record<string, unknown>) => string} getValue @param {(entry: Record<string, unknown>) => string} getDescription */
function enumProjection(entries, getValue, getDescription) {
  const ordered = [...entries].sort((left, right) => compareIds(getValue(left), getValue(right)));
  const values = ordered.map(getValue);
  if (new Set(values).size !== values.length) throw new Error(`Duplicate schema enum value: ${values.join(", ")}`);
  const descriptions = ordered.map(getDescription);
  return {
    type: "string",
    enum: values,
    markdownEnumDescriptions: descriptions,
    "x-threatforge-enum-metadata": values.map((value, index) => ({ value, description: descriptions[index] })),
  };
}

/** @returns {Record<string, unknown>} */
function loadCatalog() {
  const builderPath = path.join(rootDir, ...catalogBuilderProjectPath.split("/"));
  const result = spawnSync(process.execPath, [builderPath], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, TF_GOVERNED_DOCUMENT_AUTHORING_CATALOG_ROOT: rootDir },
  });
  if (result.error || result.status !== 0) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(`Governed document authoring catalog builder failed${diagnostics ? `: ${diagnostics}` : "."}`);
  }
  return requireObject(JSON.parse(result.stdout), "governed document authoring catalog");
}

/** @param {Record<string, unknown>} documentType @param {string} fieldName */
function fieldByName(documentType, fieldName) {
  const field = requireArray(documentType.record_fields, `${documentType.id}.record_fields`)
    .map((value) => requireObject(value, `${documentType.id} field`))
    .find((entry) => entry.name === fieldName);
  if (!field) throw new Error(`${documentType.id} has no field ${fieldName}.`);
  return field;
}

/** @param {Record<string, unknown>} field */
function controlledFieldSchema(field) {
  const values = requireArray(field.controlled_values, `${field.name}.controlled_values`)
    .map((value) => requireObject(value, `${field.name} value`));
  return {
    ...enumProjection(
      values,
      (entry) => requireString(entry.value, `${field.name}.value`),
      (entry) => requireString(entry.meaning, `${field.name}.meaning`),
    ),
    description: requireString(field.description, `${field.name}.description`),
  };
}

/** @param {Record<string, unknown>} section */
function sectionSchema(section) {
  const kind = requireString(section.content_kind, `${section.id}.content_kind`);
  const description = requireString(section.description, `${section.id}.description`);
  if (kind === "prose" || kind === "decision_prose") {
    return { type: "string", minLength: 1, description };
  }
  if (["normative_list", "normative_verification_list", "acceptance_condition_list", "failure_condition_list", "label_list"].includes(kind)) {
    const prefix = section.required_item_prefix ? ` The core adds the canonical prefix ${JSON.stringify(section.required_item_prefix)}.` : "";
    return {
      type: "array",
      minItems: Number(section.minimum_items ?? 1),
      uniqueItems: true,
      items: { type: "string", minLength: 1, pattern: "^[^\\r\\n]+$" },
      description: `${description}${prefix}`,
    };
  }
  if (kind === "classified_label_list" || kind === "classified_sentence_list") {
    const prefixes = requireArray(section.allowed_prefixes, `${section.id}.allowed_prefixes`)
      .map((value) => requireString(value, `${section.id} allowed prefix`));
    const properties = {};
    const requiredAlternatives = [];
    for (const prefix of prefixes) {
      const key = prefix.slice(0, -1).toLowerCase().replaceAll(" ", "_");
      properties[key] = {
        type: "array",
        minItems: 1,
        uniqueItems: true,
        items: { type: "string", minLength: 1, pattern: "^[^\\r\\n]+$" },
        description: `Items rendered with canonical prefix ${prefix}`,
      };
      requiredAlternatives.push({ required: [key] });
    }
    return {
      type: "object",
      additionalProperties: false,
      properties,
      anyOf: requiredAlternatives,
      description,
    };
  }
  throw new Error(`Unsupported body content_kind in schema projection: ${kind}`);
}

/** @param {Record<string, unknown>} documentType */
function bodySchema(documentType) {
  const properties = {};
  const required = [];
  for (const value of requireArray(documentType.body_sections, `${documentType.id}.body_sections`)) {
    const section = requireObject(value, `${documentType.id} body section`);
    if (section.content_kind === "controlled_scalar_label") continue;
    const inputName = requireString(section.input_name, `${section.id}.input_name`);
    properties[inputName] = sectionSchema(section);
    if (section.required) required.push(inputName);
  }
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties,
    description: `Canonical Markdown body inputs for ${documentType.title}.`,
  };
}

/** @param {Record<string, unknown>} documentType @param {Record<string, unknown>} common @param {Record<string, unknown>[]} macros */
function branchSchema(documentType, common, macros) {
  const id = requireString(documentType.id, "document type id");
  const properties = {
    document_type: { const: id, description: requireString(documentType.description, `${id}.description`) },
    title: common.title,
    body: bodySchema(documentType),
  };
  const required = ["document_type", "title", "body"];
  const allOf = [];

  if (id === "macro-requirement") {
    properties.macro_requirement_type = controlledFieldSchema(fieldByName(documentType, "macro_requirement_type"));
    required.push("macro_requirement_type");
  } else {
    properties.macro_requirement_id = common.macroRequirement;
    required.push("macro_requirement_id");
    if (id === "decision") {
      properties.decision_type = controlledFieldSchema(fieldByName(documentType, "decision_type"));
      properties.author = {
        type: "string",
        minLength: 1,
        pattern: "^[^\\r\\n]+$",
        description: requireString(fieldByName(documentType, "author").description, `${id}.author.description`),
      };
      required.push("decision_type", "author");
    } else {
      properties.decision_id = {
        type: "string",
        pattern: "^ADR-\\d{4}$",
        description: "Existing Decision belonging to macro_requirement_id.",
      };
      required.push("decision_id");
      for (const macro of macros) {
        const decisions = requireArray(macro.decisions, `${macro.id}.decisions`)
          .map((value) => requireObject(value, `${macro.id} Decision`));
        allOf.push({
          if: { properties: { macro_requirement_id: { const: macro.id } }, required: ["macro_requirement_id"] },
          then: {
            properties: {
              decision_id: enumProjection(
                decisions,
                (entry) => requireString(entry.id, "Decision id"),
                (entry) => `${entry.title} — ${macro.id}/${entry.id} — status: ${entry.status}`,
              ),
            },
          },
        });
      }
      if (id === "governance-requirement") {
        properties.parent_requirement_id = {
          type: "string",
          pattern: "^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}$",
          description: "Existing Functional Requirement under the selected Macro-requirement and Decision.",
        };
        required.push("parent_requirement_id");
        for (const macro of macros) {
          for (const decisionValue of requireArray(macro.decisions, `${macro.id}.decisions`)) {
            const decision = requireObject(decisionValue, `${macro.id} Decision`);
            const candidates = requireArray(decision.requirements, `${macro.id}/${decision.id}.requirements`)
              .map((value) => requireObject(value, `${macro.id}/${decision.id} Requirement`))
              .filter((entry) => entry.requirement_type === "functional");
            allOf.push({
              if: {
                properties: {
                  macro_requirement_id: { const: macro.id },
                  decision_id: { const: decision.id },
                },
                required: ["macro_requirement_id", "decision_id"],
              },
              then: candidates.length > 0
                ? {
                    properties: {
                      parent_requirement_id: enumProjection(
                        candidates,
                        (entry) => requireString(entry.id, "Functional Requirement id"),
                        (entry) => `${entry.title} — status: ${entry.status}`,
                      ),
                    },
                  }
                : false,
            });
          }
        }
      }
    }
  }

  const branch = {
    title: documentType.title,
    type: "object",
    additionalProperties: false,
    required,
    properties,
  };
  if (allOf.length > 0) branch.allOf = allOf;
  return branch;
}

/**
 * Builds the deterministic governed-document request schema.
 *
 * @param {Record<string, unknown>} catalog
 * @returns {Record<string, unknown>}
 */
export function buildGovernedDocumentAuthoringSchema(catalog) {
  if (requireString(catalog.catalog_id, "catalog.catalog_id") !== "governed-document-authoring-catalog") {
    throw new Error(`Unsupported catalog_id: ${catalog.catalog_id}`);
  }
  const documentTypes = requireArray(catalog.document_types, "catalog.document_types")
    .map((value) => requireObject(value, "catalog document type"));
  const expected = ["macro-requirement", "decision", "functional-requirement", "governance-requirement"];
  if (JSON.stringify(documentTypes.map((entry) => entry.id).sort(compareIds)) !== JSON.stringify([...expected].sort(compareIds))) {
    throw new Error("Catalog must expose exactly the four canonical governed document types.");
  }
  const macros = requireArray(catalog.macro_requirements, "catalog.macro_requirements")
    .map((value) => requireObject(value, "catalog Macro-requirement"));
  const common = {
    title: {
      type: "string",
      minLength: 1,
      pattern: "^[^\\r\\n]+$",
      description: "Single-line title mirrored by the canonical registry record and Markdown H1.",
    },
    macroRequirement: {
      ...enumProjection(
        macros,
        (entry) => requireString(entry.id, "Macro-requirement id"),
        (entry) => `${entry.title} — status: ${entry.status}`,
      ),
      description: "Existing canonical Macro-requirement that owns the new document.",
    },
  };

  const sources = requireArray(catalog.sources, "catalog.sources")
    .map((value) => requireObject(value, "catalog source"))
    .sort((left, right) => compareIds(String(left.path), String(right.path)));
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "urn:threatforge:schema:governed-document-authoring-request:1",
    title: "ThreatForge governed document authoring request",
    description:
      "IDE-independent request for previewing and creating one Macro-requirement, Decision, Functional Requirement or Governance Requirement. Generated identifiers, lifecycle status, dates, paths and derived relations are omitted from the request.",
    oneOf: documentTypes
      .sort((left, right) => expected.indexOf(left.id) - expected.indexOf(right.id))
      .map((documentType) => branchSchema(documentType, common, macros)),
    "x-threatforge": {
      schema_id: "governed-document-authoring-request-schema",
      schema_version: 1,
      catalog_id: catalog.catalog_id,
      catalog_schema_version: catalog.schema_version,
      sources,
      request_suffix: ".governed-document-authoring.yml",
      generated_fields: [
        "id",
        "status",
        "date",
        "body_path",
        "decisions_registry_path",
        "requirements_registry_path",
        "requirement_type",
      ],
      supported_document_types: expected,
    },
  };
}

function main() {
  if (process.argv.length > 2) throw new Error(`Unsupported argument: ${process.argv[2]}`);
  process.stdout.write(`${JSON.stringify(buildGovernedDocumentAuthoringSchema(loadCatalog()), null, 2)}\n`);
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) {
  try {
    main();
  } catch (error) {
    console.error(`Governed document authoring JSON Schema build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
