/**
 * @file Canonical common analysis finding model.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001
 * @implementsRequirement MR-0005ADR-0004REQ-0001GOV-0001
 * @derivedFromDecision MR-0005/ADR-0002
 * @derivedFromDecision MR-0005/ADR-0004
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Defines the methodology-neutral analysis-domain Finding envelope shared by
 * all methodology plugins. Method-owned classifications, applicability rules,
 * failure modes and attack classes are deliberately excluded.
 *
 * Side effects: none.
 */

const findingIdPatternSource = "^FINDING-\\d{4}$";
const analysisRecordIdPatternSource = "^ANALYSIS-\\d{4}$";
const titlePatternSource = "^(?=.*\\S)[^\\r\\n]+$";

const affectedSubjectIdPatternSources = Object.freeze({
  base_analysis_element: "^BAE-\\d{4}$",
  base_analysis_relation: "^BAE-REL-\\d{4}$",
  functional_requirement: "^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}$",
});

const affectedSubjectIdPatterns = Object.freeze(
  Object.fromEntries(
    Object.entries(affectedSubjectIdPatternSources).map(([kind, pattern]) => [
      kind,
      new RegExp(pattern, "u"),
    ]),
  ),
);

const allowedRootMembers = new Set([
  "schema_version",
  "id",
  "title",
  "analysis_record_id",
  "affected_subjects",
  "threat_scenario",
  "expected_consequences",
  "rationale_or_evidence",
  "review_state",
]);

const forbiddenMethodSpecificMembers = new Set([
  "method_payload",
  "classifications",
  "applicability_rules",
  "failure_modes",
  "attack_classes",
]);

const allowedAffectedSubjectMembers = new Set(["kind", "id"]);

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
 * Stable diagnostic identifiers owned by the canonical common Finding model.
 */
export const commonAnalysisFindingRuleIds = Object.freeze({
  record: "common-finding.model.record",
  unknownMember: "common-finding.model.unknown-member",
  methodSpecificMember: "common-finding.model.method-specific-member",
  schemaVersion: "common-finding.model.schema-version",
  identifier: "common-finding.model.identifier",
  duplicateIdentifier: "common-finding.model.duplicate-identifier",
  title: "common-finding.model.title",
  analysisRecordId: "common-finding.model.analysis-record-id",
  unresolvedAnalysisRecord: "common-finding.model.unresolved-analysis-record",
  affectedSubjects: "common-finding.model.affected-subjects",
  affectedSubjectRecord: "common-finding.model.affected-subject-record",
  unknownAffectedSubjectMember:
    "common-finding.model.unknown-affected-subject-member",
  affectedSubjectKind: "common-finding.model.affected-subject-kind",
  affectedSubjectId: "common-finding.model.affected-subject-id",
  duplicateAffectedSubject: "common-finding.model.duplicate-affected-subject",
  unresolvedAffectedSubject:
    "common-finding.model.unresolved-affected-subject",
  acceptedFunctionalRequirement:
    "common-finding.model.accepted-functional-requirement",
  threatScenario: "common-finding.model.threat-scenario",
  expectedConsequences: "common-finding.model.expected-consequences",
  rationaleOrEvidence: "common-finding.model.rationale-or-evidence",
  reviewState: "common-finding.model.review-state",
});

/**
 * Controlled affected-subject kinds accepted by the common Finding model.
 */
export const commonAnalysisFindingAffectedSubjectKinds = deepFreeze([
  {
    value: "base_analysis_element",
    description: "Canonical Base Analysis Element identity.",
    id_pattern: affectedSubjectIdPatternSources.base_analysis_element,
  },
  {
    value: "base_analysis_relation",
    description: "Canonical Base Analysis relation identity.",
    id_pattern: affectedSubjectIdPatternSources.base_analysis_relation,
  },
  {
    value: "functional_requirement",
    description: "Canonical governed Functional Requirement identity.",
    id_pattern: affectedSubjectIdPatternSources.functional_requirement,
  },
]);

/**
 * Explicit review states accepted by the common Finding model.
 */
export const commonAnalysisFindingReviewStates = Object.freeze([
  "proposed",
  "accepted",
  "rejected",
]);

/**
 * Canonical representation profile consumed by validators and schema
 * materializers.
 */
