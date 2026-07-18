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
import {
  materializeReferenceOccurrencesInRegistryText,
  readStoredReferenceOccurrences,
  requireValidReferenceOccurrenceMaterializationInput,
} from "../check-base-analysis-registry.mjs";

/**
 * @file Canonical BAE registry, source continuity, occurrence materialization and projection verification suite.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0005
 * @implementsRequirement MR-0003ADR-0001REQ-0005GOV-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @derivedFromDecision MR-0003/ADR-0002
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
      throw new Error(
        `Unsupported fixture operation: ${operation.operation}`,
      );
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

function currentAuthorityCase() {
  return continuityFixtureSet.cases.find(
    (entry) => entry.id === "valid-current-authority",
  );
}

function sampleOccurrence(overrides = {}) {
  return {
    bae_id: "BAE-0001",
    document_model: "macro-requirement",
    document_id: "MR-0001",
    body_path:
      "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
    profile_id: "macro-requirement-body",
    position_id:
      "macro-requirement.body.reference.scope-classified-item",
    line: 39,
    column: 13,
    source_offset: 3057,
    canonical_payload:
      "[BAE-0001] Governed project documentation",
    ...overrides,
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
      new Set(fixture.existing_sources.map(sourceKey)).has(
        sourceKey(source),
      ),
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
      (entry) =>
        entry.entity_type === "base_analysis_element" &&
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
      const emitted = new Set(
        result.errors.map((entry) => entry.rule_id),
      );
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
    new Set(fixture.existing_sources.map(sourceKey)).has(
      sourceKey(source),
    );
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
    values.every((value) =>
      value.startsWith("bae.source-continuity."),
    ),
  );
});

test("source-continuity fixtures cover positive and negative outcomes", () => {
  assert.equal(continuityFixtureSet.schema_version, 1);
  assert.ok(continuityFixtureSet.cases.length >= 15);
  for (const id of [
    "valid-authority-transfer",
    "valid-bae-supersession",
    "valid-bae-deprecation",
  ]) {
    assert.ok(
      continuityFixtureSet.cases.some((entry) => entry.id === id),
      `Missing source-continuity fixture ${id}.`,
    );
  }
});

test("source-continuity fixtures emit every declared stable rule", async (t) => {
  for (const caseRecord of continuityFixtureSet.cases) {
    await t.test(caseRecord.id, () => {
      const { result } = validateContinuityFixture(caseRecord);
      const expected = caseRecord.expected_rule_ids ?? [];
      const emitted = new Set(
        result.errors.map((entry) => entry.rule_id),
      );
      if (expected.length === 0) {
        assert.equal(
          result.valid,
          true,
          `${caseRecord.id}: ${JSON.stringify(
            result.errors,
            null,
            2,
          )}`,
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

test("a natural introductory citation is both origin evidence and an occurrence", () => {
  const first = validateContinuityFixture(currentAuthorityCase());
  const second = validateContinuityFixture(currentAuthorityCase());
  assert.equal(first.result.valid, true, JSON.stringify(first.result.errors, null, 2));
  assert.deepEqual(first.result.occurrences, second.result.occurrences);
  assert.equal(first.result.origin_evidence_count, 1);
  assert.equal(first.result.occurrences.length, 1);
  assert.equal(first.result.occurrences[0].bae_id, "BAE-0001");
  assert.equal(
    first.result.occurrences[0].canonical_payload,
    "[BAE-0001] Governed project documentation",
  );
});

test("source-continuity validation leaves canonical inputs unchanged", () => {
  const input = applyOperations(
    continuityFixtureSet.base,
    currentAuthorityCase().operations,
  );
  const before = structuredClone(input);
  const existingSources = new Set(
    input.existing_sources.map(sourceKey),
  );
  const evidenceIds = new Set(
    input.review_evidence_ids.map(String),
  );
  validateBaseAnalysisSourceContinuity({
    inventory: input.inventory,
    documents: input.documents,
    profiles: input.profiles,
    sourceResolver: (source) => existingSources.has(sourceKey(source)),
    reviewEvidenceResolver: (id) => evidenceIds.has(String(id)),
  });
  assert.deepEqual(input, before);
});

test("stored per-BAE occurrences flatten deterministically", () => {
  const occurrence = sampleOccurrence();
  const projection = readStoredReferenceOccurrences({
    elements: [
      {
        id: "BAE-0001",
        reference_occurrences: [structuredClone(occurrence)],
      },
    ],
  });
  assert.deepEqual(projection, [occurrence]);
});

test("occurrence materialization replaces only the managed field and is idempotent", () => {
  const registry =
    "schema_version: 1\n" +
    "registry_id: base-analysis-elements-registry\n" +
    "macro_requirement_id: MR-0003\n\n" +
    "elements:\n" +
    "  - id: BAE-0001\n" +
    "    title: Governed project documentation\n" +
    "    base_type: data_resource\n" +
    "    meaning: Canonical project knowledge.\n" +
    "    lifecycle_state: active\n" +
    "    origin:\n" +
    "      kind: governed_document\n" +
    "      source_id: MR-0001\n" +
    "      source_path: docs/origin.md\n" +
    "    authoritative_source:\n" +
    "      kind: governed_document\n" +
    "      source_id: MR-0001\n" +
    "      source_path: docs/origin.md\n" +
    "    reference_occurrences:\n" +
    "      - bae_id: BAE-0001\n" +
    "        document_model: stale\n" +
    "        document_id: stale\n" +
    "        body_path: stale.md\n" +
    "        profile_id: stale\n" +
    "        position_id: stale\n" +
    "        line: 1\n" +
    "        column: 1\n" +
    "        source_offset: 0\n" +
    "        canonical_payload: stale\n" +
    "    source_history:\n" +
    "      - sequence: 1\n" +
    "        outcome: continuity_confirmed\n" +
    "        previous_source:\n" +
    "          kind: governed_document\n" +
    "          source_id: MR-0001\n" +
    "          source_path: docs/origin.md\n" +
    "        next_source:\n" +
    "          kind: governed_document\n" +
    "          source_id: MR-0001\n" +
    "          source_path: docs/origin.md\n" +
    "        review_evidence_id: MR-0003/ADR-0002\n" +
    "    provenance: []\n\n" +
    "relations: []\n";
  const first = materializeReferenceOccurrencesInRegistryText(
    registry,
    [sampleOccurrence()],
  );
  const second = materializeReferenceOccurrencesInRegistryText(
    first,
    [sampleOccurrence()],
  );
  assert.equal(first, second);
  assert.match(first, /document_model: "macro-requirement"/u);
  assert.doesNotMatch(first, /document_model: stale/u);
  assert.match(first, /meaning: Canonical project knowledge\./u);
  assert.match(
    first,
    /canonical_payload: "\[BAE-0001\] Governed project documentation"/u,
  );
  assert.doesNotMatch(first, /canonical_payload: \[BAE-/u);
  assert.ok(
    first.indexOf("reference_occurrences:") <
      first.indexOf("source_history:"),
  );
});



test("occurrence materializer blocks a registered BAE missing from its origin body", () => {
  const caseRecord = continuityFixtureSet.cases.find(
    (entry) => entry.id === "missing-origin-declaration",
  );
  assert.ok(caseRecord, "Missing missing-origin-declaration fixture.");
  const { result } = validateContinuityFixture(caseRecord);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (entry) =>
        entry.rule_id ===
        baseAnalysisSourceContinuityRuleIds.originDeclarationMissing,
    ),
  );
  assert.throws(
    () =>
      requireValidReferenceOccurrenceMaterializationInput({
        valid: result.valid,
        errors: result.errors,
        occurrence_projection: result.occurrences,
      }),
    /historical origin body must contain exactly one canonical origin evidence/u,
  );
});

test("occurrence materialization cannot create an unregistered BAE", () => {
  const registry =
    "schema_version: 1\n" +
    "registry_id: base-analysis-elements-registry\n" +
    "macro_requirement_id: MR-0003\n\n" +
    "elements: []\n\n" +
    "relations: []\n";
  assert.throws(
    () =>
      materializeReferenceOccurrencesInRegistryText(registry, [
        sampleOccurrence({ bae_id: "BAE-9999" }),
      ]),
    /not manually registered/u,
  );
});
