import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertSecurityRequirementActivationReadiness,
  buildSecurityRequirementActivationReadinessSnapshot,
  securityRequirementActivationReadinessProviderIds,
  securityRequirementActivationReadinessRuleIds,
  validateSecurityRequirementActivationReadiness,
} from "../lib/security-requirement-activation-readiness.mjs";

/**
 * @file Security Requirement integrated pre-activation readiness verification.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Proves integrated repository readiness, active-source immutability, exact
 * coordinated provider coverage and deterministic activation failure when any
 * one provider is missing, duplicated, unknown, divergent or not ready.
 */

const testPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(testPath), "..", "..", "..");
const fixturePath = path.resolve(
  rootDir,
  "tools/MR-0001/fixtures/security-requirement-activation-readiness/negative-fixtures.registry.json",
);
const canonicalSourcePaths = Object.freeze([
  "docs/reference/project-model/registers/document-models/document-models.registry.yml",
  "docs/reference/project-model/registers/document-models/profiles/requirement-registry.profile.yml",
  "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
  "docs/reference/project-model/registers/references/governed-entity-resolvers.registry.yml",
]);

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function provider(providerId) {
  return {
    provider_id: providerId,
    consumer_id: `${providerId}-consumer`,
    model_id: "security-requirement",
    activation_state: "inactive",
    ready: true,
    evidence: {},
  };
}

function validSnapshot(activeModelIds = [
  "decision",
  "functional-requirement",
  "governance-requirement",
  "macro-requirement",
]) {
  return {
    schema_version: 1,
    snapshot_id: "security-requirement-pre-activation-readiness",
    activation_state: "inactive",
    active_model_ids: [...activeModelIds],
    candidate_model_ids: [...activeModelIds, "security-requirement"],
    providers: securityRequirementActivationReadinessProviderIds.map(provider),
    atomic_activation_performed: false,
  };
}

