#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readGovernedYamlFile } from "../MR-0001/lib/governed-yaml.mjs";
import {
  validateGovernedDocumentModelConsumerCoverage,
} from "../MR-0001/lib/governed-document-model-sources.mjs";

/**
 * @file Governed document authoring transaction core.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0002
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Plans and atomically creates governed documents through explicit model-specific
 * authoring providers whose coverage is checked against the canonical catalog.
 * The same plan and transaction are consumed by CLI, VS Code and future adapters.
 * Generated identifiers, paths, relations and lifecycle values never come from
 * an editor-owned rule set or an implicit fallback provider.
 *
 * Side effects:
 * - planGeneratedDocument reads canonical registries only;
 * - applyGeneratedDocument installs every planned file as one rollback-capable
 *   transaction and can run mandatory verification before committing it;
 * - direct execution provides help only; the governed runner owns user input.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const configuredRootDir = process.env.TF_AUTHORING_ROOT
  ? path.resolve(process.env.TF_AUTHORING_ROOT)
  : defaultRootDir;

const macroRegistryProjectPath =
  "docs/reference/project-model/registers/macro-requirements.registry.yml";
const generatedRequestFields = new Set([
  "id",
  "status",
  "date",
  "body_path",
  "decisions_registry_path",
  "requirements_registry_path",
  "requirement_type",
]);
const commonRequestFields = Object.freeze(["document_type", "title", "body"]);
const authoringProviderConsumerId = "governed-document-authoring-runtime";
const authoringCatalogSourcePath = "governed-document-authoring-catalog";

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

/** @param {{rootDir?: string}} options @returns {string} */
function resolveRootDir(options = {}) {
  return options.rootDir ? path.resolve(String(options.rootDir)) : configuredRootDir;
}