export const commonAnalysisFindingProfile = deepFreeze({
  schema_version: 1,
  profile_id: "common-analysis-finding",
  record_domain: "analysis",
  file_glob: "**/*.analysis-finding.yml",
  additional_properties: false,
  required_fields: [
    "schema_version",
    "id",
    "title",
    "analysis_record_id",
    "affected_subjects",
    "threat_scenario",
    "expected_consequences",
    "rationale_or_evidence",
    "review_state",
  ],
  fields: {
    schema_version: {
      type: "integer",
      const: 1,
      description: "Canonical common analysis Finding schema version.",
    },
    id: {
      type: "string",
      pattern: findingIdPatternSource,
      description: "Stable canonical common analysis Finding identifier.",
      examples: ["FINDING-0001"],
    },
    title: {
      type: "string",
      min_length: 1,
      pattern: titlePatternSource,
      description:
        "Canonical human-readable single-line title distinct from the threat scenario.",
      examples: ["Unverified requester identity"],
    },
    analysis_record_id: {
      type: "string",
      pattern: analysisRecordIdPatternSource,
      description:
        "Exactly one originating governed methodology-specific Analysis Record identifier.",
      examples: ["ANALYSIS-0001"],
    },
    affected_subjects: {
      type: "array",
      min_items: 1,
      unique_by: ["kind", "id"],
      description:
        "Governed Base Analysis or Functional Requirement subjects affected by the Finding.",
      item: {
        type: "object",
        additional_properties: false,
        required_fields: ["kind", "id"],
        fields: {
          kind: {
            type: "string",
            enum: commonAnalysisFindingAffectedSubjectKinds.map(
              ({ value }) => value,
            ),
            description:
              "Canonical model owning the affected subject identity.",
          },
          id: {
            type: "string",
            description:
              "Canonical identity preserved from the owning source model.",
          },
        },
      },
    },
    threat_scenario: {
      type: "string",
      min_length: 1,
      description: "Concrete threat scenario represented by the Finding.",
    },
    expected_consequences: {
      type: "string",
      min_length: 1,
      description: "Expected consequences of the threat scenario.",
    },
    rationale_or_evidence: {
      type: "string",
      min_length: 1,
      description:
        "Supporting rationale or evidence preserved by the common Finding.",
    },
    review_state: {
      type: "string",
      enum: commonAnalysisFindingReviewStates,
      description:
        "Explicitly recorded review state that is never inferred from Finding content.",
    },
  },
});

/**
 * Canonical model identity and constraints.
 */
export const commonAnalysisFindingModel = deepFreeze({
  model_id: "common-analysis-finding-model",
  schema_version: 1,
  identifier_field: "id",
  identifier_pattern: findingIdPatternSource,
  title_pattern: titlePatternSource,
  analysis_record_identifier_pattern: analysisRecordIdPatternSource,
  profile_id: commonAnalysisFindingProfile.profile_id,
  record_domain: "analysis",
  governed_document_model: false,
  authorable_governed_document_type: false,
  affected_subject_kinds: commonAnalysisFindingAffectedSubjectKinds,
  review_states: commonAnalysisFindingReviewStates,
});

/**
 * Produces the deterministic canonical representation of one Finding.
 *
 * This function does not infer review state, resolve governed references or
 * merge independent Findings.
 *
 * @param {Record<string, unknown>} finding - Authored Finding.
 * @returns {Record<string, unknown>} Canonical Finding projection.
 */
export function canonicalizeCommonAnalysisFinding(finding) {
  const affectedSubjects = Array.isArray(finding?.affected_subjects)
    ? finding.affected_subjects
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

  return {
    schema_version: finding?.schema_version,
    id: text(finding?.id),
    ...(Object.hasOwn(finding ?? {}, "title")
      ? { title: finding.title }
      : {}),
    analysis_record_id: text(finding?.analysis_record_id),
    affected_subjects: affectedSubjects,
    threat_scenario: text(finding?.threat_scenario),
    expected_consequences: text(finding?.expected_consequences),
    rationale_or_evidence: text(finding?.rationale_or_evidence),
    review_state: text(finding?.review_state),
  };
}

