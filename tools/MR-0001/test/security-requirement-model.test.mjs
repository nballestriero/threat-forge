import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadSecurityRequirementValidationSourceSet,
  securityRequirementModelRuleIds,
  securityRequirementRegistryVariantExpectation,
  validateSecurityRequirementModel,
} from "../lib/security-requirement-model-validation.mjs";

/**
 * @file Deterministic verification of the Security Requirement model checker.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0009
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
      "tools/MR-0001/fixtures/security-requirement-model/negative-fixtures.registry.json",
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
            { name: "macro_requirement_id", order: 3 },
            { name: "requirements", order: 4 },
          ],
          record_variants: [
            structuredClone(securityRequirementRegistryVariantExpectation),
          ],
        },
      },
      {
        path: "security-requirement-body.profile.yml",
        value: {
          profile_id: "security-requirement-body",
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
              heading: "Parent Functional Requirement",
              order: 2,
              cardinality: "exactly_one",
              content_kind: "classified_label_list",
              minimum_items: 1,
              maximum_items: 1,
              allowed_prefixes: ["Parent:"],
              terminal_punctuation: "forbidden",
              duplicate_items: "forbidden",
            },
            {
              heading: "Finding derivation",
              order: 3,
              cardinality: "exactly_one",
              content_kind: "classified_label_list",
              minimum_items: 1,
              allowed_prefixes: ["Finding:"],
              terminal_punctuation: "forbidden",
              duplicate_items: "forbidden",
              explanatory_prose: "allowed",
            },
            {
              heading: "Security obligation",
              order: 4,
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
              order: 5,
              cardinality: "exactly_one",
              content_kind: "classified_label_list",
              minimum_items: 1,
              allowed_prefixes: ["Includes:", "Excludes:"],
              terminal_punctuation: "forbidden",
              duplicate_items: "forbidden",
            },
            {
              heading: "Acceptance",
              order: 6,
              cardinality: "exactly_one",
              content_kind: "acceptance_condition_list",
              minimum_items: 1,
              required_item_prefix: "The requirement is accepted when ",
              terminal_punctuation: "period",
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
    path.join(os.tmpdir(), "tf-security-requirement-model-"),
  );
  write(
    root,
    "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
    `schema_version: 2
field_value_sets:
  - id: FIELD-VALUE-SET-0008
    values:
      - value: draft
      - value: accepted
  - id: FIELD-VALUE-SET-0010
    values:
      - value: functional
      - value: governance
      - value: security
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

  - id: MR-0001ADR-0001REQ-0001SEC-0001
    title: Canonical security requirement
    status: draft
    requirement_type: security
    macro_requirement_id: MR-0001
    decision_id: ADR-0001
    parent_requirement_id: MR-0001ADR-0001REQ-0001
    body_path: docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001SEC-0001_body.md
`,
  );
  write(
    root,
    "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001SEC-0001_body.md",
    `# MR-0001ADR-0001REQ-0001SEC-0001 — Canonical security requirement

## Intent

Describe the methodology-independent security obligation.

## Parent Functional Requirement

- Parent: [MR-0001ADR-0001REQ-0001] Canonical functional requirement

## Finding derivation

- Finding: [FINDING-0002] Accepted canonical Finding

The accepted Finding justifies the security obligation.

## Security obligation

- ThreatForge must enforce one deterministic security constraint.

## Scope

- Includes: The governed Functional Requirement boundary
- Excludes: Methodology-specific classifications

## Acceptance

- The requirement is accepted when the deterministic security constraint is verified.
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

test("accepts a canonical synthetic Security Requirement model", () => {
  const root = makeRoot();
  try {
    assert.deepEqual(
      validateSecurityRequirementModel({
        rootDir: root,
        sourceSet: makeSourceSet(root),
      }).diagnostics,
      [],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("loads the repository scaffold without activating the canonical index", () => {
  const loaded = loadSecurityRequirementValidationSourceSet({
    rootDir: repositoryRoot,
  });
  assert.equal(loaded.activation_state, "inactive");
  assert.deepEqual(loaded.scaffold_sources_checked.length, 2);
  assert.ok(
    loaded.sourceSet.index.value.models.some(
      (entry) => entry.id === "security-requirement",
    ),
  );
});

test("publishes unique stable Security Requirement rule identifiers", () => {
  const ids = Object.values(securityRequirementModelRuleIds);
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
      const diagnostics = validateSecurityRequirementModel({
        rootDir: root,
        sourceSet: makeSourceSet(root),
      }).diagnostics;
      const rules = new Set(diagnostics.map((item) => item.rule_id));
      for (const expected of record.expected_rule_ids) {
        assert.ok(
          rules.has(expected),
          `${record.id} did not trigger ${expected}: ${JSON.stringify(diagnostics)}`,
        );
      }
      assert.ok(diagnostics.length > 0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