/** @param {string} projectPath @param {string} rootDir @returns {string} */
function resolveProjectPath(projectPath, rootDir) {
  const normalized = String(projectPath ?? "").replaceAll("\\", "/").trim();
  if (!normalized) throw new Error("Repository-relative path must not be empty.");
  if (path.isAbsolute(normalized) || path.win32.isAbsolute(normalized) || path.posix.isAbsolute(normalized)) {
    throw new Error(`Repository path must be relative: ${normalized}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Repository path is unsafe: ${normalized}`);
  }
  const absolute = path.resolve(rootDir, ...segments);
  const relative = path.relative(rootDir, absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Repository path resolves outside root: ${normalized}`);
  }
  return absolute;
}

/** @param {typeof fs} fileSystem @param {string} filePath @returns {string} */
function readText(fileSystem, filePath) {
  return fileSystem.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
}

/** @param {string} value @returns {string} */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** @param {string} value @returns {string} */
function yamlScalar(value) {
  const text = String(value);
  return /^[A-Za-z0-9_./-]+$/u.test(text) ? text : JSON.stringify(text);
}

/** @param {Array<Record<string, unknown>>} records @param {string} prefix */
function nextFourDigitSuffix(records, prefix) {
  const expression = new RegExp(`^${escapeRegExp(prefix)}(\\d{4})$`, "u");
  let maximum = 0;
  for (const record of records) {
    const match = String(record.id ?? "").match(expression);
    if (match) maximum = Math.max(maximum, Number.parseInt(match[1], 10));
  }
  return String(maximum + 1).padStart(4, "0");
}

/** @param {Record<string, unknown>} catalog @param {string} documentType */
function getDocumentType(catalog, documentType) {
  const type = requireArray(catalog.document_types, "catalog.document_types")
    .map((value) => requireObject(value, "catalog document type"))
    .find((entry) => entry.id === documentType);
  if (!type) throw new Error(`Unsupported governed document_type: ${documentType}`);
  return type;
}

/** @param {Record<string, unknown>} documentType @param {string} fieldName */
function getField(documentType, fieldName) {
  const field = requireArray(documentType.record_fields, `${documentType.id}.record_fields`)
    .map((value) => requireObject(value, `${documentType.id} field`))
    .find((entry) => entry.name === fieldName);
  if (!field) throw new Error(`${documentType.id} has no canonical field ${fieldName}.`);
  return field;
}

/** @param {Record<string, unknown>} field @param {string} requestedValue */
function resolveControlledValue(field, requestedValue) {
  const requiredValue = field.required_value ? String(field.required_value) : null;
  const candidate = requiredValue ?? requestedValue;
  const values = requireArray(field.controlled_values, `${field.name}.controlled_values`)
    .map((value) => requireObject(value, `${field.name} controlled value`));
  const entry = values.find((value) => value.value === candidate);
  if (!entry) {
    throw new Error(`${field.name} must be one of: ${values.map((value) => value.value).join(", ")}.`);
  }
  return entry;
}

/** @param {Record<string, unknown>} catalog @param {string} macroId */
function getMacro(catalog, macroId) {
  const macro = requireArray(catalog.macro_requirements, "catalog.macro_requirements")
    .map((value) => requireObject(value, "catalog Macro-requirement"))
    .find((entry) => entry.id === macroId);
  if (!macro) throw new Error(`Unknown canonical Macro-requirement: ${macroId}`);
  return macro;
}

/** @param {Record<string, unknown>} macro @param {string} decisionId */
function getDecision(macro, decisionId) {
  const decision = requireArray(macro.decisions, `${macro.id}.decisions`)
    .map((value) => requireObject(value, `${macro.id} Decision`))
    .find((entry) => entry.id === decisionId);
  if (!decision) throw new Error(`Decision ${decisionId} does not belong to ${macro.id}.`);
  return decision;
}

/** @param {Record<string, unknown>} documentType @param {Record<string, unknown>} body */
function validateBodyShape(documentType, body) {
  const sections = requireArray(documentType.body_sections, `${documentType.id}.body_sections`)
    .map((entry) => requireObject(entry, `${documentType.id} body section`))
    .filter((entry) => entry.content_kind !== "controlled_scalar_label");
  const allowed = new Set(sections.map((entry) => entry.input_name));
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      throw new Error(`${documentType.id} body contains unsupported field ${key}.`);
    }
  }
  for (const section of sections) {
    if (section.required && !Object.prototype.hasOwnProperty.call(body, section.input_name)) {
      throw new Error(`${documentType.id} body is missing required field ${section.input_name}.`);
    }
  }
}

/** @param {Record<string, unknown>} documentType @param {string} fieldName @param {unknown} value */
function validateControlledField(documentType, fieldName, value) {
  return resolveControlledValue(
    getField(documentType, fieldName),
    requireString(value, fieldName),
  );
}

/** @param {string} value @param {string} label */
function requireSingleLine(value, label) {
  const text = requireString(value, label);
  if (/\r|\n/u.test(text)) throw new Error(`${label} must be a single line.`);
  return text;
}

/** @param {unknown} value @param {string} label */
function requireStringArray(value, label) {
  const items = requireArray(value, label).map((item, index) =>
    requireSingleLine(item, `${label}[${index}]`),
  );
  if (items.length === 0) throw new Error(`${label} must contain at least one item.`);
  return items;
}

/** @param {string} value */
function ensurePeriod(value) {
  return value.endsWith(".") ? value : `${value}.`;
}

/** @param {string} value @param {string} label */
function forbidTerminalPunctuation(value, label) {
  if (/[.!?;:]$/u.test(value)) throw new Error(`${label} must not end with terminal punctuation.`);
  return value;
}

/** @param {Record<string, unknown>} section @param {unknown} rawValue */
function renderSectionContent(section, rawValue, generatedValues) {
  const kind = requireString(section.content_kind, `${section.id}.content_kind`);
  if (kind === "controlled_scalar_label") {
    const status = requireObject(generatedValues.statusEntry, "generated status entry");
    return requireString(status.label ?? status.value, "controlled status label");
  }
  if (kind === "prose" || kind === "decision_prose") {
    return requireString(rawValue, section.input_name);
  }
  if (kind === "normative_list" || kind === "normative_verification_list") {
    return requireStringArray(rawValue, section.input_name)
      .map((item) => `- ${ensurePeriod(item)}`)
      .join("\n");
  }
  if (kind === "acceptance_condition_list" || kind === "failure_condition_list") {
    const prefix = requireString(section.required_item_prefix, `${section.id}.required_item_prefix`);
    const canonicalPrefix = `${prefix} `;
    return requireStringArray(rawValue, section.input_name)
      .map((item) => {
        const condition = item.startsWith(canonicalPrefix)
          ? item.slice(canonicalPrefix.length)
          : item.startsWith(prefix)
            ? item.slice(prefix.length).trimStart()
            : item;
        return `- ${ensurePeriod(`${canonicalPrefix}${condition.replace(/\.$/u, "")}`)}`;
      })
      .join("\n");
  }
  if (kind === "label_list") {
    return requireStringArray(rawValue, section.input_name)
      .map((item, index) => `- ${forbidTerminalPunctuation(item, `${section.input_name}[${index}]`)}`)
      .join("\n");
  }
  if (kind === "classified_label_list" || kind === "classified_sentence_list") {
    const mapping = requireObject(rawValue, section.input_name);
    const allowedPrefixes = requireArray(section.allowed_prefixes, `${section.id}.allowed_prefixes`)
      .map((value) => requireString(value, `${section.id} allowed prefix`));
    const allowedKeys = new Map(allowedPrefixes.map((prefix) => [
      prefix.slice(0, -1).toLowerCase().replaceAll(" ", "_"),
      prefix,
    ]));
    const unknown = Object.keys(mapping).filter((key) => !allowedKeys.has(key));
    if (unknown.length > 0) throw new Error(`${section.input_name} contains unsupported keys: ${unknown.join(", ")}.`);
    const lines = [];
    for (const [key, prefix] of allowedKeys) {
      const values = mapping[key] === undefined ? [] : requireStringArray(mapping[key], `${section.input_name}.${key}`);
      values.forEach((item, index) => {
        const content = kind === "classified_sentence_list"
          ? ensurePeriod(item.replace(/\.$/u, ""))
          : forbidTerminalPunctuation(item, `${section.input_name}.${key}[${index}]`);
        lines.push(`- ${prefix} ${content}`);
      });
    }
    if (lines.length === 0) throw new Error(`${section.input_name} must contain at least one classified item.`);
    return lines.join("\n");
  }
  throw new Error(`Unsupported canonical body content_kind: ${kind}`);
}

/** @param {Record<string, unknown>} documentType @param {Record<string, unknown>} body @param {Record<string, unknown>} generatedValues */
function buildBodyText(documentType, body, generatedValues) {
  const sections = requireArray(documentType.body_sections, `${documentType.id}.body_sections`)
    .map((value) => requireObject(value, `${documentType.id} section`))
    .sort((left, right) => Number(left.order) - Number(right.order));
  const expectedInputNames = new Set(
    sections.filter((section) => section.content_kind !== "controlled_scalar_label")
      .map((section) => section.input_name),
  );
  for (const key of Object.keys(body)) {
    if (!expectedInputNames.has(key)) throw new Error(`${documentType.id} body contains unsupported section input ${key}.`);
  }

  const output = [`# ${generatedValues.id} — ${generatedValues.title}`, ""];
  for (const section of sections) {
    const generated = section.content_kind === "controlled_scalar_label";
    const hasValue = generated || Object.prototype.hasOwnProperty.call(body, section.input_name);
    if (!hasValue) {
      if (section.required) throw new Error(`${documentType.id} body is missing ${section.input_name}.`);
      continue;
    }
    const rawValue = generated ? null : body[section.input_name];
    if (!generated && !section.required && Array.isArray(rawValue) && rawValue.length === 0) continue;
    output.push(`## ${section.heading}`, "", renderSectionContent(section, rawValue, generatedValues), "");
  }
  return `${output.join("\n").replace(/\s*$/u, "")}\n`;
}

/** @param {Array<Record<string, unknown>>} fields @param {Record<string, unknown>} values */
function buildRecordBlock(fields, values) {
  const lines = [];
  for (const field of [...fields].sort((left, right) => Number(left.order) - Number(right.order))) {
    const name = requireString(field.name, "record field name");
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new Error(`Generated record is missing canonical field ${name}.`);
    }
    lines.push(`${lines.length === 0 ? "  -" : "   "} ${name}: ${yamlScalar(values[name])}`);
  }
  return `${lines.join("\n")}\n`;
}

