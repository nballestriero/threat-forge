/**
 * @file Canonical methodology-specific analysis record model.
 *
 * @implementsRequirement MR-0005ADR-0001REQ-0004
 * @derivedFromDecision MR-0005/ADR-0001
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Defines the common analysis-domain envelope shared by methodology-specific
 * analysis records. Method-owned classifications remain inside the optional
 * method_payload mapping and are not interpreted by this common model.
 *
 * Side effects: none.
 */

const analysisRecordIdPatternSource = "^ANALYSIS-\\d{4}$";
const methodIdPatternSource =
  "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$";

const subjectIdPatternSources = Object.freeze({
  base_analysis_element: "^BAE-\\d{4}$",
  base_analysis_relation: "^BAE-REL-\\d{4}$",
  functional_requirement: "^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}$",
});

const subjectIdPatterns = Object.freeze(
  Object.fromEntries(
    Object.entries(subjectIdPatternSources).map(([kind, pattern]) => [
      kind,
      new RegExp(pattern, "u"),
    ]),
  ),
);

const allowedRootMembers = new Set([
  "schema_version",
  "id",
  "method_id",
  "contributor_id",
  "scope",
  "subjects",
  "derivation_state",
  "method_payload",
]);

const allowedSubjectMembers = new Set(["kind", "id"]);

/**
 * Recursively freezes canonical model metadata.
 *
 * @param {unknown} value - Value to freeze.
 * @returns {unknown} Frozen value.
 */
function deepFreeze(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  for (const member of Object.values(value)) {
    deepFreeze(member);
  }

  return Object.freeze(value);
}

/**
 * Compares canonical strings deterministically.
 *
 * @param {unknown} left - Left value.
 * @param {unknown} right - Right value.
 * @returns {number} Stable comparison result.
 */
function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Returns true for a plain record-like mapping.
 *
 * @param {unknown} value - Candidate value.
 * @returns {boolean} Whether the value is a mapping.
 */
function isRecord(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

/**
 * Normalizes authored scalar text.
 *
 * @param {unknown} value - Candidate scalar.
 * @returns {string} Trimmed text.
 */
function text(value) {
  return String(value ?? "").trim();
}

/**
 * Produces a stable recursively key-sorted JSON-compatible value.
 *
 * @param {unknown} value - Source value.
 * @returns {unknown} Stable value.
 */
function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort(compare)
      .map((key) => [key, stableValue(value[key])]),
  );
}

/**
 * Creates one canonical diagnostic.
 *
 * @param {string} ruleId - Stable rule identifier.
 * @param {string} message - Human-readable diagnostic.
 * @param {string} [context] - Record location.
 * @returns {{rule_id: string, message: string, context: string}} Diagnostic.
 */
function problem(ruleId, message, context = "") {
  return {
    rule_id: ruleId,
    message,
    context,
  };
}

/**
 * Stable diagnostic identifiers owned by the canonical analysis record model.
 */
export const methodologySpecificAnalysisRecordRuleIds = Object.freeze({
  record: "analysis-record.model.record",
  unknownMember: "analysis-record.model.unknown-member",
  schemaVersion: "analysis-record.model.schema-version",
  identifier: "analysis-record.model.identifier",
  duplicateIdentifier: "analysis-record.model.duplicate-identifier",
  methodId: "analysis-record.model.method-id",
  unresolvedMethod: "analysis-record.model.unresolved-method",
  contributorId: "analysis-record.model.contributor-id",
  scope: "analysis-record.model.scope",
  subjects: "analysis-record.model.subjects",
  subjectRecord: "analysis-record.model.subject-record",
  unknownSubjectMember: "analysis-record.model.unknown-subject-member",
  subjectKind: "analysis-record.model.subject-kind",
  subjectId: "analysis-record.model.subject-id",
  duplicateSubject: "analysis-record.model.duplicate-subject",
  unresolvedSubject: "analysis-record.model.unresolved-subject",
  derivationState: "analysis-record.model.derivation-state",
  methodPayload: "analysis-record.model.method-payload",
});

/**
 * Controlled subject kinds accepted by the common analysis record model.
 */