/**
 * Validates one common analysis Finding.
 *
 * Optional resolver callbacks keep repository ownership outside this pure
 * model while allowing deterministic resolution by the future validator.
 *
 * @param {unknown} candidate - Candidate Finding.
 * @param {{
 *   resolveAnalysisRecord?: (analysisRecordId: string) => boolean,
 *   resolveAffectedSubject?: (kind: string, id: string) => boolean
 * }} [options] - Canonical resolver callbacks.
 * @returns {{
 *   valid: boolean,
 *   errors: Array<{rule_id: string, message: string, context: string}>,
 *   value: Record<string, unknown>|null
 * }} Validation result.
 */
export function validateCommonAnalysisFinding(candidate, options = {}) {
  const errors = [];

  if (!isRecord(candidate)) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.record,
        "Common analysis Finding must be a mapping.",
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
    if (forbiddenMethodSpecificMembers.has(member)) {
      errors.push(
        problem(
          commonAnalysisFindingRuleIds.methodSpecificMember,
          `Common analysis Finding contains method-specific member ${member}.`,
          member,
        ),
      );
      continue;
    }

    if (!allowedRootMembers.has(member)) {
      errors.push(
        problem(
          commonAnalysisFindingRuleIds.unknownMember,
          `Common analysis Finding contains unknown top-level member ${member}.`,
          member,
        ),
      );
    }
  }

  if (candidate.schema_version !== 1) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.schemaVersion,
        "Common analysis Finding schema_version must equal 1.",
        "schema_version",
      ),
    );
  }

  const id = text(candidate.id);
  if (!new RegExp(findingIdPatternSource, "u").test(id)) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.identifier,
        `Common analysis Finding identifier is invalid: ${id || "<empty>"}.`,
        "id",
      ),
    );
  }

  const authoredTitle =
    typeof candidate.title === "string"
      ? candidate.title
      : "";
  const title = authoredTitle.trim();
  if (
    typeof candidate.title !== "string" ||
    !title ||
    /[\r\n]/u.test(authoredTitle) ||
    title === text(candidate.threat_scenario)
  ) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.title,
        "Common analysis Finding title must be non-empty, single-line and distinct from threat_scenario.",
        "title",
      ),
    );
  }

  const analysisRecordId = text(candidate.analysis_record_id);
  if (!new RegExp(analysisRecordIdPatternSource, "u").test(analysisRecordId)) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.analysisRecordId,
        `Originating Analysis Record identifier is invalid: ${analysisRecordId || "<empty>"}.`,
        "analysis_record_id",
      ),
    );
  } else if (
    typeof options.resolveAnalysisRecord === "function" &&
    !options.resolveAnalysisRecord(analysisRecordId)
  ) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.unresolvedAnalysisRecord,
        `Originating Analysis Record does not resolve: ${analysisRecordId}.`,
        "analysis_record_id",
      ),
    );
  }

  if (!text(candidate.threat_scenario)) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.threatScenario,
        "Common analysis Finding threat_scenario must be non-empty.",
        "threat_scenario",
      ),
    );
  }

  if (!text(candidate.expected_consequences)) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.expectedConsequences,
        "Common analysis Finding expected_consequences must be non-empty.",
        "expected_consequences",
      ),
    );
  }

  if (!text(candidate.rationale_or_evidence)) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.rationaleOrEvidence,
        "Common analysis Finding rationale_or_evidence must be non-empty.",
        "rationale_or_evidence",
      ),
    );
  }

  const reviewState = text(candidate.review_state);
  if (!commonAnalysisFindingReviewStates.includes(reviewState)) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.reviewState,
        "Common analysis Finding review_state must be proposed, accepted or rejected.",
        "review_state",
      ),
    );
  }

  let hasAffectedFunctionalRequirement = false;

  if (
    !Array.isArray(candidate.affected_subjects) ||
    candidate.affected_subjects.length === 0
  ) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.affectedSubjects,
        "Common analysis Finding affected_subjects must contain at least one entry.",
        "affected_subjects",
      ),
    );
  } else {
    const seenAffectedSubjects = new Set();

    for (const [index, subject] of candidate.affected_subjects.entries()) {
      const context = `affected_subjects[${index}]`;

      if (!isRecord(subject)) {
        errors.push(
          problem(
            commonAnalysisFindingRuleIds.affectedSubjectRecord,
            `${context} must be a mapping.`,
            context,
          ),
        );
        continue;
      }

      for (const member of Object.keys(subject)) {
        if (!allowedAffectedSubjectMembers.has(member)) {
          errors.push(
            problem(
              commonAnalysisFindingRuleIds.unknownAffectedSubjectMember,
              `${context} contains unknown member ${member}.`,
              `${context}.${member}`,
            ),
          );
        }
      }

      const kind = text(subject.kind);
      const subjectId = text(subject.id);
      const idPattern = affectedSubjectIdPatterns[kind];

      if (!idPattern) {
        errors.push(
          problem(
            commonAnalysisFindingRuleIds.affectedSubjectKind,
            `${context}.kind is unsupported: ${kind || "<empty>"}.`,
            `${context}.kind`,
          ),
        );
        continue;
      }

      if (!idPattern.test(subjectId)) {
        errors.push(
          problem(
            commonAnalysisFindingRuleIds.affectedSubjectId,
            `${context}.id is invalid for ${kind}: ${subjectId || "<empty>"}.`,
            `${context}.id`,
          ),
        );
      }

      if (kind === "functional_requirement" && idPattern.test(subjectId)) {
        hasAffectedFunctionalRequirement = true;
      }

      const subjectKey = `${kind}|${subjectId}`;
      if (seenAffectedSubjects.has(subjectKey)) {
        errors.push(
          problem(
            commonAnalysisFindingRuleIds.duplicateAffectedSubject,
            `Common analysis Finding contains duplicate affected subject ${subjectKey}.`,
            context,
          ),
        );
      } else {
        seenAffectedSubjects.add(subjectKey);
      }

      if (
        idPattern.test(subjectId) &&
        typeof options.resolveAffectedSubject === "function" &&
        !options.resolveAffectedSubject(kind, subjectId)
      ) {
        errors.push(
          problem(
            commonAnalysisFindingRuleIds.unresolvedAffectedSubject,
            `Affected subject does not resolve: ${subjectKey}.`,
            context,
          ),
        );
      }
    }
  }

  if (reviewState === "accepted" && !hasAffectedFunctionalRequirement) {
    errors.push(
      problem(
        commonAnalysisFindingRuleIds.acceptedFunctionalRequirement,
        "An accepted common analysis Finding must affect at least one governed Functional Requirement.",
        "affected_subjects",
      ),
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    value:
      errors.length === 0
        ? canonicalizeCommonAnalysisFinding(candidate)
        : null,
  };
}