/** @param {string} registryText @param {string} collectionName @param {string} recordBlock */
function appendRecord(registryText, collectionName, recordBlock) {
  const trimmed = registryText.replace(/\s*$/u, "\n");
  const escapedName = escapeRegExp(collectionName);
  const emptyExpression = new RegExp(`^${escapedName}:\\s*\\[\\]\\s*$`, "mu");
  if (emptyExpression.test(trimmed)) {
    return trimmed.replace(emptyExpression, `${collectionName}:\n${recordBlock.trimEnd()}`);
  }
  const expression = new RegExp(`^${escapedName}:\\s*$`, "mu");
  if (!expression.test(trimmed)) throw new Error(`Registry does not contain a ${collectionName}: section.`);
  return `${trimmed}${recordBlock}`;
}

/** @param {string} macroId */
function childDecisionRegistryText(macroId) {
  return `schema_version: 1\nregistry_id: ${macroId}-decisions-registry\nmacro_requirement_id: ${macroId}\n\ndecisions: []\n`;
}

/** @param {string} macroId */
function childRequirementRegistryText(macroId) {
  return `schema_version: 1\nregistry_id: ${macroId}-requirements-registry\nmacro_requirement_id: ${macroId}\n\nrequirements: []\n`;
}


function providerRecordContext(input, catalog) {
  const macroId = requireString(input.macro_requirement_id, "macro_requirement_id");
  const macro = getMacro(catalog, macroId);
  const decisionId = requireString(input.decision_id, "decision_id");
  const decision = getDecision(macro, decisionId);
  const requirements = requireArray(macro.requirements, `${macroId}.requirements`)
    .map((value) => requireObject(value, `${macroId} Requirement`));
  return { macroId, macro, decisionId, decision, requirements };
}

