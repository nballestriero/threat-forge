import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  canonicalizeCommonAnalysisFinding,
  commonAnalysisFindingAffectedSubjectKinds,
  commonAnalysisFindingModel,
  commonAnalysisFindingProfile,
  commonAnalysisFindingReviewStates,
  commonAnalysisFindingRuleIds,
  indexCommonAnalysisFindings,
  resolveCommonAnalysisFinding,
  validateCommonAnalysisFinding,
} from "../lib/common-analysis-finding-model.mjs";
import {
  evaluateCommonAnalysisFindingReferenceEligibility,
} from "../lib/common-analysis-finding-reference-eligibility.mjs";
import {
  commonAnalysisFindingValidatorRuleIds,
  loadValidatedCommonAnalysisFindingReferenceProjection,
  loadValidatedCommonAnalysisFindingRelationProjection,
  validateCommonAnalysisFindingModelBoundary,
  validateCommonAnalysisFindingRepository,
} from "../check-common-analysis-findings.mjs";

/**
 * @file Common analysis finding model and validation verification.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0001
 * @implementsRequirement MR-0005ADR-0004REQ-0001GOV-0001
 * @derivedFromDecision MR-0005/ADR-0002
 * @derivedFromDecision MR-0005/ADR-0004
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Verifies canonical Finding identity, explicit title and review state,
 * immutable source handling, governed Analysis Record and affected-subject
 * resolution, repository-derived reference projection, fail-closed operational
 * projection loading, accepted-state eligibility, deterministic diagnostics and
 * complete negative fixture coverage.
 *
 * Side effects: creates and removes isolated operating-system temporary
 * directories. It never modifies repository Findings, Analysis Records,
 * Base Analysis sources or governed Functional Requirements.
 */

const testPath = fileURLToPath(import.meta.url);
const fixturePath = path.resolve(
  path.dirname(testPath),
  "../fixtures/common-analysis-finding/negative-fixtures.registry.json",
);

const fixtureSet = JSON.parse(
  fs.readFileSync(fixturePath, "utf8"),
);

function validFinding(overrides = {}) {
  return {
    schema_version: 1,
    id: "FINDING-0001",
    title: "Unverified requester identity",
    analysis_record_id: "ANALYSIS-0001",
    affected_subjects: [
      {
        kind: "base_analysis_element",
        id: "BAE-0005",
      },
      {
        kind: "base_analysis_relation",
        id: "BAE-REL-0001",
      },
      {
        kind: "functional_requirement",
        id: "MR-0001ADR-0001REQ-0001",
      },
    ],
    threat_scenario:
      "An unauthorized actor impersonates a legitimate user.",
    expected_consequences:
      "Protected functionality may be accessed without authorization.",
    rationale_or_evidence:
      "The interaction crosses an authenticated trust boundary.",
    review_state: "accepted",
    ...structuredClone(overrides),
  };
}

function validAnalysisRecord(overrides = {}) {
  return {
    schema_version: 1,
    id: "ANALYSIS-0001",
    method_id: "stride",
    contributor_id: "analyst-0001",
    scope: "Demonstration request flow",
    subjects: [
      {
        kind: "base_analysis_element",
        id: "BAE-0005",
      },
    ],
    derivation_state: "accepted",
    method_payload: {
      category: "spoofing",
    },
    ...structuredClone(overrides),
  };
}

