import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  canonicalizeMethodologySpecificAnalysisRecord,
  indexMethodologySpecificAnalysisRecords,
  methodologySpecificAnalysisRecordDerivationStates,
  methodologySpecificAnalysisRecordModel,
  methodologySpecificAnalysisRecordProfile,
  methodologySpecificAnalysisRecordRuleIds,
  resolveMethodologySpecificAnalysisRecord,
  validateMethodologySpecificAnalysisRecord,
} from "../lib/methodology-specific-analysis-record-model.mjs";
import {
  methodologySpecificAnalysisRecordValidatorRuleIds,
  validateMethodologySpecificAnalysisRecordModelBoundary,
  validateMethodologySpecificAnalysisRecordRepository,
} from "../check-methodology-specific-analysis-records.mjs";
import {
  buildMethodologySpecificAnalysisRecordEditorSchema,
  formatMethodologySpecificAnalysisRecordSchema,
  materializeMethodologySpecificAnalysisRecordSchema,
  methodologySpecificAnalysisRecordSchemaProjectPath,
} from "../lib/materialize-methodology-specific-analysis-record-schema.mjs";

/**
 * @file Methodology-specific analysis record model and validation verification.
 *
 * @implementsRequirement MR-0005ADR-0001REQ-0004GOV-0001
 * @derivedFromDecision MR-0005/ADR-0001
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Verifies canonical identity, explicit derivation acceptance, governed subject
 * resolution, deterministic schema materialization, immutable source handling
 * and stable negative fixture diagnostics.
 *
 * Side effects: creates and removes isolated operating-system temporary
 * directories. It never modifies repository analysis or governed sources.
 */

const testPath = fileURLToPath(import.meta.url);
const fixturePath = path.resolve(
  path.dirname(testPath),
  "../fixtures/methodology-specific-analysis-record/" +
    "negative-fixtures.registry.json",
);

const fixtureSet = JSON.parse(
  fs.readFileSync(fixturePath, "utf8"),
);