function digestCanonicalSources() {
  const hash = crypto.createHash("sha256");
  for (const projectPath of [...canonicalSourcePaths].sort(compare)) {
    const absolute = path.resolve(rootDir, ...projectPath.split("/"));
    hash.update(projectPath);
    hash.update("\0");
    hash.update(fs.readFileSync(absolute));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function readFixtureRegistry() {
  const registry = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(registry.schema_version, 1);
  assert.equal(
    registry.registry_id,
    "security-requirement-activation-readiness-negative-fixtures",
  );
  assert.ok(Array.isArray(registry.fixtures));
  return registry;
}

function mutateSnapshot(source, mutation) {
  const snapshot = structuredClone(source);
  if (mutation.remove_provider_id) {
    snapshot.providers = snapshot.providers.filter(
      (entry) => entry.provider_id !== mutation.remove_provider_id,
    );
  }
  if (mutation.duplicate_provider_id) {
    const providerEntry = snapshot.providers.find(
      (entry) => entry.provider_id === mutation.duplicate_provider_id,
    );
    assert.ok(providerEntry);
    snapshot.providers.push(structuredClone(providerEntry));
  }
  if (mutation.add_unknown_provider_id) {
    snapshot.providers.push(provider(mutation.add_unknown_provider_id));
  }
  if (mutation.add_active_model_id) {
    snapshot.active_model_ids.push(mutation.add_active_model_id);
  }
  if (mutation.remove_candidate_model_id) {
    snapshot.candidate_model_ids = snapshot.candidate_model_ids.filter(
      (value) => value !== mutation.remove_candidate_model_id,
    );
  }
  if (mutation.activation_state) {
    snapshot.activation_state = mutation.activation_state;
  }
  if (mutation.not_ready_provider_id) {
    const providerEntry = snapshot.providers.find(
      (entry) => entry.provider_id === mutation.not_ready_provider_id,
    );
    assert.ok(providerEntry);
    providerEntry.ready = false;
  }
  if (mutation.wrong_model_provider_id) {
    const providerEntry = snapshot.providers.find(
      (entry) => entry.provider_id === mutation.wrong_model_provider_id,
    );
    assert.ok(providerEntry);
    providerEntry.model_id = "functional-requirement";
  }
  return snapshot;
}

test("repository providers form one read-only pre-activation readiness snapshot", async () => {
  const before = digestCanonicalSources();
  const snapshot = await buildSecurityRequirementActivationReadinessSnapshot({
    rootDir,
  });
  const report = assertSecurityRequirementActivationReadiness(snapshot);
  const after = digestCanonicalSources();

  assert.equal(report.pre_activation_ready, true);
  assert.equal(report.activation_state, "inactive");
  assert.equal(snapshot.atomic_activation_performed, false);
  assert.equal(snapshot.active_model_ids.includes("security-requirement"), false);
  assert.equal(
    snapshot.candidate_model_ids.filter(
      (value) => value === "security-requirement",
    ).length,
    1,
  );
  assert.deepEqual(
    snapshot.providers.map((entry) => entry.provider_id).sort(compare),
    [...securityRequirementActivationReadinessProviderIds].sort(compare),
  );
  assert.equal(after, before);
});

test("valid integrated readiness snapshot is accepted deterministically", () => {
  const snapshot = validSnapshot();
  const first = validateSecurityRequirementActivationReadiness(snapshot);
  const second = validateSecurityRequirementActivationReadiness(snapshot);
  assert.deepEqual(second, first);
  assert.equal(first.pre_activation_ready, true);
  assert.equal(first.diagnostics.length, 0);
  assert.deepEqual(snapshot, validSnapshot());
});

test("candidate inventory proof does not depend on a fixed active-model cardinality", () => {
  for (const activeModelIds of [
    ["model-a"],
    ["model-a", "model-b", "model-c", "model-d", "model-e", "model-f"],
  ]) {
    const report = validateSecurityRequirementActivationReadiness(
      validSnapshot(activeModelIds),
    );
    assert.equal(report.pre_activation_ready, true);
    assert.equal(report.active_models_checked, activeModelIds.length);
    assert.equal(report.candidate_models_checked, activeModelIds.length + 1);
  }
});

test("readiness provider and rule identifiers are stable and unique", () => {
  assert.equal(
    new Set(securityRequirementActivationReadinessProviderIds).size,
    securityRequirementActivationReadinessProviderIds.length,
  );
  const ruleIds = Object.values(securityRequirementActivationReadinessRuleIds);
  assert.equal(new Set(ruleIds).size, ruleIds.length);
  assert.ok(
    ruleIds.every((ruleId) =>
      ruleId.startsWith("security-requirement.activation-readiness."),
    ),
  );
});

test("negative fixture registry proves omission of every coordinated provider", () => {
  const registry = readFixtureRegistry();
  const missingProofIds = new Set(
    registry.fixtures
      .map((fixture) => fixture.mutation?.remove_provider_id)
      .filter(Boolean),
  );
  assert.deepEqual(
    [...missingProofIds].sort(compare),
    [...securityRequirementActivationReadinessProviderIds].sort(compare),
  );
  assert.equal(
    new Set(registry.fixtures.map((fixture) => fixture.id)).size,
    registry.fixtures.length,
  );
});

const fixtureRegistry = readFixtureRegistry();
for (const fixture of fixtureRegistry.fixtures) {
  test(`negative fixture ${fixture.id} emits every declared stable rule`, () => {
    const snapshot = mutateSnapshot(validSnapshot(), fixture.mutation ?? {});
    const report = validateSecurityRequirementActivationReadiness(snapshot);
    const actualRuleIds = new Set(
      report.diagnostics.map((entry) => entry.rule_id),
    );
    assert.equal(report.pre_activation_ready, false);
    for (const expectedRuleId of fixture.expected_rule_ids ?? []) {
      assert.equal(
        actualRuleIds.has(expectedRuleId),
        true,
        `${fixture.id} did not emit ${expectedRuleId}`,
      );
    }
    assert.throws(
      () => assertSecurityRequirementActivationReadiness(snapshot),
      /security-requirement\.activation-readiness/u,
    );
  });
}