function isYamlMapping(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function yamlScalar(value) {
  if (value === null) {
    return "null";
  }

  if (
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  throw new TypeError(
    `Unsupported governed YAML scalar: ${typeof value}`,
  );
}

function inlineYamlCollection(value) {
  if (Array.isArray(value) && value.length === 0) {
    return "[]";
  }

  if (
    isYamlMapping(value) &&
    Object.keys(value).length === 0
  ) {
    return "{}";
  }

  return null;
}

function renderYamlEntry(key, value, indent) {
  const padding = " ".repeat(indent);
  const inlineCollection = inlineYamlCollection(value);

  if (inlineCollection !== null) {
    return [`${padding}${key}: ${inlineCollection}`];
  }

  if (
    Array.isArray(value) ||
    isYamlMapping(value)
  ) {
    return [
      `${padding}${key}:`,
      ...renderYamlValue(value, indent + 2),
    ];
  }

  return [
    `${padding}${key}: ${yamlScalar(value)}`,
  ];
}

function renderYamlArrayItem(value, indent) {
  const padding = " ".repeat(indent);
  const inlineCollection = inlineYamlCollection(value);

  if (inlineCollection !== null) {
    return [`${padding}- ${inlineCollection}`];
  }

  if (!isYamlMapping(value)) {
    return [`${padding}- ${yamlScalar(value)}`];
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return [`${padding}- {}`];
  }

  const [
    [firstKey, firstValue],
    ...remainingEntries
  ] = entries;

  const lines = [];
  const firstInlineCollection =
    inlineYamlCollection(firstValue);

  if (firstInlineCollection !== null) {
    lines.push(
      `${padding}- ${firstKey}: ${firstInlineCollection}`,
    );
  } else if (
    Array.isArray(firstValue) ||
    isYamlMapping(firstValue)
  ) {
    lines.push(`${padding}- ${firstKey}:`);
    lines.push(
      ...renderYamlValue(firstValue, indent + 4),
    );
  } else {
    lines.push(
      `${padding}- ${firstKey}: ${yamlScalar(firstValue)}`,
    );
  }

  for (const [key, entryValue] of remainingEntries) {
    lines.push(
      ...renderYamlEntry(key, entryValue, indent + 2),
    );
  }

  return lines;
}

function renderYamlValue(value, indent) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      renderYamlArrayItem(entry, indent),
    );
  }

  if (isYamlMapping(value)) {
    return Object.entries(value).flatMap(
      ([key, entryValue]) =>
        renderYamlEntry(key, entryValue, indent),
    );
  }

  return [
    `${" ".repeat(indent)}${yamlScalar(value)}`,
  ];
}

function serializeGovernedYaml(value) {
  if (!isYamlMapping(value)) {
    throw new TypeError(
      "Governed YAML test source root must be a mapping.",
    );
  }

  return `${renderYamlValue(value, 0).join("\n")}\n`;
}

function writeProjectFile(rootDir, projectPath, value) {
  const absolute = path.resolve(
    rootDir,
    ...projectPath.split("/"),
  );

  fs.mkdirSync(path.dirname(absolute), {
    recursive: true,
  });

  const content =
    typeof value === "string"
      ? value
      : serializeGovernedYaml(value);

  fs.writeFileSync(absolute, content, "utf8");
}

