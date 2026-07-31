import {
  buildGovernedDocumentAuthoringSchema,
} from "../../MR-0002/build-governed-document-authoring-schema.mjs";
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
const functionalModelId = "functional-requirement";
const functionalEntityType = "functional_requirement";
const findingEntityType = "common_analysis_finding";

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

function enumProjection(entries, getValue, getDescription, ruleId) {
  const ordered = [...entries].sort((left, right) =>
    compare(getValue(left), getValue(right)),
  );
  const values = ordered.map(getValue);
  if (new Set(values).size !== values.length) {
    throw failure(ruleId, `Duplicate editor completion value: ${values.join(", ")}.`);
  }
  const descriptions = ordered.map(getDescription);
  return {
    type: "string",
    enum: values,
    markdownEnumDescriptions: descriptions,
    "x-threatforge-enum-metadata": values.map((value, index) => ({
      value,
      description: descriptions[index],
    })),
  };
}

function eligibleCandidateProjection(
  entries,
  getValue,
  getDescription,
  ruleId,
  emptyDescription,
) {
  if (entries.length === 0) {
    return {
      type: "string",
      not: {},
      description: emptyDescription,
      "x-threatforge-enum-metadata": [],
    };
  }
  return enumProjection(entries, getValue, getDescription, ruleId);
}

function fieldByName(documentType, fieldName) {
  const field = array(
    documentType.record_fields,
    `${documentType.id}.record_fields`,
  ).find((entry) => String(entry?.name ?? "") === fieldName);
  if (!field) {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.schema,
      `${documentType.id} has no canonical field ${fieldName}.`,
    );
  }
  return object(field, `${documentType.id}.${fieldName}`);
}

function functionalParents(macros) {
  const parents = [];
  const seen = new Set();
  for (const macroValue of macros) {
    const macro = object(macroValue, "Macro-requirement");
    const macroId = text(macro.id, "Macro-requirement id");
    for (const decisionValue of array(macro.decisions, `${macroId}.decisions`)) {
      const decision = object(decisionValue, `${macroId} Decision`);
      const decisionId = text(decision.id, `${macroId} Decision id`);
      for (const requirementValue of array(
        decision.requirements,
        `${macroId}/${decisionId}.requirements`,
      )) {
        const requirement = object(
          requirementValue,
          `${macroId}/${decisionId} Requirement`,
        );
        if (String(requirement.model_id ?? "") !== functionalModelId) continue;
        const id = text(
          requirement.id,
          "Functional Requirement id",
          securityRequirementAuthoringEditorRuleIds.parent,
        );
        if (seen.has(id)) {
          throw failure(
            securityRequirementAuthoringEditorRuleIds.parent,
            `Functional Requirement parent resolves more than once: ${id}.`,
          );
        }
        seen.add(id);
        parents.push({
          ...structuredClone(requirement),
          macro_requirement_id: macroId,
          decision_id: decisionId,
          macro_title: String(macro.title ?? ""),
          decision_title: String(decision.title ?? ""),
        });
      }
    }
  }
  return parents.sort((left, right) => compare(left.id, right.id));
}

function canonicalFindingCandidates(referenceService, parent) {
  if (typeof referenceService?.listEligibleCandidates !== "function") {
    throw failure(
      securityRequirementAuthoringEditorRuleIds.finding,
      "Security editor assistance requires governed candidate discovery.",
    );
  }
  const candidates = referenceService.listEligibleCandidates({
    allowedEntityTypes: [findingEntityType],
    currentDocument: {
      model_id: securityModelId,
      macro_requirement_id: parent.macro_requirement_id,
      decision_id: parent.decision_id,
      parent_requirement_id: parent.id,
    },
    positionId: "security-requirement.body.reference.finding-derivation",
  });
  const accepted = [];
  const seen = new Set();
  for (const candidateValue of array(
    candidates,
    `Finding candidates for ${parent.id}`,
    securityRequirementAuthoringEditorRuleIds.finding,
  )) {
    const candidate = object(
      candidateValue,
      `Finding candidate for ${parent.id}`,
      securityRequirementAuthoringEditorRuleIds.finding,
    );
    const entity = object(
      candidate.entity,
      `Finding candidate ${candidate.id} entity`,
      securityRequirementAuthoringEditorRuleIds.finding,
    );
    const id = text(
      candidate.id ?? entity.id,
      "Common Finding id",
      securityRequirementAuthoringEditorRuleIds.finding,
    );
    if (seen.has(id)) {
      throw failure(
        securityRequirementAuthoringEditorRuleIds.finding,
        `Common Finding candidate resolves more than once for ${parent.id}: ${id}.`,
      );
    }
    seen.add(id);
    if (String(entity.review_state ?? "") !== "accepted") {
      throw failure(
        securityRequirementAuthoringEditorRuleIds.finding,
        `Governed reference service returned non-accepted Finding ${id}.`,
      );
    }
    const affected = Array.isArray(entity.affected_subjects)
      ? entity.affected_subjects
      : [];
    if (
      !affected.some(
        (subject) =>
          String(subject?.kind ?? "") === functionalEntityType &&
          String(subject?.id ?? "") === parent.id,
      )
    ) {
      continue;
    }
    const analysisRecordId = String(entity.analysis_record_id ?? "").trim();
    const sourcePath = String(entity.source_path ?? "").trim();
    if (!/^ANALYSIS-\d{4}$/u.test(analysisRecordId) || !sourcePath) continue;
    accepted.push({
      id,
      title: text(
        candidate.title ?? entity.title,
        `${id} title`,
        securityRequirementAuthoringEditorRuleIds.finding,
      ),
      analysis_record_id: analysisRecordId,
      source_path: sourcePath,
    });
  }
  return accepted.sort((left, right) => compare(left.id, right.id));
}