export const methodologySpecificAnalysisRecordSubjectKinds =
  deepFreeze([
    {
      value: "base_analysis_element",
      description:
        "Canonical Base Analysis Element identity.",
      id_pattern: subjectIdPatternSources.base_analysis_element,
    },
    {
      value: "base_analysis_relation",
      description:
        "Canonical Base Analysis relation identity.",
      id_pattern: subjectIdPatternSources.base_analysis_relation,
    },
    {
      value: "functional_requirement",
      description:
        "Canonical governed Functional Requirement identity.",
      id_pattern: subjectIdPatternSources.functional_requirement,
    },
  ]);

/**
 * Explicit states controlling eligibility for deterministic derivation.
 */
export const methodologySpecificAnalysisRecordDerivationStates =
  Object.freeze(["accepted", "not_accepted"]);

/**
 * Canonical representation profile consumed by validators and schema
 * materializers.
 */
export const methodologySpecificAnalysisRecordProfile = deepFreeze({
  schema_version: 1,
  profile_id: "methodology-specific-analysis-record",
  record_domain: "analysis",
  file_glob: "**/*.analysis-record.yml",
  additional_properties: false,
  required_fields: [
    "schema_version",
    "id",
    "method_id",
    "contributor_id",
    "scope",
    "subjects",
    "derivation_state",
  ],
  fields: {
    schema_version: {
      type: "integer",
      const: 1,
      description:
        "Canonical methodology-specific analysis record schema version.",
    },
    id: {
      type: "string",
      pattern: analysisRecordIdPatternSource,
      description:
        "Stable canonical methodology-specific analysis record identifier.",
      examples: ["ANALYSIS-0001"],
    },
    method_id: {
      type: "string",
      pattern: methodIdPatternSource,
      description:
        "Exactly one selected analysis method identifier.",
      examples: ["stride", "stride-ai"],
    },
    contributor_id: {
      type: "string",
      min_length: 1,
      description:
        "Recorded contributing analyst identity without identity certification.",
    },
    scope: {
      type: "string",
      min_length: 1,
      description:
        "Concrete scope covered by this methodology-specific analysis.",
    },
    subjects: {
      type: "array",
      min_items: 1,
      unique_by: ["kind", "id"],
      description:
        "Governed Base Analysis or Functional Requirement subjects.",
      item: {
        type: "object",
        additional_properties: false,
        required_fields: ["kind", "id"],
        fields: {
          kind: {
            type: "string",
            enum:
              methodologySpecificAnalysisRecordSubjectKinds.map(
                ({ value }) => value,
              ),
            description:
              "Canonical model owning the referenced subject identity.",
          },
          id: {
            type: "string",
            description:
              "Canonical identity preserved from the owning source model.",
          },
        },
      },
    },
    derivation_state: {
      type: "string",
      enum: methodologySpecificAnalysisRecordDerivationStates,
      description:
        "Explicit eligibility state for deterministic downstream derivation.",
    },
    method_payload: {
      type: "object",
      required: false,
      additional_properties: true,
      description:
        "Optional method-owned payload validated by the selected method, not by the common model.",
    },
  },
});

/**
 * Canonical model identity and constraints.
 */
export const methodologySpecificAnalysisRecordModel = deepFreeze({
  model_id: "methodology-specific-analysis-record-model",
  schema_version: 1,
  identifier_field: "id",
  identifier_pattern: analysisRecordIdPatternSource,
  method_identifier_pattern: methodIdPatternSource,
  profile_id: methodologySpecificAnalysisRecordProfile.profile_id,
  record_domain: "analysis",
  governed_document_model: false,
  authorable_governed_document_type: false,
  subject_kinds: methodologySpecificAnalysisRecordSubjectKinds,
  derivation_states:
    methodologySpecificAnalysisRecordDerivationStates,
});

/**
 * Produces the deterministic canonical representation of one record.
 *
 * This function does not infer derivation acceptance and does not resolve
 * governed references.
 *
 * @param {Record<string, unknown>} record - Authored record.
 * @returns {Record<string, unknown>} Canonical record projection.
 */