function createCanonicalSources(
  rootDir,
  {
    includeBaseAnalysis = true,
    includeRequirements = true,
    includeReferenceGrammar = true,
    includeAnalysisRecord = true,
  } = {},
) {
  if (includeBaseAnalysis) {
    writeProjectFile(
      rootDir,
      "docs/reference/project-model/registers/base-analysis/" +
        "base-analysis-elements.registry.yml",
      {
        schema_version: 1,
        registry_id: "base-analysis-elements-registry",
        macro_requirement_id: "MR-0003",
        elements: [
          {
            id: "BAE-0005",
            title: "Demonstration request flow",
          },
        ],
        relations: [
          {
            id: "BAE-REL-0001",
          },
        ],
      },
    );
  }

  if (includeRequirements) {
    writeProjectFile(
      rootDir,
      "docs/reference/project-model/registers/requirements/" +
        "MR-0001.requirements.registry.yml",
      {
        schema_version: 1,
        registry_id: "MR-0001-requirements-registry",
        macro_requirement_id: "MR-0001",
        requirements: [
          {
            id: "MR-0001ADR-0001REQ-0001",
            title: "Describe the demonstration interaction",
            status: "draft",
            requirement_type: "functional",
            macro_requirement_id: "MR-0001",
            decision_id: "ADR-0001",
            body_path:
              "docs/reference/project-model/body/requirements/" +
              "MR-0001/MR-0001ADR-0001REQ-0001_body.md",
          },
          {
            id: "MR-0001ADR-0001REQ-0001GOV-0001",
            title: "Governance requirement",
            status: "draft",
            requirement_type: "governance",
            macro_requirement_id: "MR-0001",
            decision_id: "ADR-0001",
            parent_requirement_id:
              "MR-0001ADR-0001REQ-0001",
            body_path:
              "docs/reference/project-model/body/requirements/" +
              "MR-0001/" +
              "MR-0001ADR-0001REQ-0001GOV-0001_body.md",
          },
        ],
      },
    );
  }

  if (includeReferenceGrammar) {
    writeProjectFile(
      rootDir,
      "docs/reference/project-model/registers/references/" +
        "governed-entity-resolvers.registry.yml",
      {
        schema_version: 1,
        registry_id: "governed-entity-resolvers-registry",
        scope: "governed_entity_reference_resolution",
        resolvers: [
          {
            id: "base-analysis-element-reference-resolver",
            entity_type: "base_analysis_element",
            status: "active",
            identifier_pattern: "^BAE-[0-9]{4}$",
            source_projection_provider:
              "base-analysis-registry-reference-source",
            eligibility_provider:
              "base-analysis-documentary-precedence",
          },
        ],
      },
    );
  }

  if (includeAnalysisRecord) {
    writeProjectFile(
      rootDir,
      "analysis/ANALYSIS-0001.analysis-record.yml",
      validAnalysisRecord(),
    );
  }
}

function withTemporaryProject(callback) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "threat-forge-common-finding-"),
  );

  try {
    return callback(rootDir);
  } finally {
    fs.rmSync(rootDir, {
      recursive: true,
      force: true,
    });
  }
}

function parentAtPath(value, parts) {
  let current = value;

  for (const part of parts.slice(0, -1)) {
    current = current[part];
  }

  return current;
}

function applyOperations(baseValue, operations) {
  const value = structuredClone(baseValue);

  for (const operation of operations ?? []) {
    const parts = operation.path ?? [];
    const parent = parentAtPath(value, parts);
    const key = parts.at(-1);

    if (operation.operation === "set") {
      parent[key] = structuredClone(operation.value);
      continue;
    }

    if (operation.operation === "delete") {
      delete parent[key];
      continue;
    }

    throw new Error(
      `Unsupported fixture operation: ${operation.operation}`,
    );
  }

  return value;
}

function validateModelFixture(caseRecord) {
  const candidate =
    caseRecord.candidate !== undefined
      ? structuredClone(caseRecord.candidate)
      : applyOperations(
        fixtureSet.base_record,
        caseRecord.operations,
      );

  const options = {};

  if (
    caseRecord.resolver_options?.resolve_analysis_record !==
    undefined
  ) {
    options.resolveAnalysisRecord = () =>
      caseRecord.resolver_options
        .resolve_analysis_record === true;
  } else {
    options.resolveAnalysisRecord = () => true;
  }

  if (
    caseRecord.resolver_options?.resolve_affected_subject !==
    undefined
  ) {
    options.resolveAffectedSubject = () =>
      caseRecord.resolver_options
        .resolve_affected_subject === true;
  } else {
    options.resolveAffectedSubject = () => true;
  }

  return validateCommonAnalysisFinding(
    candidate,
    options,
  );
}

function validateBoundaryFixture(caseRecord) {
  if (
    caseRecord.boundary_mutation ===
    "profile-id-divergence"
  ) {
    const profile = structuredClone(
      commonAnalysisFindingProfile,
    );

    profile.profile_id = "divergent-profile";

    return {
      errors:
        validateCommonAnalysisFindingModelBoundary({
          profile,
        }),
    };
  }

  if (
    caseRecord.boundary_mutation ===
    "duplicate-rule-id"
  ) {
    const validatorRuleIds = {
      ...commonAnalysisFindingValidatorRuleIds,
      sourceRegistry:
        commonAnalysisFindingRuleIds.record,
    };

    return {
      errors:
        validateCommonAnalysisFindingModelBoundary({
          validatorRuleIds,
        }),
    };
  }

  throw new Error(
    `Unsupported model-boundary mutation: ${caseRecord.boundary_mutation}`,
  );
}

