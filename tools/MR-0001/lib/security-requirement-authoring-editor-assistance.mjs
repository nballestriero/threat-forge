import {
  buildGovernedDocumentAuthoringSchema,
} from "../../MR-0002/build-governed-document-authoring-schema.mjs";
import {
  createSecurityRequirementAuthoringSchemaProvider,
  listSecurityRequirementFindingCandidates,
  listSecurityRequirementFunctionalParents,
} from "./security-requirement-authoring-schema-provider.mjs";
import {
  buildSecurityRequirementAuthoringCatalog,
  createSecurityRequirementAuthoringReferenceService,
} from "./security-requirement-authoring-provider.mjs";
import {
  loadGovernedDocumentAuthoringCatalog,
} from "../../MR-0002/run-governed-document-authoring.mjs";

/**
 * @file Security Requirement activation-candidate editor assistance projection.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0001
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Projects one dedicated YAML authoring schema and one preview-only VS Code task
 * from the inactive Security Requirement authoring candidate. Functional parent
 * and accepted Common Finding proposals are obtained through the same canonical
 * catalog and governed reference service used by the authoring provider. No
 * Security Requirement create task is exposed before canonical activation.
 */

export const securityRequirementAuthoringEditorRuleIds = Object.freeze({
  schema: "security-requirement.authoring.editor.schema",
  parent: "security-requirement.authoring.editor.parent",
  finding: "security-requirement.authoring.editor.finding",
  routing: "security-requirement.authoring.editor.routing",
  activation: "security-requirement.authoring.editor.activation",
  materialization: "security-requirement.authoring.editor.materialization",
});

export const securityRequirementAuthoringSchemaProjectPath =
  ".vscode/schemas/security-requirement-authoring.schema.json";
export const securityRequirementAuthoringSchemaAssociationKey =
  `./${securityRequirementAuthoringSchemaProjectPath}`;
export const securityRequirementAuthoringRequestGlob =
  "**/*.security-requirement-authoring.yml";
export const securityRequirementAuthoringPreviewTaskLabel =
  "ThreatForge: preview Security Requirement authoring";
export const securityRequirementAuthoringCreateTaskLabel =
  "ThreatForge: create Security Requirement authoring";

const securityModelId = "security-requirement";

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function failure(ruleId, message) {
  const error = new Error(`[${ruleId}] ${message}`);
  error.rule_id = ruleId;
  return error;
}

function object(value, label, ruleId = securityRequirementAuthoringEditorRuleIds.schema) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw failure(ruleId, `${label} must be an object.`);
  }
  return value;
}

function array(value, label, ruleId = securityRequirementAuthoringEditorRuleIds.schema) {
  if (!Array.isArray(value)) {
    throw failure(ruleId, `${label} must be an array.`);
  }
  return value;
}

function text(value, label, ruleId = securityRequirementAuthoringEditorRuleIds.schema) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw failure(ruleId, `${label} must be a non-empty string.`);
  return normalized;
}

/**
 * Builds the deterministic dedicated Security Requirement authoring schema.
 *
 * @param {{
 *   rootDir: string,
 *   activeCatalog?: Record<string, unknown>,
 *   referenceService?: Record<string, unknown>,
 *   loadedSourceSet?: Record<string, unknown>,
 *   loadActiveCatalog?: Function,
 *   createReferenceService?: Function
 * }} input Projection context.
 * @returns {Record<string, unknown>} JSON Schema with activation metadata.
 */