function validRecord(overrides = {}) {
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
      {
        kind: "base_analysis_relation",
        id: "BAE-REL-0001",
      },
      {
        kind: "functional_requirement",
        id: "MR-0001ADR-0001REQ-0001",
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
            source_bae_id: "BAE-0005",
            predicate: "has_source_endpoint",
            target_bae_id: "BAE-0001",
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
              "MR-0001/MR-0001ADR-0001REQ-0001GOV-0001_body.md",
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
}

function withTemporaryProject(callback) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "threat-forge-analysis-record-"),
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
    caseRecord.resolver_options?.resolve_method !==
    undefined
  ) {
    options.resolveMethod = () =>
      caseRecord.resolver_options.resolve_method === true;
  }

  if (
    caseRecord.resolver_options?.resolve_subject !==
    undefined
  ) {
    options.resolveSubject = () =>
      caseRecord.resolver_options.resolve_subject === true;
  }

  return validateMethodologySpecificAnalysisRecord(
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
      methodologySpecificAnalysisRecordProfile,
    );

    profile.profile_id = "divergent-profile";

    return {
      errors:
        validateMethodologySpecificAnalysisRecordModelBoundary({
          profile,
        }),
    };
  }

  if (
    caseRecord.boundary_mutation ===
    "duplicate-rule-id"
  ) {
    const validatorRuleIds = {
      ...methodologySpecificAnalysisRecordValidatorRuleIds,
      sourceRegistry:
        methodologySpecificAnalysisRecordRuleIds.record,
    };

    return {
      errors:
        validateMethodologySpecificAnalysisRecordModelBoundary({
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
      return validateMethodologySpecificAnalysisRecordRepository({
        rootDir,
        recordPaths: [],
      });
    }


    if (
      caseRecord.mode ===
      "repository-missing-reference-grammar"
    ) {
      createCanonicalSources(rootDir, {
        includeReferenceGrammar: false,
      });

      return validateMethodologySpecificAnalysisRecordRepository({
        rootDir,
        recordPaths: [],
      });
    }

    createCanonicalSources(rootDir);

    if (
      caseRecord.mode ===
      "repository-missing-record"
    ) {
      return validateMethodologySpecificAnalysisRecordRepository({
        rootDir,
        recordPaths: [
          "analysis/missing.analysis-record.yml",
        ],
      });
    }

    if (
      caseRecord.mode ===
      "repository-duplicate-records"
    ) {
      writeProjectFile(
        rootDir,
        "analysis/first.analysis-record.yml",
        validRecord(),
      );
      writeProjectFile(
        rootDir,
        "analysis/second.analysis-record.yml",
        validRecord({
          scope: "Second authored record with duplicate identity",
        }),
      );

      return validateMethodologySpecificAnalysisRecordRepository({
        rootDir,
        recordPaths: [
          "analysis/first.analysis-record.yml",
          "analysis/second.analysis-record.yml",
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

test("publishes one canonical non-document analysis record model", () => {
  assert.equal(
    methodologySpecificAnalysisRecordModel.model_id,
    "methodology-specific-analysis-record-model",
  );
  assert.equal(
    methodologySpecificAnalysisRecordModel.profile_id,
    methodologySpecificAnalysisRecordProfile.profile_id,
  );
  assert.equal(
    methodologySpecificAnalysisRecordModel.record_domain,
    "analysis",
  );
  assert.equal(
    methodologySpecificAnalysisRecordModel
      .governed_document_model,
    false,
  );
  assert.equal(
    methodologySpecificAnalysisRecordModel
      .authorable_governed_document_type,
    false,
  );
  assert.equal(
    methodologySpecificAnalysisRecordProfile.file_glob,
    "**/*.analysis-record.yml",
  );
});

test("publishes unique stable diagnostic rule identifiers", () => {
  const ruleIds = [
    ...Object.values(
      methodologySpecificAnalysisRecordRuleIds,
    ),
    ...Object.values(
      methodologySpecificAnalysisRecordValidatorRuleIds,
    ),
  ];

  assert.equal(
    new Set(ruleIds).size,
    ruleIds.length,
  );
  assert.ok(
    ruleIds.every((ruleId) =>
      ruleId.startsWith("analysis-record."),
    ),
  );
});

test("accepts all governed subject kinds and explicit derivation states", () => {
  for (
    const derivationState of
    methodologySpecificAnalysisRecordDerivationStates
  ) {
    const result =
      validateMethodologySpecificAnalysisRecord(
        validRecord({
          derivation_state: derivationState,
        }),
        {
          resolveMethod: (methodId) =>
            methodId === "stride",
          resolveSubject: (kind, id) =>
            new Set([
              "base_analysis_element|BAE-0005",
              "base_analysis_relation|BAE-REL-0001",
              "functional_requirement|" +
                "MR-0001ADR-0001REQ-0001",
            ]).has(`${kind}|${id}`),
        },
      );

    assert.equal(
      result.valid,
      true,
      JSON.stringify(result.errors, null, 2),
    );
    assert.equal(
      result.value.derivation_state,
      derivationState,
    );
  }
});

test("never infers derivation acceptance from method payload", () => {
  const record = validRecord();
  delete record.derivation_state;
  record.method_payload.accepted = true;

  const result =
    validateMethodologySpecificAnalysisRecord(record);

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      ({ rule_id: ruleId }) =>
        ruleId ===
        methodologySpecificAnalysisRecordRuleIds
          .derivationState,
    ),
  );
  assert.equal(result.value, null);
});

test("canonicalization is deterministic and leaves authored input unchanged", () => {
  const record = validRecord({
    subjects: [
      {
        kind: "functional_requirement",
        id: "MR-0001ADR-0001REQ-0001",
      },
      {
        kind: "base_analysis_element",
        id: "BAE-0005",
      },
    ],
    method_payload: {
      zeta: 2,
      alpha: 1,
    },
  });

  const before = structuredClone(record);
  const first =
    canonicalizeMethodologySpecificAnalysisRecord(record);
  const second =
    canonicalizeMethodologySpecificAnalysisRecord(record);

  assert.deepEqual(first, second);
  assert.deepEqual(record, before);
  assert.deepEqual(
    first.subjects.map(({ kind }) => kind),
    [
      "base_analysis_element",
      "functional_requirement",
    ],
  );
  assert.deepEqual(
    Object.keys(first.method_payload),
    ["alpha", "zeta"],
  );
});

test("canonical identity index resolves unique records only", () => {
  const first = validRecord();
  const second = validRecord({
    id: "ANALYSIS-0002",
  });

  const uniqueIndex =
    indexMethodologySpecificAnalysisRecords([
      first,
      second,
    ]);

  assert.equal(
    resolveMethodologySpecificAnalysisRecord(
      uniqueIndex,
      "ANALYSIS-0001",
    ),
    first,
  );

  const duplicateIndex =
    indexMethodologySpecificAnalysisRecords([
      first,
      structuredClone(first),
    ]);

  assert.deepEqual(
    duplicateIndex.duplicateIds,
    ["ANALYSIS-0001"],
  );
  assert.equal(
    resolveMethodologySpecificAnalysisRecord(
      duplicateIndex,
      "ANALYSIS-0001",
    ),
    null,
  );
});

test("canonical model boundary accepts the registered model", () => {
  assert.deepEqual(
    validateMethodologySpecificAnalysisRecordModelBoundary(),
    [],
  );
});

test("editor schema is deterministic and derived from canonical metadata", () => {
  const modelBefore = JSON.stringify(
    methodologySpecificAnalysisRecordModel,
  );
  const profileBefore = JSON.stringify(
    methodologySpecificAnalysisRecordProfile,
  );

  const first =
    buildMethodologySpecificAnalysisRecordEditorSchema();
  const second =
    buildMethodologySpecificAnalysisRecordEditorSchema();

  assert.deepEqual(first, second);
  assert.equal(
    formatMethodologySpecificAnalysisRecordSchema(first),
    formatMethodologySpecificAnalysisRecordSchema(second),
  );
  assert.equal(first.additionalProperties, false);
  assert.deepEqual(
    first.properties.derivation_state.enum,
    ["accepted", "not_accepted"],
  );
  assert.deepEqual(
    first.properties.subjects.items.properties.kind.enum,
    [
      "base_analysis_element",
      "base_analysis_relation",
      "functional_requirement",
    ],
  );
  assert.equal(
    first["x-threatforge"].model_id,
    methodologySpecificAnalysisRecordModel.model_id,
  );
  assert.equal(
    JSON.stringify(methodologySpecificAnalysisRecordModel),
    modelBefore,
  );
  assert.equal(
    JSON.stringify(methodologySpecificAnalysisRecordProfile),
    profileBefore,
  );
});

test("editor schema write and check modes are idempotent", () => {
  withTemporaryProject((rootDir) => {
    const writeResult =
      materializeMethodologySpecificAnalysisRecordSchema({
        rootDir,
        mode: "write",
      });

    const checkResult =
      materializeMethodologySpecificAnalysisRecordSchema({
        rootDir,
        mode: "check",
      });

    assert.equal(writeResult.status, "created");
    assert.equal(checkResult.status, "current");
    assert.equal(
      writeResult.path,
      methodologySpecificAnalysisRecordSchemaProjectPath,
    );

    const absoluteSchemaPath = path.resolve(
      rootDir,
      ...methodologySpecificAnalysisRecordSchemaProjectPath
        .split("/"),
    );

    assert.equal(
      fs.existsSync(absoluteSchemaPath),
      true,
    );
  });
});

test("repository validation resolves every supported governed subject", () => {
  withTemporaryProject((rootDir) => {
    createCanonicalSources(rootDir);

    writeProjectFile(
      rootDir,
      "analysis/demonstration.analysis-record.yml",
      validRecord(),
    );

    const sourceSnapshots = {
      baseAnalysis: fs.readFileSync(
        path.resolve(
          rootDir,
          "docs/reference/project-model/registers/" +
            "base-analysis/base-analysis-elements.registry.yml",
        ),
        "utf8",
      ),
      requirements: fs.readFileSync(
        path.resolve(
          rootDir,
          "docs/reference/project-model/registers/" +
            "requirements/MR-0001.requirements.registry.yml",
        ),
        "utf8",
      ),
    };

    const result =
      validateMethodologySpecificAnalysisRecordRepository({
        rootDir,
      });

    assert.equal(
      result.valid,
      true,
      JSON.stringify(result.errors, null, 2),
    );
    assert.equal(result.record_count, 1);
    assert.deepEqual(
      result.record_paths,
      ["analysis/demonstration.analysis-record.yml"],
    );

    assert.equal(
      fs.readFileSync(
        path.resolve(
          rootDir,
          "docs/reference/project-model/registers/" +
            "base-analysis/base-analysis-elements.registry.yml",
        ),
        "utf8",
      ),
      sourceSnapshots.baseAnalysis,
    );
    assert.equal(
      fs.readFileSync(
        path.resolve(
          rootDir,
          "docs/reference/project-model/registers/" +
            "requirements/MR-0001.requirements.registry.yml",
        ),
        "utf8",
      ),
      sourceSnapshots.requirements,
    );
  });
});

test("negative fixture registry is complete and uniquely identified", () => {
  assert.equal(fixtureSet.schema_version, 1);
  assert.equal(
    fixtureSet.fixture_set_id,
    "methodology-specific-analysis-record-negative-fixtures",
  );
  assert.equal(fixtureSet.cases.length, 23);

  const caseIds = fixtureSet.cases.map(({ id }) => id);
  assert.equal(
    new Set(caseIds).size,
    caseIds.length,
  );

  const knownRuleIds = new Set([
    ...Object.values(
      methodologySpecificAnalysisRecordRuleIds,
    ),
    ...Object.values(
      methodologySpecificAnalysisRecordValidatorRuleIds,
    ),
  ]);

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
    }
  }
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