/**
 * Builds a deterministic identity index without mutating source Findings.
 *
 * @param {unknown[]} findings - Candidate common analysis Findings.
 * @returns {{
 *   byId: Map<string, Record<string, unknown>>,
 *   duplicateIds: readonly string[]
 * }} Canonical identity index.
 */
export function indexCommonAnalysisFindings(findings) {
  const byId = new Map();
  const duplicates = new Set();

  for (const finding of Array.isArray(findings) ? findings : []) {
    if (!isRecord(finding)) {
      continue;
    }

    const id = text(finding.id);
    if (!id) {
      continue;
    }

    if (byId.has(id)) {
      duplicates.add(id);
      continue;
    }

    byId.set(id, finding);
  }

  return {
    byId,
    duplicateIds: Object.freeze([...duplicates].sort(compare)),
  };
}

/**
 * Resolves exactly one canonical common analysis Finding identity.
 *
 * Duplicate identifiers deliberately resolve to null.
 *
 * @param {{
 *   byId: Map<string, Record<string, unknown>>,
 *   duplicateIds: readonly string[]
 * }} index - Canonical identity index.
 * @param {string} findingId - Requested identity.
 * @returns {Record<string, unknown>|null} Resolved Finding or null.
 */
export function resolveCommonAnalysisFinding(index, findingId) {
  if (!(index?.byId instanceof Map)) {
    throw new TypeError("Common analysis Finding index is invalid.");
  }

  const id = text(findingId);
  if (
    !new RegExp(findingIdPatternSource, "u").test(id) ||
    index.duplicateIds.includes(id)
  ) {
    return null;
  }

  return index.byId.get(id) ?? null;
}
