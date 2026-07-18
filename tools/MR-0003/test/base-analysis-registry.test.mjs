import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  baseAnalysisRegistryRuleIds,
  validateBaseAnalysisRegistrySources,
} from "../lib/base-analysis-registry.mjs";
import {
  baseAnalysisSourceContinuityRuleIds,
  validateBaseAnalysisSourceContinuity,
} from "../lib/base-analysis-source-continuity.mjs";

/**
 * @file Canonical BAE registry, source continuity and projection verification suite.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0005
 * @implementsRequirement MR-0003ADR-0001REQ-0005GOV-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 */

const testPath = fileURLToPath(import.meta.url);
const fixtureDir = path.resolve(
  path.dirname(testPath),
  "../fixtures/base-analysis-registry",
);
const fixturePath = path.join(fixtureDir, "negative-fixtures.json");
const continuityFixturePath = path.join(
  fixtureDir,
  "source-continuity-fixtures.json",
);
const fixtureSet = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const continuityFixtureSet = JSON.parse(
  fs.readFileSync(continuityFixturePath, "utf8"),
);

function sourceKey(source) {
  return [
    String(source?.kind ?? source?.source_kind ?? "").trim(),
    String(source?.source_id ?? "").trim(),
    String(source?.source_path ?? "").replaceAll("\\", "/").trim(),
  ].join("|");
}

function validateFixture(fixture) {
  const existing = new Set(
    (fixture.existing_sources ?? []).map(sourceKey),
  );
  return validateBaseAnalysisRegistrySources({
    inventory: fixture.inventory,
    taxonomies: fixture.taxonomies,
    candidateProjection: fixture.candidate_projection,
    sourceResolver: (source) => existing.has(sourceKey(source)),
  });
}

function continuitySource(value) {
  return {
    kind: String(value?.kind ?? value?.source_kind ?? ""),
    source_id: String(value?.source_id ?? ""),
    source_path: String(value?.source_path ?? ""),
  };
}

function withSourceHistoryOutcomes(taxonomies) {
  const result = structuredClone(taxonomies);
  result.source_history_outcomes = [
    {
      value: "continuity_confirmed",
      label: "Continuity confirmed",
      meaning: "Continuity confirmed",
    },
    {
      value: "authority_transferred",
      label: "Authority transferred",
      meaning: "Authority transferred",
    },
    {
      value: "bae_superseded",
      label: "BAE superseded",
      meaning: "BAE superseded",
    },
    {
      value: "bae_deprecated",
      label: "BAE deprecated",
      meaning: "BAE deprecated",
    },
  ];
  return result;
}

function withContinuity(inventory) {
  const result = structuredClone(inventory);
  result.elements = (result.elements ?? []).map((element) => {
    const origin = continuitySource(element.origin);
    return {
      ...element,
      authoritative_source: structuredClone(origin),
      source_history: [
        {
          sequence: 1,
          outcome: "continuity_confirmed",
          previous_source: structuredClone(origin),
          next_source: structuredClone(origin),
          review_evidence_id: "MR-0003/ADR-0002",
        },
      ],
    };
  });
  return result;
}

function getAtPath(value, parts) {
  return parts.reduce((current, key) => current?.[key], value);
}

function parentAtPath(value, parts) {
  return getAtPath(value, parts.slice(0, -1));
}

function applyOperations(baseValue, operations) {
  const value = structuredClone(baseValue);
  for (const operation of operations ?? []) {
    const pathParts = operation.path ?? [];
    const parent = parentAtPath(value, pathParts);
    const key = pathParts.at(-1);
    if (operation.operation === "set") {
      parent[key] = structuredClone(operation.value);
    } else if (operation.operation === "delete") {
      delete parent[key];
    } else {
      throw new Error(`Unsupported fixture operation: ${operation.operation}`);
    }
  }
  return value;
}

function validateContinuityFixture(caseRecord) {
  const input = applyOperations(
    continuityFixtureSet.base,
    caseRecord.operations,
  );
  const existingSources = new Set(
    (input.existing_sources ?? []).map(sourceKey),
  );
  const evidenceIds = new Set(
    (input.review_evidence_ids ?? []).map(String),
  );
  return {
    input,
    result: validateBaseAnalysisSourceContinuity({
      inventory: input.inventory,
      documents: input.documents,
      profiles: input.profiles,
      sourceResolver: (source) => existingSources.has(sourceKey(source)),
      reviewEvidenceResolver: (id) => evidenceIds.has(String(id)),
      candidateOccurrenceProjection:
        caseRecord.candidate_occurrence_projection,
    }),
  };
}

test("publishes unique stable BAE rule identifiers", () => {
  const values = Object.values(baseAnalysisRegistryRuleIds);
  assert.equal(new Set(values).size, values.length);
  assert.ok(values.every((value) => value.startsWith("bae.registry.")));
});

test("accepts the complete five-type BAE fixture", () => {
  const fixture = fixtureSet.cases.find(
    (entry) => entry.id === "divergent-projection",
  );
  const result = validateBaseAnalysisRegistrySources({
    inventory: withContinuity(fixture.inventory),
    taxonomies: withSourceHistoryOutcomes(fixture.taxonomies),
    sourceResolver: (source) =>
      new Set(fixture.existing_sources.map(sourceKey)).has(sourceKey(source)),
  });
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.element_count, 5);
  assert.equal(result.relation_count, 3);
  assert.deepEqual(
    result.projection.map((entry) => entry.id),
    ["BAE-0001", "BAE-0002", "BAE-0003", "BAE-0004", "BAE-0005"],
  );
  assert.ok(
    result.projection.every(
      (entry) => entry.entity_type === "base_analysis_element",
    ),
  );
  assert.ok(
    result.projection.every(
      (entry) =>
        entry.authoritative_source &&
        Array.isArray(entry.source_history),
    ),
  );
});