function parentModelId(documentType) {
  const parentField = getField(documentType, "parent_requirement_id");
  return requireString(
    parentField.parent_model_id,
    `${documentType.id}.parent_requirement_id.parent_model_id`,
  );
}

const defaultGovernedDocumentAuthoringProviders = Object.freeze([
  Object.freeze({
    model_id: "macro-requirement",
    required_request_fields: Object.freeze(["macro_requirement_type"]),
    validate_request({ input, documentType }) {
      const entry = validateControlledField(
        documentType,
        "macro_requirement_type",
        input.macro_requirement_type,
      );
      return { macro_requirement_type: entry.value };
    },
    plan({ input, documentType, macroRecords, recordValues }) {
      const prefix = "MR-";
      const id = `${prefix}${nextFourDigitSuffix(macroRecords, prefix)}`;
      const bodyPath = `docs/reference/project-model/body/macro-requirements/${id}_body.md`;
      const decisionsPath = `docs/reference/project-model/registers/decisions/${id}.decisions.registry.yml`;
      const requirementsPath = `docs/reference/project-model/registers/requirements/${id}.requirements.registry.yml`;
      Object.assign(recordValues, {
        id,
        macro_requirement_type: resolveControlledValue(
          getField(documentType, "macro_requirement_type"),
          input.macro_requirement_type,
        ).value,
        body_path: bodyPath,
        decisions_registry_path: decisionsPath,
        requirements_registry_path: requirementsPath,
      });
      return {
        id,
        registryPath: macroRegistryProjectPath,
        collectionName: "macro_requirements",
        extraChanges: [
          { projectPath: decisionsPath, mode: "create", text: childDecisionRegistryText(id) },
          { projectPath: requirementsPath, mode: "create", text: childRequirementRegistryText(id) },
        ],
      };
    },
  }),
  Object.freeze({
    model_id: "decision",
    required_request_fields: Object.freeze([
      "macro_requirement_id",
      "decision_type",
      "author",
    ]),
    validate_request({ input, catalog, documentType }) {
      const macroId = requireString(input.macro_requirement_id, "macro_requirement_id");
      getMacro(catalog, macroId);
      const decisionType = validateControlledField(
        documentType,
        "decision_type",
        input.decision_type,
      ).value;
      return {
        macro_requirement_id: macroId,
        decision_type: decisionType,
        author: requireSingleLine(input.author, "author"),
      };
    },
    plan({ input, catalog, documentType, today, recordValues }) {
      const macroId = requireString(input.macro_requirement_id, "macro_requirement_id");
      const macro = getMacro(catalog, macroId);
      const decisions = requireArray(macro.decisions, `${macroId}.decisions`)
        .map((value) => requireObject(value, `${macroId} Decision`));
      const prefix = "ADR-";
      const id = `${prefix}${nextFourDigitSuffix(decisions, prefix)}`;
      Object.assign(recordValues, {
        id,
        macro_requirement_id: macroId,
        decision_type: resolveControlledValue(
          getField(documentType, "decision_type"),
          input.decision_type,
        ).value,
        author: requireSingleLine(input.author, "author"),
        date: today,
        body_path: `docs/reference/project-model/body/decisions/${macroId}/${id}_body.md`,
      });
      return {
        id,
        registryPath: requireString(
          macro.decisions_registry_path,
          `${macroId}.decisions_registry_path`,
        ),
        collectionName: "decisions",
        extraChanges: [],
      };
    },
  }),
  Object.freeze({
    model_id: "functional-requirement",
    required_request_fields: Object.freeze([
      "macro_requirement_id",
      "decision_id",
    ]),
    validate_request({ input, catalog }) {
      const context = providerRecordContext(input, catalog);
      return {
        macro_requirement_id: context.macroId,
        decision_id: context.decisionId,
      };
    },
    plan({ input, catalog, documentType, recordValues }) {
      const context = providerRecordContext(input, catalog);
      const prefix = `${context.macroId}${context.decisionId}REQ-`;
      const id = `${prefix}${nextFourDigitSuffix(context.requirements, prefix)}`;
      Object.assign(recordValues, {
        id,
        macro_requirement_id: context.macroId,
        decision_id: context.decisionId,
        requirement_type: resolveControlledValue(
          getField(documentType, "requirement_type"),
          "",
        ).value,
        body_path: `docs/reference/project-model/body/requirements/${context.macroId}/${id}_body.md`,
      });
      return {
        id,
        registryPath: requireString(
          context.macro.requirements_registry_path,
          `${context.macroId}.requirements_registry_path`,
        ),
        collectionName: "requirements",
        extraChanges: [],
      };
    },
  }),
  Object.freeze({
    model_id: "governance-requirement",
    required_request_fields: Object.freeze([
      "macro_requirement_id",
      "decision_id",
      "parent_requirement_id",
    ]),
    validate_request({ input, catalog, documentType }) {
      const context = providerRecordContext(input, catalog);
      const parentId = requireString(
        input.parent_requirement_id,
        "parent_requirement_id",
      );
      const expectedParentModelId = parentModelId(documentType);
      const parent = requireArray(
        context.decision.requirements,
        `${context.macroId}/${context.decisionId}.requirements`,
      )
        .map((value) => requireObject(
          value,
          `${context.macroId}/${context.decisionId} Requirement`,
        ))
        .find(
          (entry) =>
            entry.id === parentId &&
            entry.model_id === expectedParentModelId,
        );
      if (!parent) {
        throw new Error(
          `${expectedParentModelId} parent ${parentId} does not belong to ${context.macroId}/${context.decisionId}.`,
        );
      }
      return {
        macro_requirement_id: context.macroId,
        decision_id: context.decisionId,
        parent_requirement_id: parentId,
      };
    },
    plan({ input, catalog, documentType, recordValues }) {
      const context = providerRecordContext(input, catalog);
      const parentId = requireString(
        input.parent_requirement_id,
        "parent_requirement_id",
      );
      const expectedParentModelId = parentModelId(documentType);
      const parent = context.requirements.find(
        (entry) =>
          entry.id === parentId &&
          entry.model_id === expectedParentModelId,
      );
      if (!parent) {
        throw new Error(
          `${expectedParentModelId} parent ${parentId} does not belong to ${context.macroId}/${context.decisionId}.`,
        );
      }
      const prefix = `${parentId}GOV-`;
      const id = `${prefix}${nextFourDigitSuffix(context.requirements, prefix)}`;
      Object.assign(recordValues, {
        id,
        macro_requirement_id: context.macroId,
        decision_id: context.decisionId,
        requirement_type: resolveControlledValue(
          getField(documentType, "requirement_type"),
          "",
        ).value,
        parent_requirement_id: parentId,
        body_path: `docs/reference/project-model/body/requirements/${context.macroId}/${id}_body.md`,
      });
      return {
        id,
        registryPath: requireString(
          context.macro.requirements_registry_path,
          `${context.macroId}.requirements_registry_path`,
        ),
        collectionName: "requirements",
        extraChanges: [],
      };
    },
  }),
]);

