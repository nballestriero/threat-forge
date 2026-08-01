import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  governedDocumentModelCoherenceRuleIds,
  validateGovernedDocumentModelCoherence,
} from "../lib/governed-document-model-coherence-validation.mjs";
import { loadGovernedDocumentModelSourceSet } from "../lib/governed-document-model-sources.mjs";

/**
 * @file Deterministic verification of governed document cross-model coherence.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
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
const canonicalSourceSet = loadGovernedDocumentModelSourceSet({
  rootDir: repositoryRoot,
});
const fixtureRegistry = JSON.parse(
  fs.readFileSync(
    path.join(
      repositoryRoot,
      "tools/MR-0001/fixtures/governed-document-model-coherence/negative-fixtures.registry.json",
    ),
    "utf8",
  ),
);

function write(root, projectPath, text) {
  const target = path.join(root, ...projectPath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, "utf8");
}

function makeRoot() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "tf-governed-document-cross-model-"),
  );
  write(
    root,
    "docs/reference/project-model/registers/macro-requirements.registry.yml",
    `schema_version: 1
registry_id: governed-documentation-macro-requirements-registry
project: threat-forge
macro_requirements:
  - id: MR-0001
    title: Canonical macro
    status: draft
    macro_requirement_type: product
    body_path: docs/reference/project-model/body/macro-requirements/MR-0001_body.md
    decisions_registry_path: docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml
    requirements_registry_path: docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml
`,
  );
  write(
    root,
    "docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml",
    `schema_version: 1
registry_id: MR-0001-decisions-registry
macro_requirement_id: MR-0001

decisions:
  - id: ADR-0001
    title: Canonical decision
    status: draft
    macro_requirement_id: MR-0001
    body_path: docs/reference/project-model/body/decisions/MR-0001/ADR-0001_body.md
`,
  );
  write(
    root,
    "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
    `schema_version: 1
registry_id: MR-0001-requirements-registry
macro_requirement_id: MR-0001

requirements:
  - id: MR-0001ADR-0001REQ-0001
    title: Canonical functional requirement
    status: draft
    requirement_type: functional
    macro_requirement_id: MR-0001
    decision_id: ADR-0001
    body_path: docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001_body.md

  - id: MR-0001ADR-0001REQ-0001GOV-0001
    title: Canonical governance requirement
    status: draft
    requirement_type: governance
    macro_requirement_id: MR-0001
    decision_id: ADR-0001
    parent_requirement_id: MR-0001ADR-0001REQ-0001
    body_path: docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001GOV-0001_body.md
`,
  );
  write(
    root,
    "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
    "# MR-0001 — Canonical macro\n",
  );
  write(
    root,
    "docs/reference/project-model/body/decisions/MR-0001/ADR-0001_body.md",
    "# ADR-0001 — Canonical decision\n",
  );
  write(
    root,
    "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001_body.md",
    "# MR-0001ADR-0001REQ-0001 — Canonical functional requirement\n",
  );
  write(
    root,
    "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001GOV-0001_body.md",
    "# MR-0001ADR-0001REQ-0001GOV-0001 — Canonical governance requirement\n",
  );
  return root;
}

function applyFixture(root, fixture) {
  for (const operation of fixture.operations ?? []) {
    const target = path.join(root, ...operation.file.split("/"));
    if (operation.kind === "write") {
      write(root, operation.file, operation.content);
      continue;
    }
    const before = fs.readFileSync(target, "utf8");
    assert.ok(
      before.includes(operation.find),
      `fixture find text missing in ${operation.file}`,
    );
    fs.writeFileSync(
      target,
      before.replace(operation.find, operation.replace),
      "utf8",
    );
  }
}

function validate(root) {
  return validateGovernedDocumentModelCoherence({
    rootDir: root,
    sourceSet: canonicalSourceSet,
  });
}

test("accepts canonical governed-document cross-model coherence", () => {
  const root = makeRoot();
  try {
    const result = validate(root);
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(result.model_counts, {
      "macro-requirement": 1,
      decision: 1,
      "functional-requirement": 1,
      "governance-requirement": 1,
      "security-requirement": 0,
    });
    assert.deepEqual(result.provider_model_ids, Object.keys(result.model_counts));
    assert.equal(result.child_registries_checked, 2);
    assert.equal(result.bodies_checked, 4);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fails closed for an unknown Requirement discriminator", () => {
  const root = makeRoot();
  try {
    const registryPath =
      "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml";
    const absolute = path.join(root, ...registryPath.split("/"));
    fs.writeFileSync(
      absolute,
      fs.readFileSync(absolute, "utf8").replace(
        "requirement_type: functional",
        "requirement_type: experimental",
      ),
      "utf8",
    );
    const result = validate(root);
    assert.ok(
      result.diagnostics.some(
        (item) =>
          item.rule_id ===
          governedDocumentModelCoherenceRuleIds.requirementType,
      ),
    );
    assert.equal(result.model_counts["functional-requirement"], 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("publishes unique stable cross-model rule identifiers", () => {
  const values = Object.values(governedDocumentModelCoherenceRuleIds);
  assert.equal(new Set(values).size, values.length);
  assert.ok(
    values.every((value) => value.startsWith("governed-document.cross-model.")),
  );
});

for (const fixtureReference of fixtureRegistry.fixtures) {
  test(`negative fixture ${fixtureReference.id} triggers declared stable rules`, () => {
    const root = makeRoot();
    try {
      const fixture = JSON.parse(
        fs.readFileSync(
          path.join(repositoryRoot, fixtureReference.fixture_path),
          "utf8",
        ),
      );
      applyFixture(root, fixture);
      const diagnostics = validate(root).diagnostics;
      const observed = new Set(diagnostics.map((item) => item.rule_id));
      assert.ok(diagnostics.length > 0, "negative fixture unexpectedly passed");
      for (const expected of fixtureReference.expected_rule_ids) {
        assert.ok(
          observed.has(expected),
          `${fixtureReference.id} did not emit ${expected}; observed ${[...observed].join(", ")}`,
        );
      }
      assert.ok(
        diagnostics.every((item) =>
          Object.values(governedDocumentModelCoherenceRuleIds).includes(
            item.rule_id,
          ),
        ),
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