test("accepts an empty canonical BAE inventory", () => {
  const fixture = fixtureSet.cases[0];
  const result = validateBaseAnalysisRegistrySources({
    inventory: {
      schema_version: 1,
      registry_id: "base-analysis-elements-registry",
      macro_requirement_id: "MR-0003",
      elements: [],
      relations: [],
    },
    taxonomies: withSourceHistoryOutcomes(fixture.taxonomies),
  });
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.deepEqual(result.projection, []);
});

test("negative fixtures emit every declared stable rule", async (t) => {
  for (const fixture of fixtureSet.cases) {
    await t.test(fixture.id, () => {
      const result = validateFixture(fixture);
      const emitted = new Set(result.errors.map((entry) => entry.rule_id));
      for (const ruleId of fixture.expected_rule_ids) {
        assert.ok(
          emitted.has(ruleId),
          `${fixture.id} did not emit ${ruleId}: ${JSON.stringify(
            result.errors,
            null,
            2,
          )}`,
        );
      }
    });
  }
});

test("projection is deterministic and source inputs remain unchanged", () => {
  const fixture = fixtureSet.cases.find(
    (entry) => entry.id === "divergent-projection",
  );
  const inventoryBefore = structuredClone(fixture.inventory);
  const taxonomyBefore = structuredClone(fixture.taxonomies);
  const resolver = (source) =>
    new Set(fixture.existing_sources.map(sourceKey)).has(sourceKey(source));
  const first = validateBaseAnalysisRegistrySources({
    inventory: fixture.inventory,
    taxonomies: fixture.taxonomies,
    sourceResolver: resolver,
  });
  const second = validateBaseAnalysisRegistrySources({
    inventory: fixture.inventory,
    taxonomies: fixture.taxonomies,
    sourceResolver: resolver,
  });
  assert.deepEqual(first.projection, second.projection);
  assert.deepEqual(fixture.inventory, inventoryBefore);
  assert.deepEqual(fixture.taxonomies, taxonomyBefore);
});

test("publishes unique stable BAE source-continuity rule identifiers", () => {
  const values = Object.values(baseAnalysisSourceContinuityRuleIds);
  assert.equal(new Set(values).size, values.length);
  assert.ok(
    values.every((value) => value.startsWith("bae.source-continuity.")),
  );
});

test("source-continuity fixtures cover positive and negative outcomes", () => {
  assert.equal(continuityFixtureSet.schema_version, 1);
  assert.ok(continuityFixtureSet.cases.length >= 15);
  assert.ok(
    continuityFixtureSet.cases.some(
      (entry) => entry.id === "valid-authority-transfer",
    ),
  );
  assert.ok(
    continuityFixtureSet.cases.some(
      (entry) => entry.id === "valid-bae-supersession",
    ),
  );
  assert.ok(
    continuityFixtureSet.cases.some(
      (entry) => entry.id === "valid-bae-deprecation",
    ),
  );
});

test("source-continuity fixtures emit every declared stable rule", async (t) => {
  for (const caseRecord of continuityFixtureSet.cases) {
    await t.test(caseRecord.id, () => {
      const { result } = validateContinuityFixture(caseRecord);
      const expected = caseRecord.expected_rule_ids ?? [];
      const emitted = new Set(result.errors.map((entry) => entry.rule_id));
      if (expected.length === 0) {
        assert.equal(
          result.valid,
          true,
          `${caseRecord.id}: ${JSON.stringify(result.errors, null, 2)}`,
        );
      } else {
        for (const ruleId of expected) {
          assert.ok(
            emitted.has(ruleId),
            `${caseRecord.id} did not emit ${ruleId}: ${JSON.stringify(
              result.errors,
              null,
              2,
            )}`,
          );
        }
      }
    });
  }
});

test("occurrence projection is deterministic and excludes origin declarations", () => {
  const caseRecord = continuityFixtureSet.cases.find(
    (entry) => entry.id === "valid-current-authority",
  );
  const first = validateContinuityFixture(caseRecord);
  const second = validateContinuityFixture(caseRecord);
  assert.equal(first.result.valid, true);
  assert.deepEqual(first.result.occurrences, second.result.occurrences);
  assert.equal(first.result.origin_declaration_count, 1);
  assert.equal(first.result.occurrences.length, 1);
  assert.equal(first.result.occurrences[0].bae_id, "BAE-0001");
  assert.notEqual(
    first.result.occurrences[0].position_id,
    "macro-requirement.body.reference.scope-bae-origin-item",
  );
});

test("source-continuity validation leaves canonical inputs unchanged", () => {
  const caseRecord = continuityFixtureSet.cases.find(
    (entry) => entry.id === "valid-current-authority",
  );
  const input = applyOperations(
    continuityFixtureSet.base,
    caseRecord.operations,
  );
  const before = structuredClone(input);
  const existingSources = new Set(input.existing_sources.map(sourceKey));
  const evidenceIds = new Set(input.review_evidence_ids.map(String));
  validateBaseAnalysisSourceContinuity({
    inventory: input.inventory,
    documents: input.documents,
    profiles: input.profiles,
    sourceResolver: (source) => existingSources.has(sourceKey(source)),
    reviewEvidenceResolver: (id) => evidenceIds.has(String(id)),
  });
  assert.deepEqual(input, before);
});