export function canonicalizeMethodologySpecificAnalysisRecord(record) {
  const subjects = Array.isArray(record?.subjects)
    ? record.subjects
      .filter(isRecord)
      .map((subject) => ({
        kind: text(subject.kind),
        id: text(subject.id),
      }))
      .sort((left, right) =>
        compare(
          `${left.kind}|${left.id}`,
          `${right.kind}|${right.id}`,
        ),
      )
    : [];

  const canonical = {
    schema_version: record?.schema_version,
    id: text(record?.id),
    method_id: text(record?.method_id),
    contributor_id: text(record?.contributor_id),
    scope: text(record?.scope),
    subjects,
    derivation_state: text(record?.derivation_state),
  };

  if (record?.method_payload !== undefined) {
    canonical.method_payload = stableValue(record.method_payload);
  }

  return canonical;
}

/**
 * Validates one methodology-specific analysis record.
 *
 * Optional resolver callbacks keep repository ownership outside this pure
 * model while allowing deterministic resolution by the validator.
 *
 * @param {unknown} candidate - Candidate record.
 * @param {{
 *   resolveMethod?: (methodId: string) => boolean,
 *   resolveSubject?: (kind: string, id: string) => boolean
 * }} [options] - Canonical resolver callbacks.
 * @returns {{
 *   valid: boolean,
 *   errors: Array<{rule_id: string, message: string, context: string}>,
 *   value: Record<string, unknown>|null
 * }} Validation result.
 */