export const governedDocumentAuthoringProviders =
  defaultGovernedDocumentAuthoringProviders;

export const governedDocumentAuthoringProviderModelIds = Object.freeze(
  defaultGovernedDocumentAuthoringProviders.map((provider) => provider.model_id),
);

/**
 * Validates exact runtime authoring provider coverage for a canonical catalog.
 *
 * @param {Record<string, unknown>} catalog - Canonical authoring catalog.
 * @param {Array<Record<string, unknown>>} [providers] - Explicit provider catalog.
 * @returns {Array<Record<string, unknown>>} Deterministic coverage diagnostics.
 */
export function validateGovernedDocumentAuthoringProviderCoverage(
  catalog,
  providers = defaultGovernedDocumentAuthoringProviders,
) {
  const canonicalModelIds = requireArray(
    catalog.document_types,
    "catalog.document_types",
  ).map((entry) => requireString(entry?.id, "catalog document type id"));
  const providerModelIds = requireArray(providers, "authoring providers")
    .map((provider) => requireString(provider?.model_id, "authoring provider model_id"));
  return validateGovernedDocumentModelConsumerCoverage({
    consumerId: authoringProviderConsumerId,
    canonicalModelIds,
    providerModelIds,
    sourcePath: authoringCatalogSourcePath,
  });
}

