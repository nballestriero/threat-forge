import fs from "node:fs";
import path from "node:path";

import {
  canonicalGovernedDocumentModelIds,
  loadGovernedDocumentModelSourceSet,
} from "./governed-document-model-sources.mjs";
import { readGovernedYamlFile } from "./governed-yaml.mjs";
import {
  loadSecurityRequirementValidationSourceSet,
  validateSecurityRequirementModel,
} from "./security-requirement-model-validation.mjs";
import {
  resolveGovernedDocumentCrossModelProviders,
} from "./governed-document-cross-model-providers.mjs";
import {
  buildSecurityRequirementAuthoringEditorSchema,
  validateSecurityRequirementAuthoringEditorTasks,
} from "./security-requirement-authoring-editor-assistance.mjs";
import {
  resolveSecurityRequirementAuthoringSchemaProviders,
} from "./security-requirement-authoring-schema-provider.mjs";
import {
  createSecurityRequirementAuthoringReferenceService,
  resolveGovernedDocumentAuthoringProviders,
} from "./security-requirement-authoring-provider.mjs";
import {
  governedMarkdownAssistanceModelRuleSets,
} from "../../MR-0002/lib/governed-markdown-assistance.mjs";
import {
  buildGovernedDocumentAuthoringSchema,
  governedDocumentAuthoringSchemaProviders,
} from "../../MR-0002/build-governed-document-authoring-schema.mjs";
import {
  loadGovernedDocumentAuthoringCatalog,
} from "../../MR-0002/run-governed-document-authoring.mjs";
import {
  resolveTargetProjectModelValidationProviders,
} from "../../MR-0004/run-target-project-check.mjs";

/**
 * @file Security Requirement atomic canonical activation verification core.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Builds and validates one read-only snapshot after canonical activation. The
 * snapshot proves that source registration, Requirement dispatch, complete and
 * cross-model validation, governed references, runtime authoring, editor schema,
 * Target Project validation/authoring and generic Markdown assistance all expose
 * exactly one compatible Security Requirement provider. It performs no source
 * mutation and creates no Security Requirement record.
 */

const securityModelId = "security-requirement";
const securityProfileId = "security-requirement-body";
const securityRequirementType = "security";

export const securityRequirementAtomicActivationRuleIds = Object.freeze({
  activationState: "security-requirement.activation.atomic.state",
  activeInventory: "security-requirement.activation.atomic.inventory",
  registryVariant: "security-requirement.activation.atomic.registry-variant",
  taxonomy: "security-requirement.activation.atomic.taxonomy",
  providerCoverage: "security-requirement.activation.atomic.provider-coverage",
  providerIdentity: "security-requirement.activation.atomic.provider-identity",
  completeModel: "security-requirement.activation.atomic.complete-model",
  genericSchema: "security-requirement.activation.atomic.generic-schema",
  dedicatedSchema: "security-requirement.activation.atomic.dedicated-schema",
  editorTasks: "security-requirement.activation.atomic.editor-tasks",
  recordCreation: "security-requirement.activation.atomic.record-creation",
});

