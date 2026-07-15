#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  documentModelIndexProjectPath,
  documentationFieldValuesProjectPath,
  loadGovernedDocumentModelSourceSet,
  validateGovernedDocumentModelSourceSet,
} from "../MR-0001/lib/governed-document-model-sources.mjs";
import { readGovernedYamlFile } from "../MR-0001/lib/governed-yaml.mjs";

/**
 * @file Governed document authoring catalog builder.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0003GOV-0001
 * @implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0001GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0002
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Builds one deterministic, read-only authoring catalog for Macro-requirements,
 * Decisions, Functional Requirements and Governance Requirements. Applicable
 * fields, controlled values, body sections, paths and relations are projected
 * from the canonical document-model profiles, taxonomy and current registries.
 *
 * Side effects: reads canonical governed sources and writes JSON or diagnostics
 * only to stdout/stderr. It never modifies the repository.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_GOVERNED_DOCUMENT_AUTHORING_CATALOG_ROOT
  ? path.resolve(process.env.TF_GOVERNED_DOCUMENT_AUTHORING_CATALOG_ROOT)
  : defaultRootDir;

const macroRequirementIdPattern = /^MR-\d{4}$/u;
const decisionIdPattern = /^ADR-\d{4}$/u;
const functionalRequirementIdPattern = /^MR-\d{4}ADR-\d{4}REQ-\d{4}$/u;
const governanceRequirementIdPattern = /^MR-\d{4}ADR-\d{4}REQ-\d{4}GOV-\d{4}$/u;

/** @param {unknown} value @returns {string} */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//u, "").trim();
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

