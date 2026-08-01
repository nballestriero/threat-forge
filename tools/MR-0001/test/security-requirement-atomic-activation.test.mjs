import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildSecurityRequirementAtomicActivationSnapshot,
  securityRequirementAtomicActivationProviderIds,
  securityRequirementAtomicActivationRuleIds,
  validateSecurityRequirementAtomicActivationSnapshot,
} from "../lib/security-requirement-atomic-activation.mjs";

/**
 * @file Security Requirement atomic canonical activation verification suite.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 */

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const fixtureSet = JSON.parse(
  fs.readFileSync(
    path.join(
      repositoryRoot,
      "tools/MR-0001/fixtures/security-requirement-atomic-activation/negative-fixtures.registry.json",
    ),
    "utf8",
  ),
);

function provider(id, models = ["security-requirement"]) {
  return { id, model_ids: models, ready: true };
}

function validSnapshot() {
  const activeModels = [
    "macro-requirement",
    "decision",
    "functional-requirement",
    "governance-requirement",
    "security-requirement",
  ];
  return {
    activation_state: "active",
    active_model_ids: activeModels,
    active_profile_ids: [
      "macro-requirement-registry",
      "macro-requirement-body",
      "decision-registry",
      "decision-body",
      "requirement-registry",
      "functional-requirement-body",
      "governance-requirement-body",
      "security-requirement-body",
    ],
    requirement_variant_ids: ["security-requirement"],
    requirement_type_values: ["functional", "governance", "security"],
    complete_model_diagnostics: [],
    runtime_authoring_model_ids: activeModels,
    schema_authoring_model_ids: activeModels,
    generic_schema_model_ids: activeModels,
    dedicated_schema_activation_state: "active",
    dedicated_schema_create_available: true,
    security_create_task_present: true,
    target_validation_model_ids: activeModels,
    markdown_assistance_model_ids: activeModels,
    security_requirement_record_count: 0,
    providers: securityRequirementAtomicActivationProviderIds.map((id) =>
      id === "governed-reference-service"
        ? provider(id, ["functional_requirement", "common_analysis_finding"])
        : provider(id),
    ),
  };
}

function mutate(snapshot, mutation) {
  const value = structuredClone(snapshot);
  if (mutation.startsWith("remove-provider:")) {
    const id = mutation.slice("remove-provider:".length);
    value.providers = value.providers.filter((entry) => entry.id !== id);
  } else if (mutation.startsWith("duplicate-provider:")) {
    const id = mutation.slice("duplicate-provider:".length);
    value.providers.push(structuredClone(value.providers.find((entry) => entry.id === id)));
  } else if (mutation === "add-unknown-provider") {
    value.providers.push(provider("unknown-provider"));
  } else if (mutation === "remove-active-security-model") {
    value.active_model_ids = value.active_model_ids.filter((id) => id !== "security-requirement");
  } else if (mutation === "remove-active-security-profile") {
    value.active_profile_ids = value.active_profile_ids.filter((id) => id !== "security-requirement-body");
  } else if (mutation === "remove-security-variant") {
    value.requirement_variant_ids = [];
  } else if (mutation === "remove-security-taxonomy") {
    value.requirement_type_values = value.requirement_type_values.filter((id) => id !== "security");
  } else if (mutation === "create-security-record") {
    value.security_requirement_record_count = 1;
  } else {
    throw new Error(`Unsupported mutation: ${mutation}`);
  }
  return value;
}

test("repository exposes one fully coordinated active Security Requirement snapshot", () => {
  const snapshot = buildSecurityRequirementAtomicActivationSnapshot({
    rootDir: repositoryRoot,
  });
  const result = validateSecurityRequirementAtomicActivationSnapshot(snapshot);
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics));
  assert.equal(snapshot.activation_state, "active");
  assert.equal(snapshot.active_model_ids.includes("security-requirement"), true);
  assert.equal(snapshot.security_create_task_present, true);
  assert.equal(snapshot.security_requirement_record_count, 0);
});

test("generic schema builder completes without an ESM top-level-await cycle", () => {
  const result = spawnSync(
    process.execPath,
    ["tools/MR-0002/build-governed-document-authoring-schema.mjs"],
    { cwd: repositoryRoot, encoding: "utf8", windowsHide: true },
  );
  assert.equal(
    result.status,
    0,
    `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  );
  assert.doesNotMatch(
    String(result.stderr ?? ""),
    /unsettled top-level await|exit code 13/iu,
  );
  const schema = JSON.parse(result.stdout);
  assert.equal(
    schema["x-threatforge"].supported_document_types.includes(
      "security-requirement",
    ),
    true,
  );
});

test("valid atomic activation snapshot is deterministic and accepted", () => {
  const first = validSnapshot();
  const second = structuredClone(first);
  assert.deepEqual(
    validateSecurityRequirementAtomicActivationSnapshot(first),
    validateSecurityRequirementAtomicActivationSnapshot(second),
  );
  assert.equal(validateSecurityRequirementAtomicActivationSnapshot(first).valid, true);
});

test("stable rule and provider identifiers are unique", () => {
  const rules = Object.values(securityRequirementAtomicActivationRuleIds);
  assert.equal(new Set(rules).size, rules.length);
  assert.equal(new Set(securityRequirementAtomicActivationProviderIds).size, securityRequirementAtomicActivationProviderIds.length);
});

test("negative fixture registry is complete and uniquely identified", () => {
  assert.equal(fixtureSet.schema_version, 1);
  assert.equal(
    fixtureSet.fixture_set_id,
    "security-requirement-atomic-activation-negative-fixtures",
  );
  const ids = fixtureSet.cases.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(fixtureSet.cases.length, 15);
});

for (const fixture of fixtureSet.cases) {
  test(`negative fixture ${fixture.id} emits every declared stable rule`, () => {
    const result = validateSecurityRequirementAtomicActivationSnapshot(
      mutate(validSnapshot(), fixture.mutation),
    );
    assert.equal(result.valid, false);
    const rules = new Set(result.diagnostics.map((entry) => entry.rule_id));
    for (const ruleId of fixture.expected_rule_ids) {
      assert.equal(rules.has(ruleId), true, `${fixture.id} missing ${ruleId}`);
    }
  });
}
