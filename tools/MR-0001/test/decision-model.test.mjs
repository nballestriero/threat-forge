import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  decisionModelRuleIds,
  validateDecisionModel,
} from "../lib/decision-model-validation.mjs";

/**
 * @file Deterministic verification of the Decision complete-model checker.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
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
      "tools/MR-0001/fixtures/decision-model/negative-fixtures.registry.json",
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
        path: "decision-registry.profile.yml",
        value: {
          profile_id: "decision-registry",
          root_fields: [
            {
              name: "schema_version",
              order: 1,
              fixed_value: 1,
            },
            {
              name: "registry_id",
              order: 2,
              template: "{macro_requirement_id}-decisions-registry",
            },
            {
              name: "macro_requirement_id",
              order: 3,
              pattern: "^MR-\\d{4}$",
            },
            {
              name: "decisions",
              order: 4,
            },
          ],
          record_fields: [
            {
              name: "id",
              order: 1,
              pattern: "^ADR-\\d{4}$",
            },
            { name: "title", order: 2 },
            {
              name: "status",
              order: 3,
              value_set_id: "FIELD-VALUE-SET-0007",
            },
            {
              name: "decision_type",
              order: 4,
              value_set_id: "FIELD-VALUE-SET-0014",
            },
            { name: "author", order: 5 },
            {
              name: "date",
              order: 6,
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            },
            {
              name: "macro_requirement_id",
              order: 7,
            },
            {
              name: "body_path",
              order: 8,
              template:
                "docs/reference/project-model/body/decisions/{macro_requirement_id}/{id}_body.md",
            },
          ],
        },
      },
      {
        path: "decision-body.profile.yml",
        value: {
          profile_id: "decision-body",
          header: {
            template: "# {id} — {title}",
          },
          sections: [
            {
              heading: "Status",
              order: 1,
              cardinality: "exactly_one",
              content_kind: "controlled_scalar_label",
            },
            {
              heading: "Context",
              order: 2,
              cardinality: "exactly_one",
              content_kind: "prose",
              minimum_paragraphs: 1,
              normative_keywords: "forbidden",
            },
            {
              heading: "Decision",
              order: 3,
              cardinality: "exactly_one",
              content_kind: "decision_prose",
              minimum_paragraphs: 1,
              normative_keywords: "forbidden",
            },
            {
              heading: "Consequences",
              order: 4,
              cardinality: "exactly_one",
              content_kind: "classified_sentence_list",
              minimum_items: 1,
              allowed_prefixes: [
                "Benefit:",
                "Cost:",
                "Risk:",
                "Constraint:",
              ],
              terminal_punctuation: "period",
              duplicate_items: "forbidden",
            },
            {
              heading: "Non-goals",
              order: 5,
              cardinality: "zero_or_one",
              content_kind: "label_list",
              minimum_items_when_present: 1,
              terminal_punctuation: "forbidden",
              normative_keywords: "forbidden",
              duplicate_items: "forbidden",
            },
          ],
        },
      },
    ],
  };
}

function makeRoot() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "tf-decision-model-"),
  );

  write(
    root,
    "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
    `schema_version: 2
field_value_sets:
  - id: FIELD-VALUE-SET-0007
    values:
      - value: draft
        label: Draft
      - value: accepted
        label: Accepted
  - id: FIELD-VALUE-SET-0014
    values:
      - value: structural
      - value: behavioral
      - value: operational
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
    status: draft
    decision_type: structural
    author: Example Author
    date: 2026-07-15
    macro_requirement_id: MR-0001
    body_path: docs/reference/project-model/body/decisions/MR-0001/ADR-0001_body.md
`,
  );
  write(
    root,
    "docs/reference/project-model/body/decisions/MR-0001/ADR-0001_body.md",
    `# ADR-0001 — Canonical decision

## Status

Draft

## Context

Canonical context without normative wording.

## Decision

ThreatForge adopts the canonical option.

## Consequences

- Benefit: The outcome is deterministic.
- Cost: The format is explicit.

## Non-goals

- Broader workflow automation
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

test("accepts a canonical Decision logical model", () => {
  const root = makeRoot();
  try {
    assert.deepEqual(
      validateDecisionModel({
        rootDir: root,
        sourceSet: makeSourceSet(root),
      }).diagnostics,
      [],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("publishes unique stable Decision rule identifiers", () => {
  const ids = Object.values(decisionModelRuleIds);
  assert.equal(new Set(ids).size, ids.length);
});

for (const record of fixtureRegistry.fixtures) {
  test(`negative fixture ${record.id} triggers declared stable rules`, () => {
    const root = makeRoot();
    try {
      const fixture = JSON.parse(
        fs.readFileSync(
          path.join(
            repositoryRoot,
            ...record.fixture_path.split("/"),
          ),
          "utf8",
        ),
      );
      applyFixture(root, fixture);
      const diagnostics = validateDecisionModel({
        rootDir: root,
        sourceSet: makeSourceSet(root),
      }).diagnostics;
      const rules = new Set(
        diagnostics.map((item) => item.rule_id),
      );
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