function validateRepositoryFixture(caseRecord) {
  return withTemporaryProject((rootDir) => {
    if (caseRecord.mode === "repository-missing-sources") {
      return validateCommonAnalysisFindingRepository({
        rootDir,
        findingPaths: [],
      });
    }

    if (
      caseRecord.mode ===
      "repository-missing-reference-grammar"
    ) {
      createCanonicalSources(rootDir, {
        includeReferenceGrammar: false,
      });

      return validateCommonAnalysisFindingRepository({
        rootDir,
        findingPaths: [],
      });
    }

    createCanonicalSources(rootDir);

    if (
      caseRecord.mode ===
      "repository-missing-finding"
    ) {
      return validateCommonAnalysisFindingRepository({
        rootDir,
        findingPaths: [
          "analysis/missing.analysis-finding.yml",
        ],
      });
    }

    if (
      caseRecord.mode ===
      "repository-duplicate-findings"
    ) {
      writeProjectFile(
        rootDir,
        "analysis/first.analysis-finding.yml",
        validFinding(),
      );
      writeProjectFile(
        rootDir,
        "analysis/second.analysis-finding.yml",
        validFinding({
          threat_scenario:
            "A second independently authored scenario uses the same identity.",
        }),
      );

      return validateCommonAnalysisFindingRepository({
        rootDir,
        findingPaths: [
          "analysis/first.analysis-finding.yml",
          "analysis/second.analysis-finding.yml",
        ],
      });
    }

    throw new Error(
      `Unsupported repository fixture mode: ${caseRecord.mode}`,
    );
  });
}

function validateFixture(caseRecord) {
  if (caseRecord.mode === "model") {
    return validateModelFixture(caseRecord);
  }

  if (caseRecord.mode === "model-boundary") {
    return validateBoundaryFixture(caseRecord);
  }

  return validateRepositoryFixture(caseRecord);
}

test("publishes one canonical non-document common Finding model", () => {
  assert.equal(
    commonAnalysisFindingModel.model_id,
    "common-analysis-finding-model",
  );
  assert.equal(
    commonAnalysisFindingModel.profile_id,
    commonAnalysisFindingProfile.profile_id,
  );
  assert.equal(
    commonAnalysisFindingModel.record_domain,
    "analysis",
  );
  assert.equal(
    commonAnalysisFindingModel.governed_document_model,
    false,
  );
  assert.equal(
    commonAnalysisFindingModel
      .authorable_governed_document_type,
    false,
  );
  assert.equal(
    commonAnalysisFindingProfile.file_glob,
    "**/*.analysis-finding.yml",
  );
  assert.ok(
    commonAnalysisFindingProfile.required_fields
      .includes("title"),
  );
  assert.equal(
    commonAnalysisFindingProfile.fields.title.pattern,
    commonAnalysisFindingModel.title_pattern,
  );
});

test("publishes unique stable diagnostic rule identifiers", () => {
  const ruleIds = [
    ...Object.values(commonAnalysisFindingRuleIds),
    ...Object.values(commonAnalysisFindingValidatorRuleIds),
  ];

  assert.equal(
    new Set(ruleIds).size,
    ruleIds.length,
  );
  assert.ok(
    ruleIds.every((ruleId) =>
      ruleId.startsWith("common-finding."),
    ),
  );
});

test("accepts every explicit review state with its governed constraints", () => {
  for (const reviewState of commonAnalysisFindingReviewStates) {
    const affectedSubjects =
      reviewState === "accepted"
        ? validFinding().affected_subjects
        : [
          {
            kind: "base_analysis_element",
            id: "BAE-0005",
          },
        ];

    const result = validateCommonAnalysisFinding(
      validFinding({
        affected_subjects: affectedSubjects,
        review_state: reviewState,
      }),
      {
        resolveAnalysisRecord: () => true,
        resolveAffectedSubject: () => true,
      },
    );

    assert.equal(
      result.valid,
      true,
      JSON.stringify(result.errors, null, 2),
    );
    assert.equal(result.value.review_state, reviewState);
  }
});

