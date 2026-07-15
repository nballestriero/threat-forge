import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  functionalRequirementModelRuleIds,
  validateFunctionalRequirementModel,
} from "../lib/functional-requirement-model-validation.mjs";

/**
 * @file Deterministic verification of the Functional Requirement complete-model checker.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
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
      "tools/MR-0001/fixtures/functional-requirement-model/negative-fixtures.registry.json",
    ),
    "utf8",
  ),
);

function write(root, projectPath, text) {
  const target = path.join(root, ...projectPath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, "utf8");
}

function makeSourceSet(rootDir) {
  return {
    rootDir,
    profiles: [
      {
        path: "requirement-registry.profile.yml",
        value: {
          profile_id: "requirement-registry",
          root_fields: [
            { name: "schema_version", order: 1, fixed_value: 1 },
            {
              name: "registry_id",
              order: 2,
              template: "{macro_requirement_id}-requirements-registry",
            },
            {
              name: "macro_requirement_id",
              order: 3,
              pattern: "^MR-\\d{4}$",
            },
            { name: "requirements", order: 4 },
          ],
          record_variants: [
            {
              model_id: "functional-requirement",
              discriminator_field: "requirement_type",
              discriminator_value: "functional",
              fields: [
                {
                  name: "id",
                  order: 1,
                  pattern: "^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}$",
                },
                { name: "title", order: 2 },
                {
                  name: "status",
                  order: 3,
                  value_set_id: "FIELD-VALUE-SET-0008",
                },
                {
                  name: "requirement_type",
                  order: 4,
                  value_set_id: "FIELD-VALUE-SET-0010",
                  required_value: "functional",
                },
                { name: "macro_requirement_id", order: 5 },
                { name: "decision_id", order: 6 },
                {
                  name: "body_path",
                  order: 7,
                  template:
                    "docs/reference/project-model/body/requirements/{macro_requirement_id}/{id}_body.md",
                },
              ],
              forbidden_fields: ["parent_requirement_id"],
            },
          ],
        },
      },
      {
        path: "functional-requirement-body.profile.yml",
        value: {
          profile_id: "functional-requirement-body",
          header: { template: "# {id} — {title}" },
          sections: [
            {
              heading: "Intent",
              order: 1,
              cardinality: "exactly_one",
              content_kind: "prose",
              minimum_paragraphs: 1,
              normative_keywords: "forbidden",
            },
            {
              heading: "Functional obligation",
              order: 2,
              cardinality: "exactly_one",
              content_kind: "normative_list",
              minimum_items: 1,
              item_subject: "explicit",
              normative_keywords: ["must", "must not"],
              obligations_per_item: "exactly_one",
              terminal_punctuation: "period",
            },
            {
              heading: "Scope",
              order: 3,
              cardinality: "exactly_one",
              content_kind: "classified_label_list",
              minimum_items: 1,
              allowed_prefixes: ["Includes:", "Excludes:"],
              terminal_punctuation: "forbidden",
              normative_keywords: "forbidden",
              duplicate_items: "forbidden",
            },
            {
              heading: "Acceptance",
              order: 4,
              cardinality: "exactly_one",
              content_kind: "acceptance_condition_list",
              minimum_items: 1,
              required_item_prefix: "The requirement is accepted when ",
              conditions_per_item: "exactly_one",
              terminal_punctuation: "period",
              forbidden_normative_keywords: [
                "shall",
                "shall not",
                "should",
                "should not",
                "may",
              ],
            },
          ],
        },
      },
    ],
  };
}

function makeRoot() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "tf-functional-requirement-model-"),
  );

  write(
    root,
    "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
    `schema_version: 2
field_value_sets:
  - id: FIELD-VALUE-SET-0008
    values:
      - value: draft
        label: Draft
      - value: accepted
        label: Accepted
  - id: FIELD-VALUE-SET-0010
    values:
      - value: functional
      - value: governance
`,
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
`,
  );
  write(
    root,
    "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001_body.md",
    `# MR-0001ADR-0001REQ-0001 — Canonical functional requirement

## Intent

Describe the canonical functional outcome.

## Functional obligation

- ThreatForge must produce one deterministic result.

## Scope

- Includes: canonical functional behavior
- Excludes: unrelated governance behavior

## Acceptance

- The requirement is accepted when the deterministic result is available.
`,
  );

  return root;
}

function applyFixture(root, fixture) {
  for (const operation of fixture.operations ?? []) {
    const target = path.join(root, ...operation.file.split("/"));
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

test("accepts a canonical Functional Requirement logical model", () => {
  const root = makeRoot();
  try {
    assert.deepEqual(
      validateFunctionalRequirementModel({
        rootDir: root,
        sourceSet: makeSourceSet(root),
      }).diagnostics,
      [],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("publishes unique stable Functional Requirement rule identifiers", () => {
  const ids = Object.values(functionalRequirementModelRuleIds);
  assert.equal(new Set(ids).size, ids.length);
});

for (const record of fixtureRegistry.fixtures) {
  test(`negative fixture ${record.id} triggers declared stable rules`, () => {
    const root = makeRoot();
    try {
      const fixture = JSON.parse(
        fs.readFileSync(
          path.join(repositoryRoot, ...record.fixture_path.split("/")),
          "utf8",
        ),
      );
      applyFixture(root, fixture);
      const diagnostics = validateFunctionalRequirementModel({
        rootDir: root,
        sourceSet: makeSourceSet(root),
      }).diagnostics;
      const rules = new Set(diagnostics.map((item) => item.rule_id));
      for (const expected of record.expected_rule_ids) {
        assert.ok(
          rules.has(expected),
          `${record.id} did not trigger ${expected}`,
        );
      }
      assert.ok(diagnostics.length > 0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