function assertGovernedDocumentAuthoringProviderCoverage(catalog, providers) {
  const diagnostics = validateGovernedDocumentAuthoringProviderCoverage(
    catalog,
    providers,
  );
  if (diagnostics.length > 0) {
    throw new Error(
      diagnostics
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | "),
    );
  }
}

function resolveGovernedDocumentAuthoringProvider(
  catalog,
  documentTypeId,
  providers = defaultGovernedDocumentAuthoringProviders,
) {
  assertGovernedDocumentAuthoringProviderCoverage(catalog, providers);
  const matches = providers.filter(
    (provider) => provider.model_id === documentTypeId,
  );
  if (matches.length !== 1) {
    throw new Error(
      `Authoring provider resolution requires exactly one provider for ${documentTypeId}; found ${matches.length}.`,
    );
  }
  return matches[0];
}

/**
 * Validates one request through the explicit provider for its canonical model.
 *
 * @param {Record<string, unknown>} request - Authoring request.
 * @param {Record<string, unknown>} catalog - Canonical authoring catalog.
 * @param {{providers?: Array<Record<string, unknown>>}} [options] - Testable provider override.
 * @returns {Record<string, unknown>} Canonical validated request.
 */
export function validateGovernedDocumentAuthoringRequest(
  request,
  catalog,
  options = {},
) {
  const input = requireObject(request, "Governed document authoring request");
  const canonicalCatalog = requireObject(
    catalog,
    "Governed document authoring catalog",
  );
  if (canonicalCatalog.catalog_id !== "governed-document-authoring-catalog") {
    throw new Error(`Unsupported catalog_id: ${canonicalCatalog.catalog_id}`);
  }
  for (const key of Object.keys(input)) {
    if (generatedRequestFields.has(key)) {
      throw new Error(`Authoring request must not declare generated field ${key}.`);
    }
  }
  const documentTypeId = requireString(input.document_type, "document_type");
  const providers = options.providers ?? defaultGovernedDocumentAuthoringProviders;
  const provider = resolveGovernedDocumentAuthoringProvider(
    canonicalCatalog,
    documentTypeId,
    providers,
  );
  const documentType = getDocumentType(canonicalCatalog, documentTypeId);
  const requiredFields = [
    ...commonRequestFields,
    ...provider.required_request_fields,
  ];
  const allowedFields = new Set(requiredFields);
  for (const key of Object.keys(input)) {
    if (!allowedFields.has(key)) {
      throw new Error(`${documentTypeId} request contains unsupported field ${key}.`);
    }
  }
  for (const key of requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      throw new Error(`${documentTypeId} request is missing ${key}.`);
    }
  }
  const title = requireSingleLine(input.title, "title");
  const body = requireObject(input.body, "body");
  validateBodyShape(documentType, body);
  const providerValues = requireObject(
    provider.validate_request({
      input,
      catalog: canonicalCatalog,
      documentType,
    }),
    `${documentTypeId} provider validation result`,
  );
  return {
    document_type: documentTypeId,
    title,
    body,
    ...providerValues,
  };
}