/** @param {string} projectPath @returns {Record<string, unknown>} */
function readRegistry(projectPath) {
  try {
    return readGovernedYamlFile(resolveProjectPath(projectPath));
  } catch (error) {
    throw new Error(`Cannot read canonical YAML source ${projectPath}: ${error.message}`);
  }
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

/** @param {string} left @param {string} right @returns {number} */
function compareIds(left, right) {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

/** @param {Set<string>} seen @param {string} id @param {string} label */
function requireUnique(seen, id, label) {
  if (seen.has(id)) throw new Error(`Duplicate ${label}: ${id}`);
  seen.add(id);
}

/** @param {Record<string, unknown>} registry @param {string} projectPath */
function sourceRecord(registry, projectPath, kind) {
  const schemaVersion = registry.schema_version;
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error(`${projectPath}.schema_version must be a positive integer.`);
  }
  return {
    kind,
    path: normalizeProjectPath(projectPath),
    schema_version: schemaVersion,
    registry_id: requireString(registry.registry_id, `${projectPath}.registry_id`),
  };
}

/** @param {string} value */
function sectionInputName(value) {
  return value
    .replace(/^.*\.section\./u, "")
    .replaceAll("-", "_");
}

/** @param {Record<string, unknown>} field @param {Map<string, Record<string, unknown>>} valueSets */
function projectField(field, valueSets) {
  const name = requireString(field.name, `${field.id}.name`);
  const sourceKind = requireString(field.source_kind, `${field.id}.source_kind`);
  const valueKind = requireString(field.value_kind, `${field.id}.value_kind`);
  const projected = {
    id: requireString(field.id, "record field id"),
    name,
    order: field.order,
    cardinality: requireString(field.cardinality, `${field.id}.cardinality`),
    source_kind: sourceKind,
    value_kind: valueKind,
    authored: ["authored", "authored_or_configured", "authored_relation", "controlled"].includes(sourceKind),
    generated: ["generated", "derived", "path_derived", "workspace_derived", "format_managed"].includes(sourceKind),
    mutable: field.mutable !== false,
    pattern: field.pattern ?? null,
    required_value: field.required_value ?? null,
    template: field.template ?? null,
    parent_model_id: field.parent_model_id ?? null,
  };
  if (field.value_set_id) {
    const valueSetId = requireString(field.value_set_id, `${field.id}.value_set_id`);
    const valueSet = valueSets.get(valueSetId);
    if (!valueSet) throw new Error(`${field.id} references unknown value set ${valueSetId}.`);
    projected.value_set_id = valueSetId;
    projected.description = requireString(valueSet.description, `${valueSetId}.description`);
    projected.controlled_values = requireArray(valueSet.values, `${valueSetId}.values`).map((entryValue) => {
      const entry = requireObject(entryValue, `${valueSetId} value`);
      return {
        value: requireString(entry.value, `${valueSetId}.value`),
        label: String(entry.label ?? entry.value).trim(),
        meaning: requireString(entry.meaning, `${valueSetId}/${entry.value}.meaning`),
      };
    });
  } else {
    projected.description = `${name} is a ${valueKind} field whose canonical source kind is ${sourceKind}.`;
    projected.controlled_values = [];
  }
  return projected;
}


/** @param {unknown} value @param {string} label */
function projectStringList(value, label) {
  if (value === undefined || value === null || typeof value === "string") return [];
  return requireArray(value, label).map((item, index) => {
    if (typeof item === "string") return requireString(item, `${label}[${index}]`);
    const object = requireObject(item, `${label}[${index}]`);
    const entries = Object.entries(object);
    if (entries.length === 1 && String(entries[0][1] ?? "") === "") {
      return `${String(entries[0][0]).replace(/^"/u, "")}:`;
    }
    throw new Error(`${label}[${index}] must be a canonical string.`);
  });
}

/** @param {Record<string, unknown>} section */
function projectSection(section) {
  const sectionId = requireString(section.id, "body section id");
  const heading = requireString(section.heading, `${sectionId}.heading`);
  const contentKind = requireString(section.content_kind, `${sectionId}.content_kind`);
  const cardinality = requireString(section.cardinality, `${sectionId}.cardinality`);
  return {
    id: sectionId,
    input_name: sectionInputName(sectionId),
    heading,
    order: section.order,
    cardinality,
    required: cardinality === "exactly_one",
    content_kind: contentKind,
    description: `${heading} uses canonical content kind ${contentKind}.`,
    minimum_items: section.minimum_items ?? section.minimum_items_when_present ?? null,
    minimum_paragraphs: section.minimum_paragraphs ?? null,
    allowed_prefixes: projectStringList(section.allowed_prefixes, `${sectionId}.allowed_prefixes`),
    required_item_prefix: section.required_item_prefix ?? null,
    terminal_punctuation: section.terminal_punctuation ?? null,
    normative_keywords: projectStringList(section.normative_keywords, `${sectionId}.normative_keywords`),
    forbidden_normative_keywords: projectStringList(section.forbidden_normative_keywords, `${sectionId}.forbidden_normative_keywords`),
  };
}

/** @param {Record<string, unknown>} profile @param {string} modelId */
function fieldsForModel(profile, modelId) {
  if (Array.isArray(profile.record_fields)) return profile.record_fields;
  const variant = requireArray(profile.record_variants, `${profile.profile_id}.record_variants`)
    .map((value) => requireObject(value, `${profile.profile_id} variant`))
    .find((entry) => entry.model_id === modelId);
  if (!variant) throw new Error(`${profile.profile_id} has no record variant for ${modelId}.`);
  return requireArray(variant.fields, `${variant.id}.fields`);
}

/**
 * Builds the deterministic governed-document authoring catalog.
 *
 * @returns {Record<string, unknown>}
 */
export function buildGovernedDocumentAuthoringCatalog() {
  const sourceSet = loadGovernedDocumentModelSourceSet({ rootDir });
  const sourceDiagnostics = validateGovernedDocumentModelSourceSet(sourceSet);
  if (sourceDiagnostics.length > 0) {
    throw new Error(`Governed document model sources are invalid: ${sourceDiagnostics[0].message}`);
  }

  const taxonomy = readRegistry(documentationFieldValuesProjectPath);
  const valueSets = new Map();
  for (const value of requireArray(taxonomy.field_value_sets, "field_value_sets")) {
    const valueSet = requireObject(value, "field value set");
    const id = requireString(valueSet.id, "field value set id");
    if (valueSets.has(id)) throw new Error(`Duplicate field value set id: ${id}`);
    valueSets.set(id, valueSet);
  }

  const profileById = new Map(sourceSet.profiles.map((entry) => [entry.value.profile_id, entry.value]));
  const modelById = new Map(sourceSet.models.map((entry) => [entry.value.model_id, entry.value]));
  const indexModels = requireArray(sourceSet.index.value.models, "document model index models");

  const documentTypes = indexModels.map((indexValue) => {
    const indexEntry = requireObject(indexValue, "document model index entry");
    const modelId = requireString(indexEntry.id, "document model id");
    const model = requireObject(modelById.get(modelId), `${modelId} model`);
    const registryProfileId = requireString(indexEntry.registry_profile_id, `${modelId}.registry_profile_id`);
    const bodyProfileId = requireString(indexEntry.body_profile_id, `${modelId}.body_profile_id`);
    const registryProfile = requireObject(profileById.get(registryProfileId), `${registryProfileId} profile`);
    const bodyProfile = requireObject(profileById.get(bodyProfileId), `${bodyProfileId} profile`);
    return {
      id: modelId,
      title: requireString(indexEntry.title, `${modelId}.title`),
      description: requireString(model.description, `.description`),
      registry_profile_id: registryProfileId,
      body_profile_id: bodyProfileId,
      registry_source_path: registryProfile.source_path ?? registryProfile.source_path_pattern,
      body_source_path: bodyProfile.source_path_pattern,
      record_fields: fieldsForModel(registryProfile, modelId)
        .map((field) => projectField(requireObject(field, `${modelId} field`), valueSets))
        .sort((left, right) => left.order - right.order),
      body_sections: requireArray(bodyProfile.sections, `${bodyProfileId}.sections`)
        .map((section) => projectSection(requireObject(section, `${modelId} section`)))
        .sort((left, right) => left.order - right.order),
      header_template: requireString(bodyProfile.header?.template, `${bodyProfileId}.header.template`),
    };
  }).sort((left, right) => compareIds(left.id, right.id));

  const macroProfile = requireObject(profileById.get("macro-requirement-registry"), "macro-requirement-registry profile");
  const macroRegistryPath = requireString(macroProfile.source_path, "macro-requirement registry source path");
  const macroRegistry = readRegistry(macroRegistryPath);
  const sources = [
    sourceRecord(sourceSet.index.value, documentModelIndexProjectPath, "document_model_index"),
    sourceRecord(taxonomy, documentationFieldValuesProjectPath, "documentation_field_values"),
    sourceRecord(macroRegistry, macroRegistryPath, "macro_requirements"),
  ];

  const seenMacroIds = new Set();
  const catalogMacros = [];
  for (const macroValue of requireArray(macroRegistry.macro_requirements, "macro_requirements")) {
    const macro = requireObject(macroValue, "macro-requirement record");
    const macroId = requireString(macro.id, "macro-requirement id");
    if (!macroRequirementIdPattern.test(macroId)) throw new Error(`Invalid macro-requirement id: ${macroId}`);
    requireUnique(seenMacroIds, macroId, "macro-requirement id");

    const decisionsPath = normalizeProjectPath(requireString(macro.decisions_registry_path, `${macroId}.decisions_registry_path`));
    const requirementsPath = normalizeProjectPath(requireString(macro.requirements_registry_path, `${macroId}.requirements_registry_path`));
    const decisionsRegistry = readRegistry(decisionsPath);
    const requirementsRegistry = readRegistry(requirementsPath);
    sources.push(sourceRecord(decisionsRegistry, decisionsPath, "decisions"));
    sources.push(sourceRecord(requirementsRegistry, requirementsPath, "requirements"));

    const decisions = [];
    const decisionById = new Map();
    for (const decisionValue of requireArray(decisionsRegistry.decisions, `${macroId}.decisions`)) {
      const decision = requireObject(decisionValue, `${macroId} decision`);
      const id = requireString(decision.id, `${macroId} Decision id`);
      if (!decisionIdPattern.test(id)) throw new Error(`Invalid Decision id in ${macroId}: ${id}`);
      if (decisionById.has(id)) throw new Error(`Duplicate Decision id in ${macroId}: ${id}`);
      const projected = {
        id,
        reference: `${macroId}/${id}`,
        title: requireString(decision.title, `${macroId}/${id}.title`),
        status: requireString(decision.status, `${macroId}/${id}.status`),
        decision_type: requireString(decision.decision_type, `${macroId}/${id}.decision_type`),
        body_path: normalizeProjectPath(requireString(decision.body_path, `${macroId}/${id}.body_path`)),
        requirements: [],
      };
      decisionById.set(id, projected);
      decisions.push(projected);
    }

    const allRequirements = [];
    for (const requirementValue of requireArray(requirementsRegistry.requirements, `${macroId}.requirements`)) {
      const requirement = requireObject(requirementValue, `${macroId} Requirement`);
      const id = requireString(requirement.id, `${macroId} Requirement id`);
      const isFunctional = functionalRequirementIdPattern.test(id);
      const isGovernance = governanceRequirementIdPattern.test(id);
      if (!isFunctional && !isGovernance) throw new Error(`Invalid Requirement id: ${id}`);
      const decisionId = requireString(requirement.decision_id, `${id}.decision_id`);
      const decision = decisionById.get(decisionId);
      if (!decision) throw new Error(`${id} references unknown Decision ${macroId}/${decisionId}.`);
      const projected = {
        id,
        title: requireString(requirement.title, `${id}.title`),
        status: requireString(requirement.status, `${id}.status`),
        requirement_type: requireString(requirement.requirement_type, `${id}.requirement_type`),
        parent_requirement_id: requirement.parent_requirement_id
          ? requireString(requirement.parent_requirement_id, `${id}.parent_requirement_id`)
          : null,
        body_path: normalizeProjectPath(requireString(requirement.body_path, `${id}.body_path`)),
      };
      decision.requirements.push(projected);
      allRequirements.push(projected);
    }

    for (const decision of decisions) {
      decision.requirements.sort((left, right) => compareIds(left.id, right.id));
    }
    catalogMacros.push({
      id: macroId,
      title: requireString(macro.title, `${macroId}.title`),
      status: requireString(macro.status, `${macroId}.status`),
      macro_requirement_type: requireString(macro.macro_requirement_type, `${macroId}.macro_requirement_type`),
      body_path: normalizeProjectPath(requireString(macro.body_path, `${macroId}.body_path`)),
      decisions_registry_path: decisionsPath,
      requirements_registry_path: requirementsPath,
      decisions: decisions.sort((left, right) => compareIds(left.id, right.id)),
      requirements: allRequirements.sort((left, right) => compareIds(left.id, right.id)),
    });
  }

  return {
    schema_version: 2,
    catalog_id: "governed-document-authoring-catalog",
    sources: sources.sort((left, right) => compareIds(left.path, right.path)),
    document_types: documentTypes,
    macro_requirements: catalogMacros.sort((left, right) => compareIds(left.id, right.id)),
  };
}

function main() {
  if (process.argv.length > 2) throw new Error(`Unsupported argument: ${process.argv[2]}`);
  process.stdout.write(`${JSON.stringify(buildGovernedDocumentAuthoringCatalog(), null, 2)}\n`);
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) {
  try {
    main();
  } catch (error) {
    console.error(`Governed document authoring catalog build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
