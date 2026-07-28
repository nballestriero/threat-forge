import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createGovernedEntityReferenceService,
  governedEntityReferenceRuleIds,
  parseCanonicalGovernedReferencePayload,
  serializeGovernedReferencePayload,
  validateGovernedEntityResolverRegistry,
} from "../lib/governed-entity-references.mjs";
import {
  commonAnalysisFindingReferenceProviderIds,
  createCommonAnalysisFindingReferenceProviders,
} from "../../MR-0005/lib/common-analysis-finding-reference-eligibility.mjs";

/**
 * @file Governed entity reference grammar and resolver verification suite.
 *
 * @implementsRequirement MR-0001ADR-0008REQ-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0002
 * @implementsRequirement MR-0001ADR-0008REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0008
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 */

const testPath = fileURLToPath(import.meta.url);
const fixturePath = path.resolve(
  path.dirname(testPath),
  "../fixtures/governed-entity-references/negative-fixtures.json",
);
const fixtureSet = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

function registry(overrides = {}) {
  return {
    schema_version: 1,
    registry_id: "governed-entity-resolvers-registry",
    scope: "governed_entity_reference_resolution",
    resolvers: [
      {
        id: "base-analysis-element-reference-resolver",
        entity_type: "base_analysis_element",
        status: "active",
        identifier_pattern: "^BAE-[0-9]{4}$",
        source_projection_provider: "bae-source",
        eligibility_provider: "bae-eligibility",
      },
    ],
    ...overrides,
  };
}

function serviceForFixture(fixture) {
  return createGovernedEntityReferenceService({
    registry: registry(),
    sourceProjectionProviders: new Map([
      ["bae-source", () => structuredClone(fixture.projection)],
    ]),
    eligibilityProviders: new Map([
      [
        "bae-eligibility",
        () => ({
          eligible: fixture.eligible,
          reason: fixture.eligible ? "" : "Fixture entity is ineligible.",
        }),
      ],
    ]),
  });
}
function commonFindingService(projection) {
  const providers = createCommonAnalysisFindingReferenceProviders({
    rootDir: "synthetic-common-finding-root",
    loadProjection: () => projection,
  });
  return createGovernedEntityReferenceService({
    registry: registry({
      resolvers: [
        {
          id: "common-analysis-finding-reference-resolver",
          entity_type: "common_analysis_finding",
          status: "active",
          identifier_pattern: "^FINDING-\\d{4}$",
          source_projection_provider:
            commonAnalysisFindingReferenceProviderIds.sourceProjection,
          eligibility_provider:
            commonAnalysisFindingReferenceProviderIds.eligibility,
        },
      ],
    }),
    sourceProjectionProviders: providers.sourceProjectionProviders,
    eligibilityProviders: providers.eligibilityProviders,
  });
}

function finding(id, title, reviewState, sourcePath = `analysis/${id}.analysis-finding.yml`) {
  return { id, title, review_state: reviewState, source_path: sourcePath };
}

function findingRequest() {
  return {
    allowedEntityTypes: ["common_analysis_finding"],
    currentDocument: { id: "MR-0001ADR-0009REQ-0001" },
    positionId: "finding-derivation",
  };
}


test("publishes unique stable governed reference rule identifiers", () => {
  const values = Object.values(governedEntityReferenceRuleIds);
  assert.equal(new Set(values).size, values.length);
  assert.ok(values.every((value) => value.startsWith("governed-reference.")));
});

test("parses and serializes the canonical payload", () => {
  assert.deepEqual(
    parseCanonicalGovernedReferencePayload("[BAE-0001] Web API"),
    { valid: true, id: "BAE-0001", title: "Web API" },
  );
  assert.equal(
    serializeGovernedReferencePayload({ id: "BAE-0001", title: "Web API" }),
    "[BAE-0001] Web API",
  );
});

test("rejects duplicate active resolvers", () => {
  const duplicate = registry();
  duplicate.resolvers.push(structuredClone(duplicate.resolvers[0]));
  duplicate.resolvers[1].id = "duplicate-bae-resolver";
  const result = validateGovernedEntityResolverRegistry({
    registry: duplicate,
    sourceProjectionProviders: new Map([["bae-source", () => []]]),
    eligibilityProviders: new Map([["bae-eligibility", () => true]]),
  });
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (entry) =>
        entry.rule_id === governedEntityReferenceRuleIds.duplicateResolver,
    ),
  );
});

test("rejects resolver registrations without providers", () => {
  const result = validateGovernedEntityResolverRegistry({
    registry: registry(),
    sourceProjectionProviders: new Map(),
    eligibilityProviders: new Map(),
  });
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (entry) =>
        entry.rule_id === governedEntityReferenceRuleIds.missingProvider,
    ),
  );
});