/**
 * Creates a deterministic governed document plan without writing.
 *
 * @param {Record<string, unknown>} request - Authoring request.
 * @param {Record<string, unknown>} catalog - Canonical authoring catalog.
 * @param {{rootDir?: string, today?: string, providers?: Array<Record<string, unknown>>}} [options]
 * @returns {Record<string, unknown>}
 */
export function planGeneratedDocument(request, catalog, options = {}) {
  const canonicalCatalog = requireObject(
    catalog,
    "Governed document authoring catalog",
  );
  const providers = options.providers ?? defaultGovernedDocumentAuthoringProviders;
  const input = validateGovernedDocumentAuthoringRequest(
    request,
    canonicalCatalog,
    { providers },
  );
  const documentTypeId = requireString(input.document_type, "document_type");
  const documentType = getDocumentType(canonicalCatalog, documentTypeId);
  const provider = resolveGovernedDocumentAuthoringProvider(
    canonicalCatalog,
    documentTypeId,
    providers,
  );
  const title = requireSingleLine(input.title, "title");
  const body = requireObject(input.body, "body");
  const operationRoot = resolveRootDir(options);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(today)) {
    throw new Error("today must use YYYY-MM-DD.");
  }

  const statusField = getField(documentType, "status");
  const statusEntry = resolveControlledValue(statusField, "draft");
  const recordValues = { title, status: statusEntry.value };
  const macroRegistryAbsolute = resolveProjectPath(
    macroRegistryProjectPath,
    operationRoot,
  );
  const macroRegistry = requireObject(
    readGovernedYamlFile(macroRegistryAbsolute),
    macroRegistryProjectPath,
  );
  const macroRecords = requireArray(
    macroRegistry.macro_requirements,
    "macro_requirements",
  ).map((value) => requireObject(value, "Macro-requirement record"));

  const providerPlan = requireObject(
    provider.plan({
      input,
      catalog: canonicalCatalog,
      documentType,
      macroRecords,
      recordValues,
      today,
    }),
    `${documentTypeId} authoring provider plan`,
  );
  const id = requireString(providerPlan.id, `${documentTypeId} provider id`);
  const registryPath = requireString(
    providerPlan.registryPath,
    `${documentTypeId} provider registryPath`,
  );
  const collectionName = requireString(
    providerPlan.collectionName,
    `${documentTypeId} provider collectionName`,
  );
  const extraChanges = requireArray(
    providerPlan.extraChanges ?? [],
    `${documentTypeId} provider extraChanges`,
  );

  recordValues.id = id;
  const recordFields = requireArray(
    documentType.record_fields,
    `${documentTypeId}.record_fields`,
  ).map((value) => requireObject(value, `${documentTypeId} record field`));
  const bodyPath = requireString(recordValues.body_path, "generated body_path");
  const bodyText = buildBodyText(documentType, body, {
    id,
    title,
    statusEntry,
  });
  const recordBlock = buildRecordBlock(recordFields, recordValues);
  const registryAbsolute = resolveProjectPath(registryPath, operationRoot);
  if (!fs.existsSync(registryAbsolute)) {
    throw new Error(`Registry not found: ${registryPath}`);
  }
  const registryText = readText(fs, registryAbsolute);
  if (
    new RegExp(`^\\s*-?\\s*id:\\s*${escapeRegExp(id)}\\s*$`, "mu")
      .test(registryText)
  ) {
    throw new Error(`Generated id already exists in registry: ${id}`);
  }

  return {
    documentType: documentTypeId,
    id,
    registryPath,
    bodyPath,
    recordBlock,
    bodyText,
    changes: [
      {
        projectPath: registryPath,
        mode: "replace",
        text: appendRecord(registryText, collectionName, recordBlock),
      },
      { projectPath: bodyPath, mode: "create", text: bodyText },
      ...extraChanges,
    ],
  };
}

