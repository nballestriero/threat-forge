import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  baseAnalysisRegistryRuleIds,
  validateBaseAnalysisRegistrySources,
} from "../lib/base-analysis-registry.mjs";

/**
 * @file Canonical BAE registry and projection verification suite.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0005
 * @implementsRequirement MR-0003ADR-0001REQ-0005GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 */

const testPath = fileURLToPath(import.meta.url);
const fixturePath = path.resolve(
  path.dirname(testPath),
  "../fixtures/base-analysis-registry/negative-fixtures.json",
);
const fixtureSet = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

function sourceKey(source) {
  return [
    String(source?.source_kind ?? "").trim(),
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
    inventory: fixture.inventory,
    taxonomies: fixture.taxonomies,
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
    taxonomies: fixture.taxonomies,
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