test("positive and negative fixtures emit deterministic rule identifiers", async (t) => {
  for (const fixture of fixtureSet.cases) {
    await t.test(fixture.id, () => {
      const service = serviceForFixture(fixture);
      const first = service.analyzePayload({
        payload: fixture.payload,
        allowedEntityTypes: fixture.allowed_entity_types,
        currentDocument: { id: "MR-0001" },
        positionId: "fixture-position",
      });
      const second = service.analyzePayload({
        payload: fixture.payload,
        allowedEntityTypes: fixture.allowed_entity_types,
        currentDocument: { id: "MR-0001" },
        positionId: "fixture-position",
      });
      assert.deepEqual(first, second);
      assert.deepEqual(
        (first.diagnostics ?? []).map((entry) => entry.rule_id),
        fixture.expected_rule_ids,
      );
      if (fixture.expected_canonical_payload) {
        assert.equal(
          first.canonical_payload,
          fixture.expected_canonical_payload,
        );
      }
    });
  }
});

test("reference resolution leaves source projections unchanged", () => {
  const fixture = fixtureSet.cases[0];
  const before = structuredClone(fixture.projection);
  serviceForFixture(fixture).analyzePayload({
    payload: fixture.payload,
    allowedEntityTypes: fixture.allowed_entity_types,
    currentDocument: { id: "MR-0001" },
    positionId: "fixture-position",
  });
  assert.deepEqual(fixture.projection, before);
});

test("active Common Finding resolver enforces lifecycle and canonical title", () => {
  const service = commonFindingService([
    finding("FINDING-0001", "Accepted authentication gap", "accepted"),
    finding("FINDING-0002", "Proposed logging gap", "proposed"),
    finding("FINDING-0003", "Rejected transport concern", "rejected"),
  ]);
  const request = findingRequest();

  const accepted = service.analyzePayload({
    ...request,
    payload: "[FINDING-0001] Accepted authentication gap",
  });
  assert.equal(accepted.valid, true);
  assert.equal(accepted.entity_type, "common_analysis_finding");
  assert.equal(accepted.eligibility.review_state, "accepted");

  for (const [id, title, reviewState] of [
    ["FINDING-0002", "Proposed logging gap", "proposed"],
    ["FINDING-0003", "Rejected transport concern", "rejected"],
  ]) {
    const result = service.analyzePayload({
      ...request,
      payload: `[${id}] ${title}`,
    });
    assert.equal(result.eligibility.review_state, reviewState);
    assert.deepEqual(
      result.diagnostics.map(({ rule_id: ruleId }) => ruleId),
      [governedEntityReferenceRuleIds.ineligibleEntity],
    );
  }

  const divergent = service.analyzePayload({
    ...request,
    payload: "[FINDING-0001] Outdated title",
  });
  assert.equal(
    divergent.canonical_payload,
    "[FINDING-0001] Accepted authentication gap",
  );
  assert.deepEqual(
    divergent.diagnostics.map(({ rule_id: ruleId }) => ruleId),
    [governedEntityReferenceRuleIds.titleDivergence],
  );
  assert.deepEqual(
    service.listEligibleCandidates(request).map(({ id }) => id),
    ["FINDING-0001"],
  );
});

test("active Common Finding resolver preserves ambiguity and immutability", () => {
  const projection = [
    finding(
      "FINDING-0001",
      "First duplicate title",
      "accepted",
      "analysis/a/FINDING-0001.analysis-finding.yml",
    ),
    finding(
      "FINDING-0001",
      "Second duplicate title",
      "accepted",
      "analysis/b/FINDING-0001.analysis-finding.yml",
    ),
    finding("FINDING-0002", "Unique accepted finding", "accepted"),
  ];
  const before = structuredClone(projection);
  const service = commonFindingService(projection);
  const request = findingRequest();

  const ambiguous = service.analyzePayload({
    ...request,
    payload: "[FINDING-0001] First duplicate title",
  });
  assert.deepEqual(
    ambiguous.diagnostics.map(({ rule_id: ruleId }) => ruleId),
    [governedEntityReferenceRuleIds.ambiguousIdentifier],
  );

  const first = service.listEligibleCandidates(request);
  assert.deepEqual(first.map(({ id }) => id), ["FINDING-0002"]);
  first[0].entity.title = "Consumer mutation";

  assert.equal(
    service.listEligibleCandidates(request)[0].entity.title,
    "Unique accepted finding",
  );
  assert.deepEqual(projection, before);
});
