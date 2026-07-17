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
