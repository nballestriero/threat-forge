/**
 * @file Cycle-free Security Requirement authoring schema provider.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Owns the model-specific Security Requirement schema-provider behavior without
 * importing either the generic schema builder or the editor composition module.
 * This one-way dependency boundary allows both consumers to compose the same
 * provider without an ESM import cycle or duplicated canonical projection rules.
 */

const securityModelId = "security-requirement";
const functionalModelId = "functional-requirement";
const functionalEntityType = "functional_requirement";
const findingEntityType = "common_analysis_finding";

const ruleIds = Object.freeze({
  schema: "security-requirement.authoring.editor.schema",
  parent: "security-requirement.authoring.editor.parent",
  finding: "security-requirement.authoring.editor.finding",
});

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

function object(value, label, ruleId = ruleIds.schema) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw failure(ruleId, `${label} must be an object.`);
  }
  return value;
}

function array(value, label, ruleId = ruleIds.schema) {
  if (!Array.isArray(value)) {
    throw failure(ruleId, `${label} must be an array.`);
  }
  return value;
}

function text(value, label, ruleId = ruleIds.schema) {
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
      ruleIds.schema,
      `${documentType.id} has no canonical field ${fieldName}.`,
    );
  }
  return object(field, `${documentType.id}.${fieldName}`);
}

/**
 * Projects the unique Functional Requirement parents exposed by the catalog.
 *
 * @param {Array<Record<string, unknown>>} macros Canonical Macro-requirements.
 * @returns {Array<Record<string, unknown>>} Detached ordered parent records.
 */
export function listSecurityRequirementFunctionalParents(macros) {
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
          ruleIds.parent,
        );
        if (seen.has(id)) {
          throw failure(
            ruleIds.parent,
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

/**
 * Projects accepted Common Finding candidates for one Functional parent.
 *
 * @param {Record<string, unknown>} referenceService Governed reference service.
 * @param {Record<string, unknown>} parent Functional Requirement parent.
 * @returns {Array<Record<string, unknown>>} Detached ordered Finding candidates.
 */
export function listSecurityRequirementFindingCandidates(
  referenceService,
  parent,
) {
  if (typeof referenceService?.listEligibleCandidates !== "function") {
    throw failure(
      ruleIds.finding,
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
    ruleIds.finding,
  )) {
    const candidate = object(
      candidateValue,
      `Finding candidate for ${parent.id}`,
      ruleIds.finding,
    );
    const entity = object(
      candidate.entity,
      `Finding candidate ${candidate.id} entity`,
      ruleIds.finding,
    );
    const id = text(
      candidate.id ?? entity.id,
      "Common Finding id",
      ruleIds.finding,
    );
    if (seen.has(id)) {
      throw failure(
        ruleIds.finding,
        `Common Finding candidate resolves more than once for ${parent.id}: ${id}.`,
      );
    }
    seen.add(id);
    if (String(entity.review_state ?? "") !== "accepted") {
      throw failure(
        ruleIds.finding,
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
        ruleIds.finding,
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

/**
 * Creates the explicit Security Requirement schema provider.
 *
 * @param {Record<string, unknown>} referenceService Governed reference service.
 * @returns {Readonly<Record<string, unknown>>} Schema provider.
 */
export function createSecurityRequirementAuthoringSchemaProvider(
  referenceService,
) {
  return Object.freeze({
    model_id: securityModelId,
    project({ documentType, properties, required, allOf, macros }) {
      replaceGeneratedBodyInputs(properties);
      const macroValues = array(macros, "catalog Macro-requirements");
      const parents = listSecurityRequirementFunctionalParents(macroValues);
      const macrosWithParents = macroValues.filter((macro) =>
        parents.some((parent) => parent.macro_requirement_id === macro.id),
      );
      properties.macro_requirement_id = {
        ...enumProjection(
          macrosWithParents,
          (entry) => text(entry.id, "Macro-requirement id"),
          (entry) => `${entry.title} — status: ${entry.status}`,
          ruleIds.parent,
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
                ruleIds.parent,
              ),
            },
          },
        });
      }

      for (const parent of parents) {
        const findingCandidates = listSecurityRequirementFindingCandidates(
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
                ruleIds.parent,
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
                  ruleIds.finding,
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