test("never infers an accepted review state from Finding content", () => {
  const finding = validFinding({
    rationale_or_evidence:
      "An analyst marked the source evidence as accepted.",
  });

  delete finding.review_state;

  const result = validateCommonAnalysisFinding(
    finding,
    {
      resolveAnalysisRecord: () => true,
      resolveAffectedSubject: () => true,
    },
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      ({ rule_id: ruleId }) =>
        ruleId === commonAnalysisFindingRuleIds.reviewState,
    ),
  );
  assert.equal(result.value, null);
});

test("never infers a canonical title from Finding content", () => {
  const finding = validFinding();
  delete finding.title;

  const canonical = canonicalizeCommonAnalysisFinding(finding);
  const result = validateCommonAnalysisFinding(
    finding,
    {
      resolveAnalysisRecord: () => true,
      resolveAffectedSubject: () => true,
    },
  );

  assert.equal(Object.hasOwn(canonical, "title"), false);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      ({ rule_id: ruleId }) =>
        ruleId === commonAnalysisFindingRuleIds.title,
    ),
  );
  assert.equal(result.value, null);
});

test("canonicalization is deterministic and leaves authored input unchanged", () => {
  const finding = validFinding({
    title: "  Unverified requester identity  ",
    affected_subjects: [
      {
        kind: "functional_requirement",
        id: "MR-0001ADR-0001REQ-0001",
      },
      {
        kind: "base_analysis_element",
        id: "BAE-0005",
      },
    ],
  });

  const before = structuredClone(finding);
  const first = canonicalizeCommonAnalysisFinding(finding);
  const second = canonicalizeCommonAnalysisFinding(finding);

  assert.deepEqual(first, second);
  assert.deepEqual(finding, before);
  assert.equal(first.title, "  Unverified requester identity  ");
  assert.deepEqual(
    first.affected_subjects.map(({ kind }) => kind),
    [
      "base_analysis_element",
      "functional_requirement",
    ],
  );
});

test("rejects empty multiline and threat-scenario titles", () => {
  for (const title of [
    "",
    "   ",
    "Unverified requester\nidentity",
    validFinding().threat_scenario,
  ]) {
    const result = validateCommonAnalysisFinding(
      validFinding({ title }),
      {
        resolveAnalysisRecord: () => true,
        resolveAffectedSubject: () => true,
      },
    );

    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some(
        ({ rule_id: ruleId }) =>
          ruleId === commonAnalysisFindingRuleIds.title,
      ),
    );
  }
});

test("canonical identity index resolves unique Findings only", () => {
  const first = validFinding();
  const second = validFinding({
    id: "FINDING-0002",
    title: "Second independent Finding",
  });

  const uniqueIndex =
    indexCommonAnalysisFindings([
      first,
      second,
    ]);

  assert.equal(
    resolveCommonAnalysisFinding(
      uniqueIndex,
      "FINDING-0001",
    ),
    first,
  );

  const duplicateIndex =
    indexCommonAnalysisFindings([
      first,
      structuredClone(first),
    ]);

  assert.deepEqual(
    duplicateIndex.duplicateIds,
    ["FINDING-0001"],
  );
  assert.equal(
    resolveCommonAnalysisFinding(
      duplicateIndex,
      "FINDING-0001",
    ),
    null,
  );
});

test("shared references never merge independent Finding identities", () => {
  const first = validFinding();
  const second = validFinding({
    id: "FINDING-0002",
    title: "Second independent Finding",
  });

  const index = indexCommonAnalysisFindings([
    first,
    second,
  ]);

  assert.deepEqual(index.duplicateIds, []);
  assert.equal(index.byId.size, 2);
  assert.equal(
    resolveCommonAnalysisFinding(index, first.id),
    first,
  );
  assert.equal(
    resolveCommonAnalysisFinding(index, second.id),
    second,
  );
});