/** @param {Array<Record<string, unknown>>} changes @param {typeof fs} fileSystem @param {(() => void)|undefined} afterInstall */
function writeTextTransaction(changes, fileSystem, afterInstall) {
  const nonce = `${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
  const prepared = [];
  try {
    for (let index = 0; index < changes.length; index += 1) {
      const change = requireObject(changes[index], `change[${index}]`);
      const targetPath = requireString(change.targetPath, `change[${index}].targetPath`);
      const mode = requireString(change.mode, `change[${index}].mode`);
      const text = String(change.text ?? "");
      const exists = fileSystem.existsSync(targetPath);
      if (mode === "create" && exists) throw new Error(`Create-only target already exists: ${change.projectPath}`);
      if (mode === "replace" && !exists) throw new Error(`Replace target does not exist: ${change.projectPath}`);
      const directory = path.dirname(targetPath);
      fileSystem.mkdirSync(directory, { recursive: true });
      const temporaryPath = path.join(directory, `.${path.basename(targetPath)}.${nonce}.${index}.tmp`);
      const backupPath = path.join(directory, `.${path.basename(targetPath)}.${nonce}.${index}.bak`);
      fileSystem.writeFileSync(temporaryPath, text, { encoding: "utf8", flag: "wx" });
      prepared.push({ ...change, targetPath, temporaryPath, backupPath, hadOriginal: exists, backedUp: false, installed: false });
    }
    for (const entry of prepared) {
      if (entry.hadOriginal) {
        fileSystem.renameSync(entry.targetPath, entry.backupPath);
        entry.backedUp = true;
      }
    }
    for (const entry of prepared) {
      fileSystem.renameSync(entry.temporaryPath, entry.targetPath);
      entry.installed = true;
    }
    if (afterInstall !== undefined) {
      if (typeof afterInstall !== "function") throw new Error("afterInstall must be a function.");
      afterInstall();
    }
    for (const entry of prepared) {
      if (entry.backedUp && fileSystem.existsSync(entry.backupPath)) fileSystem.rmSync(entry.backupPath, { force: true });
    }
  } catch (error) {
    for (const entry of [...prepared].reverse()) {
      try {
        if (entry.installed && fileSystem.existsSync(entry.targetPath)) fileSystem.rmSync(entry.targetPath, { force: true });
        if (entry.backedUp && fileSystem.existsSync(entry.backupPath)) fileSystem.renameSync(entry.backupPath, entry.targetPath);
        if (fileSystem.existsSync(entry.temporaryPath)) fileSystem.rmSync(entry.temporaryPath, { force: true });
      } catch {
        // Preserve the original transaction error.
      }
    }
    throw new Error(`Cannot apply governed document transaction: ${error.message}`);
  }
}

/**
 * Atomically applies one generated governed-document plan.
 *
 * @param {Record<string, unknown>} plan
 * @param {{rootDir?: string, fileSystem?: typeof fs, afterInstall?: () => void}} [options]
 */
export function applyGeneratedDocument(plan, options = {}) {
  const validatedPlan = requireObject(plan, "Governed document plan");
  const operationRoot = resolveRootDir(options);
  const fileSystem = options.fileSystem ?? fs;
  const changes = requireArray(validatedPlan.changes, "Governed document plan changes")
    .map((value, index) => {
      const change = requireObject(value, `Governed document plan changes[${index}]`);
      const projectPath = requireString(change.projectPath, `changes[${index}].projectPath`);
      return {
        projectPath,
        targetPath: resolveProjectPath(projectPath, operationRoot),
        mode: requireString(change.mode, `changes[${index}].mode`),
        text: String(change.text ?? ""),
      };
    });
  writeTextTransaction(changes, fileSystem, options.afterInstall);
  return {
    documentType: requireString(validatedPlan.documentType, "plan.documentType"),
    id: requireString(validatedPlan.id, "plan.id"),
    registryPath: requireString(validatedPlan.registryPath, "plan.registryPath"),
    bodyPath: requireString(validatedPlan.bodyPath, "plan.bodyPath"),
    producedArtifacts: changes.map((change) => change.projectPath),
  };
}

function helpText() {
  return `This module is the importable governed-document authoring transaction core.\n\nUse:\n  node tools/MR-0002/run-governed-document-authoring.mjs --preview --request path/to/file.governed-document-authoring.yml\n  node tools/MR-0002/run-governed-document-authoring.mjs --create --request path/to/file.governed-document-authoring.yml`;
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) {
  console.log(helpText());
}