export function buildSecurityRequirementAuthoringEditorSchema(input) {
  const rootDir = text(input?.rootDir, "rootDir");
  const loadActiveCatalog =
    input?.loadActiveCatalog ?? loadGovernedDocumentAuthoringCatalog;
  const activeCatalog = input?.activeCatalog ?? loadActiveCatalog({ rootDir });
  const projected = buildSecurityRequirementAuthoringCatalog({
    rootDir,
    activeCatalog,
    loadedSourceSet: input?.loadedSourceSet,
  });
  const createReferenceService =
    input?.createReferenceService ??
    createSecurityRequirementAuthoringReferenceService;
  const referenceService = input?.referenceService ??
    createReferenceService({ rootDir });
  const candidateDocumentType = array(
    projected.catalog.document_types,
    "candidate document types",
  ).find((entry) => entry.id === securityModelId);
  if (!candidateDocumentType) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.schema,
      "Security Requirement candidate document type is missing.",
    );
  }
  const dedicatedCatalog = {
    ...structuredClone(projected.catalog),
    document_types: [structuredClone(candidateDocumentType)],
  };
  const schema = buildGovernedDocumentAuthoringSchema(dedicatedCatalog, {
    providers: [createSecurityRequirementAuthoringSchemaProvider(referenceService)],
  });
  const branch = array(schema.oneOf, "schema.oneOf")[0];
  const parentCount = listSecurityRequirementFunctionalParents(
    dedicatedCatalog.macro_requirements,
  ).length;
  let findingCandidateCount = 0;
  for (const parent of listSecurityRequirementFunctionalParents(
    dedicatedCatalog.macro_requirements,
  )) {
    findingCandidateCount += listSecurityRequirementFindingCandidates(
      referenceService,
      parent,
    ).length;
  }
  schema.$id =
    "urn:threatforge:schema:security-requirement-authoring-request:1";
  schema.title = "ThreatForge Security Requirement authoring request";
  schema.description =
    "Activation-candidate request for previewing one methodology-neutral Security Requirement. Create remains unavailable until atomic canonical activation.";
  branch.title = "Security Requirement";
  schema["x-threatforge"] = {
    ...schema["x-threatforge"],
    schema_id: "security-requirement-authoring-request-schema",
    model_id: securityModelId,
    activation_state: projected.activation_state,
    request_suffix: ".security-requirement-authoring.yml",
    create_available: projected.activation_state === "active",
    preview_available: true,
    scaffold_sources_checked: [...projected.scaffold_sources_checked],
    functional_parent_candidates: parentCount,
    accepted_finding_candidates: findingCandidateCount,
    completion_sources: [
      "governed-document-authoring-catalog",
      "functional-requirement-registry-reference-source",
      "common-analysis-finding-reference-source",
      "common-analysis-finding-accepted-state",
    ],
  };
  validateSecurityRequirementAuthoringEditorSchema(schema);
  return schema;
}

/**
 * Validates the dedicated schema projection without executing an editor.
 *
 * @param {Record<string, unknown>} schema Candidate schema.
 * @returns {{activation_state: string, parent_candidates: number, finding_candidates: number}}
 */
export function validateSecurityRequirementAuthoringEditorSchema(schema) {
  const value = object(schema, "Security Requirement authoring schema");
  if (
    value.$id !==
    "urn:threatforge:schema:security-requirement-authoring-request:1"
  ) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.schema,
      "Security Requirement authoring schema has an unexpected $id.",
    );
  }
  const branches = array(value.oneOf, "schema.oneOf");
  if (branches.length !== 1) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.schema,
      `Dedicated Security Requirement schema must contain exactly one branch; found ${branches.length}.`,
    );
  }
  const branch = object(branches[0], "Security Requirement schema branch");
  const properties = object(branch.properties, "Security Requirement properties");
  if (properties.document_type?.const !== securityModelId) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.schema,
      "Security Requirement schema branch must require document_type security-requirement.",
    );
  }
  const bodyProperties = object(
    object(properties.body, "body schema").properties,
    "body properties",
  );
  if (
    Object.prototype.hasOwnProperty.call(
      bodyProperties,
      "parent_functional_requirement",
    ) ||
    Object.prototype.hasOwnProperty.call(bodyProperties, "finding_derivation")
  ) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.schema,
      "Generated parent and Finding body sections must not be authored in the request schema.",
    );
  }
  const metadata = object(value["x-threatforge"], "schema x-threatforge");
  const activationState = text(
    metadata.activation_state,
    "activation_state",
    securityRequirementAuthoringEditorRuleIds.activation,
  );
  if (activationState === "inactive" && metadata.create_available !== false) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.activation,
      "Inactive Security Requirement schema must advertise create_available false.",
    );
  }
  const parentCandidates = Number(metadata.functional_parent_candidates);
  const findingCandidates = Number(metadata.accepted_finding_candidates);
  if (!Number.isInteger(parentCandidates) || parentCandidates < 0) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.parent,
      "Functional parent candidate count must be a non-negative integer.",
    );
  }
  if (!Number.isInteger(findingCandidates) || findingCandidates < 0) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.finding,
      "Accepted Finding candidate count must be a non-negative integer.",
    );
  }
  return {
    activation_state: activationState,
    parent_candidates: parentCandidates,
    finding_candidates: findingCandidates,
  };
}