test("canonical model boundary accepts the registered model", () => {
  assert.deepEqual(
    validateCommonAnalysisFindingModelBoundary(),
    [],
  );
});

test("canonical model boundary rejects divergent title constraints", () => {
  const profile = structuredClone(commonAnalysisFindingProfile);
  profile.fields.title.pattern = "^.*$";

  const errors = validateCommonAnalysisFindingModelBoundary({ profile });

  assert.ok(
    errors.some(
      ({ rule_id: ruleId, context }) =>
        ruleId === commonAnalysisFindingValidatorRuleIds.modelProfile &&
        context === "title",
    ),
  );
});

test("repository validation resolves every supported governed subject", () => {
  withTemporaryProject((rootDir) => {
    createCanonicalSources(rootDir);

    const findingPath =
      "analysis/demonstration.analysis-finding.yml";

    writeProjectFile(
      rootDir,
      findingPath,
      validFinding(),
    );

    const sourcePaths = [
      "docs/reference/project-model/registers/base-analysis/" +
        "base-analysis-elements.registry.yml",
      "docs/reference/project-model/registers/requirements/" +
        "MR-0001.requirements.registry.yml",
      "analysis/ANALYSIS-0001.analysis-record.yml",
      findingPath,
    ];

    const snapshots = Object.fromEntries(
      sourcePaths.map((projectPath) => [
        projectPath,
        fs.readFileSync(
          path.resolve(
            rootDir,
            ...projectPath.split("/"),
          ),
          "utf8",
        ),
      ]),
    );

    const result =
      validateCommonAnalysisFindingRepository({
        rootDir,
      });

    assert.equal(
      result.valid,
      true,
      JSON.stringify(result.errors, null, 2),
    );
    assert.equal(result.finding_count, 1);
    assert.deepEqual(
      result.finding_paths,
      [findingPath],
    );
    assert.deepEqual(
      result.reference_projection,
      [
        {
          id: "FINDING-0001",
          title: "Unverified requester identity",
          review_state: "accepted",
          source_path: findingPath,
        },
      ],
    );

    for (const [projectPath, snapshot] of
      Object.entries(snapshots)) {
      assert.equal(
        fs.readFileSync(
          path.resolve(
            rootDir,
            ...projectPath.split("/"),
          ),
          "utf8",
        ),
        snapshot,
      );
    }
  });
});

test("repository reference projection excludes invalid and undiscovered Findings while preserving duplicate identities", () => {
  withTemporaryProject((rootDir) => {
    createCanonicalSources(rootDir);

    const firstPath =
      "analysis/first.analysis-finding.yml";
    const secondPath =
      "analysis/second.analysis-finding.yml";
    const invalidPath =
      "analysis/invalid.analysis-finding.yml";
    const undiscoveredPath =
      "analysis/undiscovered.analysis-finding.yml";

    writeProjectFile(
      rootDir,
      firstPath,
      validFinding({
        title: "First duplicate Finding",
      }),
    );
    writeProjectFile(
      rootDir,
      secondPath,
      validFinding({
        title: "Second duplicate Finding",
        threat_scenario:
          "A second independently authored scenario uses the same identity.",
      }),
    );
    writeProjectFile(
      rootDir,
      invalidPath,
      validFinding({
        id: "FINDING-0002",
        title: "",
      }),
    );
    writeProjectFile(
      rootDir,
      undiscoveredPath,
      validFinding({
        id: "FINDING-0003",
        title: "Undiscovered Finding",
      }),
    );

    const result =
      validateCommonAnalysisFindingRepository({
        rootDir,
        findingPaths: [
          invalidPath,
          secondPath,
          firstPath,
        ],
      });

    assert.equal(result.valid, false);
    assert.equal(result.finding_count, 3);
    assert.ok(
      result.errors.some(
        ({ rule_id: ruleId }) =>
          ruleId ===
          commonAnalysisFindingRuleIds.duplicateIdentifier,
      ),
    );
    assert.ok(
      result.errors.some(
        ({ rule_id: ruleId, context }) =>
          ruleId === commonAnalysisFindingRuleIds.title &&
          context === `${invalidPath}:title`,
      ),
    );
    assert.deepEqual(
      result.reference_projection,
      [
        {
          id: "FINDING-0001",
          title: "First duplicate Finding",
          review_state: "accepted",
          source_path: firstPath,
        },
        {
          id: "FINDING-0001",
          title: "Second duplicate Finding",
          review_state: "accepted",
          source_path: secondPath,
        },
      ],
    );
    assert.equal(
      result.reference_projection.some(
        ({ source_path: sourcePath }) =>
          sourcePath === invalidPath ||
          sourcePath === undiscoveredPath,
      ),
      false,
    );
  });
});