export function validateMethodologySpecificAnalysisRecord(
  candidate,
  options = {},
) {
  const errors = [];

  if (!isRecord(candidate)) {
    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds.record,
        "Methodology-specific analysis record must be a mapping.",
        "record",
      ),
    );

    return {
      valid: false,
      errors,
      value: null,
    };
  }

  for (const member of Object.keys(candidate)) {
    if (!allowedRootMembers.has(member)) {
      errors.push(
        problem(
          methodologySpecificAnalysisRecordRuleIds.unknownMember,
          `Analysis record contains unknown top-level member ${member}.`,
          member,
        ),
      );
    }
  }

  if (candidate.schema_version !== 1) {
    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds.schemaVersion,
        "Analysis record schema_version must equal 1.",
        "schema_version",
      ),
    );
  }

  const id = text(candidate.id);
  if (!new RegExp(analysisRecordIdPatternSource, "u").test(id)) {
    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds.identifier,
        `Analysis record identifier is invalid: ${id || "<empty>"}.`,
        "id",
      ),
    );
  }

  const methodId = text(candidate.method_id);
  if (!new RegExp(methodIdPatternSource, "u").test(methodId)) {
    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds.methodId,
        `Analysis method identifier is invalid: ${methodId || "<empty>"}.`,
        "method_id",
      ),
    );
  } else if (
    typeof options.resolveMethod === "function" &&
    !options.resolveMethod(methodId)
  ) {
    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds.unresolvedMethod,
        `Analysis method does not resolve: ${methodId}.`,
        "method_id",
      ),
    );
  }

  if (!text(candidate.contributor_id)) {
    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds.contributorId,
        "Analysis record contributor_id must be non-empty.",
        "contributor_id",
      ),
    );
  }

  if (!text(candidate.scope)) {
    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds.scope,
        "Analysis record scope must be non-empty.",
        "scope",
      ),
    );
  }

  if (
    !methodologySpecificAnalysisRecordDerivationStates.includes(
      text(candidate.derivation_state),
    )
  ) {
    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds.derivationState,
        "Analysis record derivation_state must be accepted or not_accepted.",
        "derivation_state",
      ),
    );
  }

  if (
    candidate.method_payload !== undefined &&
    !isRecord(candidate.method_payload)
  ) {
    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds.methodPayload,
        "Analysis record method_payload must be a mapping when present.",
        "method_payload",
      ),
    );
  }

  if (
    !Array.isArray(candidate.subjects) ||
    candidate.subjects.length === 0
  ) {
    errors.push(
      problem(
        methodologySpecificAnalysisRecordRuleIds.subjects,
        "Analysis record subjects must contain at least one entry.",
        "subjects",
      ),
    );
  } else {
    const seenSubjects = new Set();

    for (const [index, subject] of candidate.subjects.entries()) {
      const context = `subjects[${index}]`;

      if (!isRecord(subject)) {
        errors.push(
          problem(
            methodologySpecificAnalysisRecordRuleIds.subjectRecord,
            `${context} must be a mapping.`,
            context,
          ),
        );
        continue;
      }

      for (const member of Object.keys(subject)) {
        if (!allowedSubjectMembers.has(member)) {
          errors.push(
            problem(
              methodologySpecificAnalysisRecordRuleIds
                .unknownSubjectMember,
              `${context} contains unknown member ${member}.`,
              `${context}.${member}`,
            ),
          );
        }
      }

      const kind = text(subject.kind);
      const subjectId = text(subject.id);
      const idPattern = subjectIdPatterns[kind];

      if (!idPattern) {
        errors.push(
          problem(
            methodologySpecificAnalysisRecordRuleIds.subjectKind,
            `${context}.kind is unsupported: ${kind || "<empty>"}.`,
            `${context}.kind`,
          ),
        );
        continue;
      }

      if (!idPattern.test(subjectId)) {
        errors.push(
          problem(
            methodologySpecificAnalysisRecordRuleIds.subjectId,
            `${context}.id is invalid for ${kind}: ${subjectId || "<empty>"}.`,
            `${context}.id`,
          ),
        );
      }

      const subjectKey = `${kind}|${subjectId}`;
      if (seenSubjects.has(subjectKey)) {
        errors.push(
          problem(
            methodologySpecificAnalysisRecordRuleIds.duplicateSubject,
            `Analysis record contains duplicate subject ${subjectKey}.`,
            context,
          ),
        );
      } else {
        seenSubjects.add(subjectKey);
      }

      if (
        idPattern.test(subjectId) &&
        typeof options.resolveSubject === "function" &&
        !options.resolveSubject(kind, subjectId)
      ) {
        errors.push(
          problem(
            methodologySpecificAnalysisRecordRuleIds.unresolvedSubject,
            `Analysis subject does not resolve: ${subjectKey}.`,
            context,
          ),
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value:
      errors.length === 0
        ? canonicalizeMethodologySpecificAnalysisRecord(candidate)
        : null,
  };
}

/**
 * Builds a deterministic identity index without mutating source records.
 *
 * @param {unknown[]} records - Candidate analysis records.
 * @returns {{
 *   byId: Map<string, Record<string, unknown>>,
 *   duplicateIds: readonly string[]
 * }} Canonical identity index.
 */
export function indexMethodologySpecificAnalysisRecords(records) {
  const byId = new Map();
  const duplicates = new Set();

  for (const record of Array.isArray(records) ? records : []) {
    if (!isRecord(record)) {
      continue;
    }

    const id = text(record.id);
    if (!id) {
      continue;
    }

    if (byId.has(id)) {
      duplicates.add(id);
      continue;
    }

    byId.set(id, record);
  }

  return {
    byId,
    duplicateIds: Object.freeze([...duplicates].sort(compare)),
  };
}

/**
 * Resolves exactly one canonical analysis record identity.
 *
 * Duplicate identifiers deliberately resolve to null.
 *
 * @param {{
 *   byId: Map<string, Record<string, unknown>>,
 *   duplicateIds: readonly string[]
 * }} index - Canonical identity index.
 * @param {string} analysisRecordId - Requested identity.
 * @returns {Record<string, unknown>|null} Resolved record or null.
 */
export function resolveMethodologySpecificAnalysisRecord(
  index,
  analysisRecordId,
) {
  if (!(index?.byId instanceof Map)) {
    throw new TypeError(
      "Methodology-specific analysis record index is invalid.",
    );
  }

  const id = text(analysisRecordId);
  if (
    !new RegExp(analysisRecordIdPatternSource, "u").test(id) ||
    index.duplicateIds.includes(id)
  ) {
    return null;
  }

  return index.byId.get(id) ?? null;
}