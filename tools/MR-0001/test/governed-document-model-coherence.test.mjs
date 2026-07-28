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

/**
 * @file Deterministic verification of governed document cross-model coherence.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @implementsRequirement MR-0002ADR-0004REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 */

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
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

test("accepts canonical governed-document cross-model coherence", () => {
  const root = makeRoot();
  try {
    const result = validateGovernedDocumentModelCoherence({ rootDir: root });
    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.macro_requirements_checked, 1);
    assert.equal(result.decisions_checked, 1);
    assert.equal(result.functional_requirements_checked, 1);
    assert.equal(result.governance_requirements_checked, 1);
    assert.equal(result.child_registries_checked, 2);
    assert.equal(result.bodies_checked, 4);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("publishes unique stable cross-model rule identifiers", () => {
  const values = Object.values(governedDocumentModelCoherenceRuleIds);
  assert.equal(new Set(values).size, values.length);
  assert.ok(values.every((value) => value.startsWith("governed-document.cross-model.")));
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
      const diagnostics = validateGovernedDocumentModelCoherence({
        rootDir: root,
      }).diagnostics;
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
          Object.values(governedDocumentModelCoherenceRuleIds).includes(item.rule_id),
        ),
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