test("operational reference projection loads only from a completely valid repository", () => {
  withTemporaryProject((rootDir) => {
    createCanonicalSources(rootDir);

    const findingPath =
      "analysis/FINDING-0001.analysis-finding.yml";

    writeProjectFile(
      rootDir,
      findingPath,
      validFinding(),
    );

    const first =
      loadValidatedCommonAnalysisFindingReferenceProjection({
        rootDir,
        findingPaths: [findingPath],
      });

    assert.deepEqual(
      first,
      [
        {
          id: "FINDING-0001",
          title: "Unverified requester identity",
          review_state: "accepted",
          source_path: findingPath,
        },
      ],
    );

    first[0].title = "Locally mutated projection";

    const second =
      loadValidatedCommonAnalysisFindingReferenceProjection({
        rootDir,
        findingPaths: [findingPath],
      });

    assert.equal(
      second[0].title,
      "Unverified requester identity",
    );
  });
});

test("operational reference projection fails closed for an invalid repository", () => {
  withTemporaryProject((rootDir) => {
    createCanonicalSources(rootDir);

    const invalidPath =
      "analysis/invalid.analysis-finding.yml";

    writeProjectFile(
      rootDir,
      invalidPath,
      validFinding({
        title: "",
      }),
    );

    assert.throws(
      () =>
        loadValidatedCommonAnalysisFindingReferenceProjection({
          rootDir,
          findingPaths: [invalidPath],
        }),
      (error) => {
        assert.match(
          error.message,
          /^Canonical Common Finding repository is invalid:/u,
        );
        assert.ok(
          error.message.includes(
            commonAnalysisFindingRuleIds.title,
          ),
        );

        return true;
      },
    );
  });
});

test("reference eligibility depends only on explicit Common Finding review state", () => {
  const cases = [
    {
      review_state: "accepted",
      eligible: true,
      reason: "The Common Finding is explicitly accepted.",
    },
    {
      review_state: "proposed",
      eligible: false,
      reason:
        "Common Finding FINDING-0001 is not accepted " +
        "(review_state: proposed).",
    },
    {
      review_state: "rejected",
      eligible: false,
      reason:
        "Common Finding FINDING-0001 is not accepted " +
        "(review_state: rejected).",
    },
  ];

  for (const caseRecord of cases) {
    const entity = {
      id: "FINDING-0001",
      title: "Unverified requester identity",
      review_state: caseRecord.review_state,
      source_path:
        "analysis/FINDING-0001.analysis-finding.yml",
    };

    const before = structuredClone(entity);

    const first =
      evaluateCommonAnalysisFindingReferenceEligibility({
        entity,
        currentDocument: {
          modelId: "first-caller",
        },
        positionId: "first-caller.position",
      });

    const second =
      evaluateCommonAnalysisFindingReferenceEligibility({
        entity,
        currentDocument: {
          modelId: "second-caller",
        },
        positionId: "second-caller.position",
      });

    assert.deepEqual(first, second);
    assert.deepEqual(entity, before);
    assert.equal(first.eligible, caseRecord.eligible);
    assert.equal(
      first.review_state,
      caseRecord.review_state,
    );
    assert.equal(first.reason, caseRecord.reason);
  }
});