/**
 * Merges the dedicated schema association into VS Code settings.
 *
 * @param {Record<string, unknown>} settings Existing settings.
 * @returns {Record<string, unknown>} Detached merged settings.
 */
export function mergeSecurityRequirementAuthoringEditorSettings(settings) {
  const existing = object(
    settings,
    "VS Code settings",
    securityRequirementAuthoringEditorRuleIds.routing,
  );
  const schemas = existing["yaml.schemas"] === undefined
    ? {}
    : object(
      existing["yaml.schemas"],
      "settings.yaml.schemas",
      securityRequirementAuthoringEditorRuleIds.routing,
    );
  return {
    ...existing,
    "yaml.schemas": {
      ...schemas,
      [securityRequirementAuthoringSchemaAssociationKey]: [
        securityRequirementAuthoringRequestGlob,
      ],
    },
  };
}

/**
 * Validates the dedicated Security schema association.
 *
 * @param {Record<string, unknown>} settings VS Code settings.
 * @returns {{schemaAssociationKey: string, fileGlob: string}}
 */
export function validateSecurityRequirementAuthoringEditorSettings(settings) {
  const schemas = object(
    object(
      settings,
      "VS Code settings",
      securityRequirementAuthoringEditorRuleIds.routing,
    )["yaml.schemas"],
    "settings.yaml.schemas",
    securityRequirementAuthoringEditorRuleIds.routing,
  );
  const association = array(
    schemas[securityRequirementAuthoringSchemaAssociationKey],
    `settings.yaml.schemas[${securityRequirementAuthoringSchemaAssociationKey}]`,
    securityRequirementAuthoringEditorRuleIds.routing,
  );
  if (
    association.length !== 1 ||
    association[0] !== securityRequirementAuthoringRequestGlob
  ) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.routing,
      "Security Requirement authoring schema association is stale.",
    );
  }
  return {
    schemaAssociationKey: securityRequirementAuthoringSchemaAssociationKey,
    fileGlob: securityRequirementAuthoringRequestGlob,
  };
}

/**
 * Builds the preview-only Security Requirement VS Code task.
 *
 * @returns {Readonly<Record<string, unknown>>} Generated task.
 */
export function buildSecurityRequirementAuthoringPreviewTask() {
  return Object.freeze({
    label: securityRequirementAuthoringPreviewTaskLabel,
    type: "process",
    command: "node",
    args: Object.freeze([
      "tools/MR-0002/run-security-requirement-authoring.mjs",
      "--preview",
      "--request",
      "${relativeFile}",
    ]),
    options: Object.freeze({ cwd: "${workspaceFolder}" }),
    problemMatcher: Object.freeze([]),
    presentation: Object.freeze({
      reveal: "always",
      panel: "shared",
      clear: true,
      focus: true,
    }),
  });
}

/**
 * Validates preview-only routing and absence of premature create exposure.
 *
 * @param {Record<string, unknown>} tasks VS Code task document.
 * @returns {{previewTask: string, createTaskAbsent: boolean}}
 */
export function validateSecurityRequirementAuthoringEditorTasks(tasks) {
  const values = array(
    object(
      tasks,
      "VS Code tasks",
      securityRequirementAuthoringEditorRuleIds.routing,
    ).tasks,
    "tasks.tasks",
    securityRequirementAuthoringEditorRuleIds.routing,
  );
  const byLabel = new Map();
  for (const value of values) {
    const task = object(
      value,
      "VS Code task",
      securityRequirementAuthoringEditorRuleIds.routing,
    );
    const label = text(
      task.label,
      "VS Code task label",
      securityRequirementAuthoringEditorRuleIds.routing,
    );
    if (byLabel.has(label)) {
      throw failure(
        securityRequirementAuthoringEditorRuleIds.routing,
        `Duplicate VS Code task label: ${label}.`,
      );
    }
    byLabel.set(label, task);
  }
  const expected = buildSecurityRequirementAuthoringPreviewTask();
  const preview = byLabel.get(expected.label);
  if (!preview || JSON.stringify(preview) !== JSON.stringify(expected)) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.routing,
      "Security Requirement preview task is missing or stale.",
    );
  }
  if (byLabel.has(securityRequirementAuthoringCreateTaskLabel)) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.activation,
      "Security Requirement create task must not be exposed while the model is inactive.",
    );
  }
  return {
    previewTask: expected.label,
    createTaskAbsent: true,
  };
}