function replaceGeneratedBodyInputs(properties) {
  const body = structuredClone(object(properties.body, "body schema"));
  const bodyProperties = object(body.properties, "body schema properties");
  delete bodyProperties.parent_functional_requirement;
  delete bodyProperties.finding_derivation;
  body.required = array(body.required, "body schema required")
    .filter(
      (entry) =>
        entry !== "parent_functional_requirement" &&
        entry !== "finding_derivation",
    );
  body.description =
    "Authored Security Requirement body inputs. Parent and Finding sections are generated from canonical relation selections.";
  properties.body = body;
}

function createSecuritySchemaProvider(referenceService) {
  return Object.freeze({
    model_id: securityModelId,
    project({ documentType, properties, required, allOf, macros }) {
      replaceGeneratedBodyInputs(properties);
      const macroValues = array(macros, "catalog Macro-requirements");
      const parents = functionalParents(macroValues);
      const macrosWithParents = macroValues.filter((macro) =>
        parents.some((parent) => parent.macro_requirement_id === macro.id),
      );
      properties.macro_requirement_id = {
        ...enumProjection(
          macrosWithParents,
          (entry) => text(entry.id, "Macro-requirement id"),
          (entry) => `${entry.title} — status: ${entry.status}`,
          securityRequirementAuthoringEditorRuleIds.parent,
        ),
        description:
          "Canonical Macro-requirement that owns the selected Functional Requirement parent.",
      };
      required.push("macro_requirement_id");

      const decisionField = fieldByName(documentType, "decision_id");
      properties.decision_id = {
        type: "string",
        pattern: text(decisionField.pattern, "decision_id pattern"),
        description:
          "Canonical Decision that owns the selected Functional Requirement parent.",
      };
      required.push("decision_id");

      const parentField = fieldByName(documentType, "parent_requirement_id");
      properties.parent_requirement_id = {
        type: "string",
        pattern: text(parentField.pattern, "parent_requirement_id pattern"),
        description:
          "Exactly one Functional Requirement parent in the selected Macro-requirement and Decision chain.",
      };
      required.push("parent_requirement_id");

      properties.finding_ids = {
        type: "array",
        minItems: 1,
        uniqueItems: true,
        items: {
          type: "string",
          pattern: "^FINDING-\\d{4}$",
        },
        description:
          "One or more accepted Common Findings that affect the selected Functional Requirement and preserve Analysis Record provenance.",
      };
      required.push("finding_ids");

      for (const macro of macrosWithParents) {
        const decisions = array(macro.decisions, `${macro.id}.decisions`)
          .filter((decision) =>
            parents.some(
              (parent) =>
                parent.macro_requirement_id === macro.id &&
                parent.decision_id === decision.id,
            ),
          );
        allOf.push({
          if: {
            properties: { macro_requirement_id: { const: macro.id } },
            required: ["macro_requirement_id"],
          },
          then: {
            properties: {
              decision_id: enumProjection(
                decisions,
                (entry) => text(entry.id, "Decision id"),
                (entry) =>
                  `${entry.title} — ${macro.id}/${entry.id} — status: ${entry.status}`,
                securityRequirementAuthoringEditorRuleIds.parent,
              ),
            },
          },
        });
      }

      for (const parent of parents) {
        const findingCandidates = canonicalFindingCandidates(
          referenceService,
          parent,
        );
        allOf.push({
          if: {
            properties: {
              macro_requirement_id: { const: parent.macro_requirement_id },
              decision_id: { const: parent.decision_id },
            },
            required: ["macro_requirement_id", "decision_id"],
          },
          then: {
            properties: {
              parent_requirement_id: enumProjection(
                parents.filter(
                  (candidate) =>
                    candidate.macro_requirement_id ===
                      parent.macro_requirement_id &&
                    candidate.decision_id === parent.decision_id,
                ),
                (entry) => text(entry.id, "Functional Requirement id"),
                (entry) =>
                  `${entry.title} — status: ${entry.status} — ${entry.macro_requirement_id}/${entry.decision_id}`,
                securityRequirementAuthoringEditorRuleIds.parent,
              ),
            },
          },
        });
        allOf.push({
          if: {
            properties: {
              parent_requirement_id: { const: parent.id },
            },
            required: ["parent_requirement_id"],
          },
          then: {
            properties: {
              finding_ids: {
                type: "array",
                minItems: 1,
                uniqueItems: true,
                items: eligibleCandidateProjection(
                  findingCandidates,
                  (entry) => text(entry.id, "Common Finding id"),
                  (entry) =>
                    `${entry.title} — review_state: accepted — Analysis Record: ${entry.analysis_record_id} — source: ${entry.source_path}`,
                  securityRequirementAuthoringEditorRuleIds.finding,
                  `No accepted Common Finding currently affects Functional Requirement ${parent.id} with navigable Analysis Record provenance.`,
                ),
              },
            },
          },
        });
      }
    },
  });
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
    providers: [createSecuritySchemaProvider(referenceService)],
  });
  const branch = array(schema.oneOf, "schema.oneOf")[0];
  const parentCount = functionalParents(dedicatedCatalog.macro_requirements).length;
  let findingCandidateCount = 0;
  for (const parent of functionalParents(dedicatedCatalog.macro_requirements)) {
    findingCandidateCount += canonicalFindingCandidates(referenceService, parent).length;
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