test("reference eligibility fails closed for missing malformed and unknown review states", () => {
  for (const reviewState of [
    undefined,
    "",
    " accepted ",
    "approved",
  ]) {
    const entity = {
      id: "FINDING-0001",
      title: "Unverified requester identity",
      source_path:
        "analysis/FINDING-0001.analysis-finding.yml",
    };

    if (reviewState !== undefined) {
      entity.review_state = reviewState;
    }

    const before = structuredClone(entity);

    const result =
      evaluateCommonAnalysisFindingReferenceEligibility({
        entity,
      });

    const exactState =
      String(reviewState ?? "");

    assert.equal(result.eligible, false);
    assert.equal(
      result.review_state,
      exactState,
    );
    assert.equal(
      result.reason,
      `Common Finding FINDING-0001 is not accepted ` +
        `(review_state: ${exactState || "<empty>"}).`,
    );
    assert.deepEqual(entity, before);
  }
});

test("negative fixture registry is complete and uniquely identified", () => {
  assert.equal(fixtureSet.schema_version, 1);
  assert.equal(
    fixtureSet.fixture_set_id,
    "common-analysis-finding-negative-fixtures",
  );

  const caseIds = fixtureSet.cases.map(({ id }) => id);
  assert.equal(
    new Set(caseIds).size,
    caseIds.length,
  );

  const knownRuleIds = new Set([
    ...Object.values(commonAnalysisFindingRuleIds),
    ...Object.values(commonAnalysisFindingValidatorRuleIds),
  ]);
  const coveredRuleIds = new Set();

  for (const caseRecord of fixtureSet.cases) {
    assert.ok(
      Array.isArray(caseRecord.expected_rule_ids) &&
        caseRecord.expected_rule_ids.length > 0,
      `${caseRecord.id} must declare expected_rule_ids.`,
    );

    for (const ruleId of caseRecord.expected_rule_ids) {
      assert.ok(
        knownRuleIds.has(ruleId),
        `${caseRecord.id} declares unknown rule ${ruleId}.`,
      );
      coveredRuleIds.add(ruleId);
    }
  }

  assert.deepEqual(
    [...coveredRuleIds].sort(),
    [...knownRuleIds].sort(),
    "Every declared Common Finding rule must have a negative fixture.",
  );
});

test("negative fixtures emit every declared stable rule", async (t) => {
  for (const caseRecord of fixtureSet.cases) {
    await t.test(caseRecord.id, () => {
      const result = validateFixture(caseRecord);
      const emitted = new Set(
        result.errors.map(({ rule_id: ruleId }) => ruleId),
      );

      for (const ruleId of caseRecord.expected_rule_ids) {
        assert.ok(
          emitted.has(ruleId),
          `${caseRecord.id} did not emit ${ruleId}: ` +
            JSON.stringify(result.errors, null, 2),
        );
      }
    });
  }
});

test("relation projection preserves Finding provenance and affected subjects", () => {
  withTemporaryProject((rootDir) => {
    createCanonicalSources(rootDir);
    const findingPath = "analysis/FINDING-0001.analysis-finding.yml";
    writeProjectFile(rootDir, findingPath, validFinding());
    const projection = loadValidatedCommonAnalysisFindingRelationProjection({
      rootDir,
      findingPaths: [findingPath],
    });
    assert.deepEqual(projection, [
      {
        id: "FINDING-0001",
        title: "Unverified requester identity",
        analysis_record_id: "ANALYSIS-0001",
        affected_subjects: validFinding().affected_subjects,
        review_state: "accepted",
        source_path: findingPath,
      },
    ]);
    projection[0].affected_subjects[0].id = "consumer mutation";
    assert.equal(
      loadValidatedCommonAnalysisFindingRelationProjection({
        rootDir,
        findingPaths: [findingPath],
      })[0].affected_subjects[0].id,
      "BAE-0005",
    );
  });
});