export const securityRequirementAtomicActivationProviderIds = Object.freeze([
  "complete-model-validator",
  "cross-model-provider",
  "governed-reference-service",
  "runtime-authoring-provider",
  "editor-schema-provider",
  "target-project-validator-provider",
  "target-project-authoring-provider",
  "governed-markdown-assistance-provider",
]);

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function array(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function text(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${label} must be a non-empty string.`);
  return normalized;
}

function diagnostic(ruleId, message) {
  return Object.freeze({
    rule_id: ruleId,
    severity: "error",
    message,
  });
}

function sorted(values) {
  return [...values].map(String).sort(compare);
}

function count(values, expected) {
  return values.filter((value) => value === expected).length;
}

function parseJsonc(value) {
  const source = String(value ?? "").replace(/^\uFEFF/u, "");
  let cleaned = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (current === "\n") {
        lineComment = false;
        cleaned += "\n";
      } else cleaned += " ";
      continue;
    }
    if (blockComment) {
      if (current === "*" && next === "/") {
        blockComment = false;
        cleaned += "  ";
        index += 1;
      } else cleaned += current === "\n" ? "\n" : " ";
      continue;
    }
    if (inString) {
      cleaned += current;
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === '"') inString = false;
      continue;
    }
    if (current === '"') {
      inString = true;
      cleaned += current;
      continue;
    }
    if (current === "/" && next === "/") {
      lineComment = true;
      cleaned += "  ";
      index += 1;
      continue;
    }
    if (current === "/" && next === "*") {
      blockComment = true;
      cleaned += "  ";
      index += 1;
      continue;
    }
    cleaned += current;
  }
  if (blockComment) throw new Error("JSONC contains an unterminated block comment.");
  let withoutTrailing = "";
  inString = false;
  escaped = false;
  for (let index = 0; index < cleaned.length; index += 1) {
    const current = cleaned[index];
    if (inString) {
      withoutTrailing += current;
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === '"') inString = false;
      continue;
    }
    if (current === '"') {
      inString = true;
      withoutTrailing += current;
      continue;
    }
    if (current === ",") {
      let lookahead = index + 1;
      while (/\s/u.test(cleaned[lookahead] ?? "")) lookahead += 1;
      if (cleaned[lookahead] === "}" || cleaned[lookahead] === "]") continue;
    }
    withoutTrailing += current;
  }
  return object(JSON.parse(withoutTrailing), "JSONC document");
}

function providerProjection(id, modelIds, ready = true) {
  return Object.freeze({
    id,
    model_ids: Object.freeze(sorted(modelIds)),
    ready: ready === true,
  });
}

function activeRequirementVariant(sourceSet) {
  const profile = sourceSet.profiles.find(
    (entry) => entry.value?.profile_id === "requirement-registry",
  )?.value;
  return profile?.record_variants?.find(
    (entry) => entry.model_id === securityModelId,
  ) ?? null;
}

function activeRequirementTypes(rootDir) {
  const taxonomy = readGovernedYamlFile(
    path.join(
      rootDir,
      "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
    ),
  );
  const valueSet = taxonomy.field_value_sets?.find(
    (entry) => entry.id === "FIELD-VALUE-SET-0010",
  );
  return (valueSet?.values ?? []).map((entry) => String(entry.value));
}

function countSecurityRequirementRecords(rootDir) {
  const directory = path.join(
    rootDir,
    "docs/reference/project-model/registers/requirements",
  );
  if (!fs.existsSync(directory)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !/^MR-\d{4}\.requirements\.registry\.yml$/u.test(entry.name)
    ) {
      continue;
    }
    const registry = readGovernedYamlFile(path.join(directory, entry.name));
    count += (registry.requirements ?? []).filter(
      (record) => String(record?.requirement_type ?? "") === securityRequirementType,
    ).length;
  }
  return count;
}

/**
 * Builds one repository-derived atomic activation snapshot without mutation.
 *
 * @param {{rootDir: string}} options Repository root.
 * @returns {Record<string, unknown>} Read-only activation snapshot.
 */
export function buildSecurityRequirementAtomicActivationSnapshot(options = {}) {
  const rootDir = path.resolve(text(options.rootDir, "rootDir"));
  const sourceSet = loadGovernedDocumentModelSourceSet({ rootDir });
  const activeModelIds = canonicalGovernedDocumentModelIds(sourceSet);
  const activeProfileIds = sourceSet.index.value.representation_profiles.map(
    (entry) => String(entry.id),
  );
  const loadedSecurity = loadSecurityRequirementValidationSourceSet({ rootDir });
  const completeModel = validateSecurityRequirementModel({ rootDir });
  const crossModelProviders = resolveGovernedDocumentCrossModelProviders({
    rootDir,
    sourceSet,
  });
  const activeCatalog = loadGovernedDocumentAuthoringCatalog({ rootDir });
  const referenceService = createSecurityRequirementAuthoringReferenceService({
    rootDir,
  });
  const runtimeProviders = resolveGovernedDocumentAuthoringProviders({
    rootDir,
    catalog: activeCatalog,
    referenceService,
  });
  const schemaProviders = resolveSecurityRequirementAuthoringSchemaProviders({
    catalog: activeCatalog,
    providers: governedDocumentAuthoringSchemaProviders,
    referenceService,
  });
  const genericSchema = buildGovernedDocumentAuthoringSchema(activeCatalog, {
    providers: schemaProviders,
  });
  const dedicatedSchema = buildSecurityRequirementAuthoringEditorSchema({
    rootDir,
    activeCatalog,
    referenceService,
  });
  const targetValidationProviders =
    resolveTargetProjectModelValidationProviders(sourceSet);
  const tasksPath = path.join(rootDir, ".vscode", "tasks.json");
  const tasks = parseJsonc(fs.readFileSync(tasksPath, "utf8"));
  const taskRouting = validateSecurityRequirementAuthoringEditorTasks(tasks, {
    activationState: "active",
  });
  const variant = activeRequirementVariant(sourceSet);
  const requirementTypes = activeRequirementTypes(rootDir);
  const markdownModelIds = Object.keys(
    governedMarkdownAssistanceModelRuleSets,
  );

  const providers = [
    providerProjection(
      "complete-model-validator",
      completeModel.activation_state === "active" ? [securityModelId] : [],
      completeModel.diagnostics.length === 0,
    ),
    providerProjection(
      "cross-model-provider",
      crossModelProviders.map((provider) => provider.model_id),
    ),
    providerProjection(
      "governed-reference-service",
      ["functional_requirement", "common_analysis_finding"],
      typeof referenceService.analyzePayload === "function" &&
        typeof referenceService.listEligibleCandidates === "function",
    ),
    providerProjection(
      "runtime-authoring-provider",
      runtimeProviders.map((provider) => provider.model_id),
    ),
    providerProjection(
      "editor-schema-provider",
      schemaProviders.map((provider) => provider.model_id),
    ),
    providerProjection(
      "target-project-validator-provider",
      targetValidationProviders.map((provider) => provider.model_id),
    ),
    providerProjection(
      "target-project-authoring-provider",
      runtimeProviders.map((provider) => provider.model_id),
    ),
    providerProjection(
      "governed-markdown-assistance-provider",
      markdownModelIds,
    ),
  ];

  return {
    activation_state: loadedSecurity.activation_state,
    active_model_ids: sorted(activeModelIds),
    active_profile_ids: sorted(activeProfileIds),
    requirement_variant_ids: variant ? [String(variant.model_id)] : [],
    requirement_type_values: sorted(requirementTypes),
    complete_model_diagnostics: structuredClone(completeModel.diagnostics),
    runtime_authoring_model_ids: sorted(
      runtimeProviders.map((provider) => provider.model_id),
    ),
    schema_authoring_model_ids: sorted(
      schemaProviders.map((provider) => provider.model_id),
    ),
    generic_schema_model_ids: sorted(
      genericSchema.oneOf.map(
        (branch) => branch.properties?.document_type?.const,
      ),
    ),
    dedicated_schema_activation_state:
      dedicatedSchema["x-threatforge"]?.activation_state,
    dedicated_schema_create_available:
      dedicatedSchema["x-threatforge"]?.create_available,
    security_create_task_present: taskRouting.createTaskPresent,
    target_validation_model_ids: sorted(
      targetValidationProviders.map((provider) => provider.model_id),
    ),
    markdown_assistance_model_ids: sorted(markdownModelIds),
    security_requirement_record_count: countSecurityRequirementRecords(rootDir),
    providers,
  };
}

/**
 * Validates an atomic activation snapshot through stable deterministic rules.
 *
 * @param {Record<string, unknown>} value Snapshot.
 * @returns {{valid: boolean, diagnostics: Array<Record<string, unknown>>, provider_count: number}}
 */
export function validateSecurityRequirementAtomicActivationSnapshot(value) {
  const snapshot = object(value, "activation snapshot");
  const diagnostics = [];
  const activeModelIds = array(
    snapshot.active_model_ids,
    "active_model_ids",
  ).map(String);
  const activeProfileIds = array(
    snapshot.active_profile_ids,
    "active_profile_ids",
  ).map(String);
  const variantIds = array(
    snapshot.requirement_variant_ids,
    "requirement_variant_ids",
  ).map(String);
  const requirementTypes = array(
    snapshot.requirement_type_values,
    "requirement_type_values",
  ).map(String);
  const providers = array(snapshot.providers, "providers").map((entry) =>
    object(entry, "provider"),
  );

  if (snapshot.activation_state !== "active") {
    diagnostics.push(
      diagnostic(
        securityRequirementAtomicActivationRuleIds.activationState,
        `Security Requirement activation state must be active; found ${String(snapshot.activation_state)}.`,
      ),
    );
  }
  if (
    count(activeModelIds, securityModelId) !== 1 ||
    count(activeProfileIds, securityProfileId) !== 1
  ) {
    diagnostics.push(
      diagnostic(
        securityRequirementAtomicActivationRuleIds.activeInventory,
        "Canonical model and representation-profile inventories must each expose Security Requirement exactly once.",
      ),
    );
  }
  if (count(variantIds, securityModelId) !== 1) {
    diagnostics.push(
      diagnostic(
        securityRequirementAtomicActivationRuleIds.registryVariant,
        "The shared Requirement registry profile must expose exactly one Security Requirement variant.",
      ),
    );
  }
  if (count(requirementTypes, securityRequirementType) !== 1) {
    diagnostics.push(
      diagnostic(
        securityRequirementAtomicActivationRuleIds.taxonomy,
        "The controlled requirement_type taxonomy must expose security exactly once.",
      ),
    );
  }

  const expectedProviderIds = sorted(
    securityRequirementAtomicActivationProviderIds,
  );
  const actualProviderIds = sorted(providers.map((entry) => entry.id));
  if (JSON.stringify(actualProviderIds) !== JSON.stringify(expectedProviderIds)) {
    diagnostics.push(
      diagnostic(
        securityRequirementAtomicActivationRuleIds.providerCoverage,
        `Atomic activation providers must be exactly: ${expectedProviderIds.join(", ")}. Found: ${actualProviderIds.join(", ")}.`,
      ),
    );
  }
  for (const provider of providers) {
    const modelIds = array(provider.model_ids, `${provider.id}.model_ids`).map(String);
    if (provider.ready !== true) {
      diagnostics.push(
        diagnostic(
          securityRequirementAtomicActivationRuleIds.providerCoverage,
          `Provider ${provider.id} is not ready.`,
        ),
      );
    }
    if (
      provider.id !== "governed-reference-service" &&
      count(modelIds, securityModelId) !== 1
    ) {
      diagnostics.push(
        diagnostic(
          securityRequirementAtomicActivationRuleIds.providerIdentity,
          `Provider ${provider.id} must expose Security Requirement exactly once.`,
        ),
      );
    }
  }
  if (array(snapshot.complete_model_diagnostics, "complete_model_diagnostics").length) {
    diagnostics.push(
      diagnostic(
        securityRequirementAtomicActivationRuleIds.completeModel,
        "The active Security Requirement complete-model validator produced diagnostics.",
      ),
    );
  }
  for (const [field, ruleId] of [
    ["runtime_authoring_model_ids", securityRequirementAtomicActivationRuleIds.providerIdentity],
    ["schema_authoring_model_ids", securityRequirementAtomicActivationRuleIds.providerIdentity],
    ["target_validation_model_ids", securityRequirementAtomicActivationRuleIds.providerIdentity],
    ["markdown_assistance_model_ids", securityRequirementAtomicActivationRuleIds.providerIdentity],
  ]) {
    const values = array(snapshot[field], field).map(String);
    if (count(values, securityModelId) !== 1) {
      diagnostics.push(
        diagnostic(ruleId, `${field} must expose Security Requirement exactly once.`),
      );
    }
  }
  const genericSchemaModels = array(
    snapshot.generic_schema_model_ids,
    "generic_schema_model_ids",
  ).map(String);
  if (count(genericSchemaModels, securityModelId) !== 1) {
    diagnostics.push(
      diagnostic(
        securityRequirementAtomicActivationRuleIds.genericSchema,
        "The generic governed authoring schema must expose Security Requirement exactly once.",
      ),
    );
  }
  if (
    snapshot.dedicated_schema_activation_state !== "active" ||
    snapshot.dedicated_schema_create_available !== true
  ) {
    diagnostics.push(
      diagnostic(
        securityRequirementAtomicActivationRuleIds.dedicatedSchema,
        "The dedicated Security Requirement schema must advertise active creation availability.",
      ),
    );
  }
  if (snapshot.security_create_task_present !== true) {
    diagnostics.push(
      diagnostic(
        securityRequirementAtomicActivationRuleIds.editorTasks,
        "The active Security Requirement create task is missing.",
      ),
    );
  }
  if (Number(snapshot.security_requirement_record_count) !== 0) {
    diagnostics.push(
      diagnostic(
        securityRequirementAtomicActivationRuleIds.recordCreation,
        "Canonical activation must not create a Security Requirement record.",
      ),
    );
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics: diagnostics.sort((left, right) =>
      compare(`${left.rule_id}|${left.message}`, `${right.rule_id}|${right.message}`),
    ),
    provider_count: providers.length,
  };
}
