import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSecurityRequirementAuthoringEditorSchema,
  buildSecurityRequirementAuthoringPreviewTask,
  mergeSecurityRequirementAuthoringEditorSettings,
  securityRequirementAuthoringCreateTaskLabel,
  securityRequirementAuthoringEditorRuleIds,
  securityRequirementAuthoringPreviewTaskLabel,
  securityRequirementAuthoringRequestGlob,
  securityRequirementAuthoringSchemaAssociationKey,
  securityRequirementAuthoringSchemaProjectPath,
  validateSecurityRequirementAuthoringEditorSchema,
  validateSecurityRequirementAuthoringEditorSettings,
  validateSecurityRequirementAuthoringEditorTasks,
} from "../lib/security-requirement-authoring-editor-assistance.mjs";
import {
  materializeSecurityRequirementAuthoringSchema,
} from "../materialize-security-requirement-authoring-schema.mjs";
import {
  securityRequirementRegistryVariantExpectation,
} from "../lib/security-requirement-model-validation.mjs";

/**
 * @file Security Requirement activation-candidate editor assistance verification.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0001
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 */

const parentA = "MR-0001ADR-0001REQ-0001";
const parentB = "MR-0001ADR-0002REQ-0001";
const fixtureSet = JSON.parse(
  fs.readFileSync(
    new URL(
      "../fixtures/security-requirement-authoring-editor/negative-fixtures.registry.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

function statusField() {
  return {
    id: "functional-requirement.registry.record.status",
    name: "status",
    order: 3,
    cardinality: "exactly_one",
    source_kind: "controlled",
    value_kind: "controlled_scalar",
    value_set_id: "FIELD-VALUE-SET-0008",
    description: "Requirement lifecycle",
    controlled_values: [
      { value: "draft", label: "Draft", meaning: "Draft record." },
      { value: "accepted", label: "Accepted", meaning: "Accepted record." },
    ],
  };
}

function requirementTypeField() {
  return {
    id: "functional-requirement.registry.record.requirement-type",
    name: "requirement_type",
    order: 4,
    cardinality: "exactly_one",
    source_kind: "controlled",
    value_kind: "controlled_scalar",
    value_set_id: "FIELD-VALUE-SET-0010",
    description: "Requirement type",
    controlled_values: [
      { value: "functional", label: "Functional", meaning: "Functional." },
      { value: "governance", label: "Governance", meaning: "Governance." },
    ],
  };
}

function requirement(id, title) {
  return {
    id,
    title,
    status: "accepted",
    requirement_type: "functional",
    model_id: "functional-requirement",
    parent_requirement_id: null,
    body_path: `docs/reference/project-model/body/requirements/MR-0001/${id}_body.md`,
  };
}

function activeCatalog() {
  const first = requirement(parentA, "Authenticate registered users");
  const second = requirement(parentB, "Authorize repository operations");
  return {
    schema_version: 2,
    catalog_id: "governed-document-authoring-catalog",
    sources: [],
    document_types: [
      {
        id: "macro-requirement",
        title: "Macro-requirement",
        record_fields: [],
        body_sections: [],
      },
      {
        id: "decision",
        title: "Decision",
        record_fields: [],
        body_sections: [],
      },
      {
        id: "functional-requirement",
        title: "Functional Requirement",
        record_fields: [statusField(), requirementTypeField()],
        body_sections: [],
      },
      {
        id: "governance-requirement",
        title: "Governance Requirement",
        record_fields: [],
        body_sections: [],
      },
    ],
    macro_requirements: [
      {
        id: "MR-0001",
        title: "Governed documentation",
        status: "active",
        macro_requirement_type: "product",
        body_path: "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
        decisions_registry_path:
          "docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml",
        requirements_registry_path:
          "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
        decisions: [
          {
            id: "ADR-0001",
            title: "Registered user boundary",
            status: "accepted",
            decision_type: "functional",
            body_path: "decision-one.md",
            requirements: [structuredClone(first)],
          },
          {
            id: "ADR-0002",
            title: "Repository operation boundary",
            status: "accepted",
            decision_type: "governance",
            body_path: "decision-two.md",
            requirements: [structuredClone(second)],
          },
        ],
        requirements: [structuredClone(first), structuredClone(second)],
      },
    ],
  };
}

function securityBodyProfile() {
  return {
    profile_id: "security-requirement-body",
    source_path_pattern:
      "docs/reference/project-model/body/requirements/MR-*/MR-*ADR-*REQ-*SEC-*_body.md",
    header: { template: "# {id} — {title}" },
    sections: [
      {
        id: "security-requirement.body.section.intent",
        heading: "Intent",
        order: 1,
        cardinality: "exactly_one",
        content_kind: "prose",
      },
      {
        id: "security-requirement.body.section.parent-functional-requirement",
        heading: "Parent Functional Requirement",
        order: 2,
        cardinality: "exactly_one",
        content_kind: "classified_label_list",
        minimum_items: 1,
        allowed_prefixes: ["Parent:"],
        terminal_punctuation: "forbidden",
      },
      {
        id: "security-requirement.body.section.finding-derivation",
        heading: "Finding derivation",
        order: 3,
        cardinality: "exactly_one",
        content_kind: "classified_label_list",
        minimum_items: 1,
        allowed_prefixes: ["Finding:"],
        terminal_punctuation: "forbidden",
      },
      {
        id: "security-requirement.body.section.security-obligation",
        heading: "Security obligation",
        order: 4,
        cardinality: "exactly_one",
        content_kind: "normative_list",
        minimum_items: 1,
        terminal_punctuation: "period",
      },
      {
        id: "security-requirement.body.section.scope",
        heading: "Scope",
        order: 5,
        cardinality: "exactly_one",
        content_kind: "classified_label_list",
        minimum_items: 1,
        allowed_prefixes: ["Includes:", "Excludes:"],
        terminal_punctuation: "forbidden",
      },
      {
        id: "security-requirement.body.section.acceptance",
        heading: "Acceptance",
        order: 6,
        cardinality: "exactly_one",
        content_kind: "acceptance_condition_list",
        minimum_items: 1,
        required_item_prefix: "The requirement is accepted when ",
        terminal_punctuation: "period",
      },
    ],
  };
}

function loadedSourceSet(activationState = "inactive") {
  return {
    activation_state: activationState,
    scaffold_sources_checked:
      activationState === "inactive" ? ["model", "profile"] : [],
    sourceSet: {
      models: [
        {
          value: {
            model_id: "security-requirement",
            title: "Security Requirement",
            description: "Methodology-neutral security obligation.",
          },
        },
      ],
      profiles: [
        {
          value: {
            profile_id: "requirement-registry",
            record_variants: [
              structuredClone(securityRequirementRegistryVariantExpectation),
            ],
          },
        },
        { value: securityBodyProfile() },
      ],
    },
  };
}

function finding(id, parentId, overrides = {}) {
  return {
    id,
    title: `Finding ${id.slice(-4)}`,
    review_state: "accepted",
    analysis_record_id: "ANALYSIS-0001",
    affected_subjects: [
      { kind: "functional_requirement", id: parentId },
    ],
    source_path: `analysis/${id}.analysis-finding.yml`,
    ...structuredClone(overrides),
  };
}

function candidate(entity) {
  return {
    id: entity.id,
    title: entity.title,
    entity_type: "common_analysis_finding",
    canonical_payload: `[${entity.id}] ${entity.title}`,
    entity: structuredClone(entity),
  };
}

function referenceService(overrides = {}) {
  const values = overrides.findings ?? [
    finding("FINDING-0001", parentA),
    finding("FINDING-0002", parentB),
    finding("FINDING-0003", parentA, {
      affected_subjects: [{ kind: "functional_requirement", id: parentB }],
    }),
    finding("FINDING-0004", parentA, { analysis_record_id: "" }),
  ];
  return {
    listEligibleCandidates({ currentDocument }) {
      return values
        .filter((entry) =>
          overrides.ignoreParent === true ||
          entry.affected_subjects.some(
            (subject) =>
              subject.kind === "functional_requirement" &&
              subject.id === currentDocument.parent_requirement_id,
          ) ||
          ["FINDING-0003", "FINDING-0004"].includes(entry.id),
        )
        .map(candidate);
    },
  };
}

function buildSchema(options = {}) {
  return buildSecurityRequirementAuthoringEditorSchema({
    rootDir: options.rootDir ?? process.cwd(),
    activeCatalog: options.catalog ?? activeCatalog(),
    loadedSourceSet: options.loadedSourceSet ?? loadedSourceSet(),
    referenceService: options.referenceService ?? referenceService(),
  });
}

function branch(schema) {
  return schema.oneOf[0];
}

function conditionForParent(schema, parentId) {
  return branch(schema).allOf.find(
    (entry) => entry.if?.properties?.parent_requirement_id?.const === parentId,
  );
}

function taskDocument(task = buildSecurityRequirementAuthoringPreviewTask()) {
  return { version: "2.0.0", tasks: [structuredClone(task)] };
}

test("publishes unique stable Security editor rule identifiers", () => {
  const values = Object.values(securityRequirementAuthoringEditorRuleIds);
  assert.equal(new Set(values).size, values.length);
  assert.equal(values.every((value) => value.startsWith("security-requirement.authoring.editor.")), true);
});

test("registers every negative fixture against a known stable rule", () => {
  const known = new Set(Object.values(securityRequirementAuthoringEditorRuleIds));
  assert.equal(fixtureSet.cases.length, 8);
  for (const fixture of fixtureSet.cases) {
    assert.equal(fixture.expected_rule_ids.length > 0, true);
    for (const ruleId of fixture.expected_rule_ids) assert.equal(known.has(ruleId), true);
  }
});

test("projects one dedicated inactive Security schema without mutating the active catalog", () => {
  const catalog = activeCatalog();
  const before = structuredClone(catalog);
  const schema = buildSchema({ catalog });
  assert.deepEqual(catalog, before);
  assert.equal(schema.oneOf.length, 1);
  assert.equal(branch(schema).properties.document_type.const, "security-requirement");
  assert.equal(schema["x-threatforge"].activation_state, "inactive");
  assert.equal(schema["x-threatforge"].create_available, false);

  const withoutFindings = buildSchema({
    referenceService: referenceService({ findings: [] }),
  });
  const emptyFindingItems = conditionForParent(withoutFindings, parentA)
    .then.properties.finding_ids.items;
  assert.deepEqual(emptyFindingItems.not, {});
  assert.equal(Object.prototype.hasOwnProperty.call(emptyFindingItems, "enum"), false);
});

test("request schema exposes only authored body inputs", () => {
  const properties = branch(buildSchema()).properties.body.properties;
  assert.deepEqual(Object.keys(properties).sort(), [
    "acceptance",
    "intent",
    "scope",
    "security_obligation",
  ]);
});

test("Functional parent completion is filtered by Macro-requirement and Decision", () => {
  const schema = buildSchema();
  const decisionOne = branch(schema).allOf.find(
    (entry) =>
      entry.if?.properties?.macro_requirement_id?.const === "MR-0001" &&
      entry.then?.properties?.decision_id,
  );
  assert.deepEqual(decisionOne.then.properties.decision_id.enum, [
    "ADR-0001",
    "ADR-0002",
  ]);
  const parentCondition = branch(schema).allOf.find(
    (entry) =>
      entry.if?.properties?.decision_id?.const === "ADR-0001" &&
      entry.then?.properties?.parent_requirement_id,
  );
  assert.deepEqual(parentCondition.then.properties.parent_requirement_id.enum, [parentA]);
});

test("Functional parent completion carries canonical hover descriptions", () => {
  const schema = buildSchema();
  const parentCondition = branch(schema).allOf.find(
    (entry) =>
      entry.if?.properties?.decision_id?.const === "ADR-0001" &&
      entry.then?.properties?.parent_requirement_id,
  );
  const parentSchema = parentCondition.then.properties.parent_requirement_id;
  assert.match(parentSchema.markdownEnumDescriptions[0], /Authenticate registered users/u);
  assert.match(parentSchema.markdownEnumDescriptions[0], /MR-0001\/ADR-0001/u);
});

test("Finding completion includes only accepted affected candidates with provenance", () => {
  const schema = buildSchema();
  const findingItems = conditionForParent(schema, parentA)
    .then.properties.finding_ids.items;
  assert.deepEqual(findingItems.enum, ["FINDING-0001"]);
});

test("Finding completion hover preserves review state and Analysis Record provenance", () => {
  const schema = buildSchema();
  const findingItems = conditionForParent(schema, parentA)
    .then.properties.finding_ids.items;
  assert.match(findingItems.markdownEnumDescriptions[0], /review_state: accepted/u);
  assert.match(findingItems.markdownEnumDescriptions[0], /ANALYSIS-0001/u);
  assert.match(findingItems.markdownEnumDescriptions[0], /analysis\/FINDING-0001/u);
});

test("materialization write and check modes are deterministic", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-security-editor-"));
  try {
    const schema = buildSchema({ rootDir });
    const build = () => structuredClone(schema);
    const first = materializeSecurityRequirementAuthoringSchema({
      rootDir,
      mode: "write",
      buildSchema: build,
    });
    const second = materializeSecurityRequirementAuthoringSchema({
      rootDir,
      mode: "write",
      buildSchema: build,
    });
    const checked = materializeSecurityRequirementAuthoringSchema({
      rootDir,
      mode: "check",
      buildSchema: build,
    });
    assert.equal(first.status, "created");
    assert.equal(second.status, "current");
    assert.equal(checked.status, "current");
    assert.equal(
      fs.existsSync(path.join(rootDir, securityRequirementAuthoringSchemaProjectPath)),
      true,
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("materialization check rejects missing and stale output", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-security-editor-"));
  try {
    const schema = buildSchema({ rootDir });
    const build = () => structuredClone(schema);
    assert.throws(
      () => materializeSecurityRequirementAuthoringSchema({ rootDir, mode: "check", buildSchema: build }),
      /materialization/u,
    );
    materializeSecurityRequirementAuthoringSchema({ rootDir, mode: "write", buildSchema: build });
    fs.writeFileSync(
      path.join(rootDir, securityRequirementAuthoringSchemaProjectPath),
      "{}\n",
    );
    assert.throws(
      () => materializeSecurityRequirementAuthoringSchema({ rootDir, mode: "check", buildSchema: build }),
      /stale/u,
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("schema routing merge is idempotent and preserves unrelated settings", () => {
  const initial = { "editor.wordWrap": "on", "yaml.schemas": { "./other.json": ["**/*.other.yml"] } };
  const first = mergeSecurityRequirementAuthoringEditorSettings(initial);
  const second = mergeSecurityRequirementAuthoringEditorSettings(first);
  assert.deepEqual(second, first);
  assert.equal(first["editor.wordWrap"], "on");
  assert.deepEqual(
    first["yaml.schemas"][securityRequirementAuthoringSchemaAssociationKey],
    [securityRequirementAuthoringRequestGlob],
  );
  validateSecurityRequirementAuthoringEditorSettings(first);
});

test("preview task delegates the active Security request without confirmation", () => {
  const task = buildSecurityRequirementAuthoringPreviewTask();
  assert.equal(task.label, securityRequirementAuthoringPreviewTaskLabel);
  assert.deepEqual(task.args, [
    "tools/MR-0002/run-security-requirement-authoring.mjs",
    "--preview",
    "--request",
    "${relativeFile}",
  ]);
  validateSecurityRequirementAuthoringEditorTasks(taskDocument(task));
});

test("preview-only routing rejects a premature Security create task", () => {
  const tasks = taskDocument();
  tasks.tasks.push({
    ...structuredClone(buildSecurityRequirementAuthoringPreviewTask()),
    label: securityRequirementAuthoringCreateTaskLabel,
    args: [
      "tools/MR-0002/run-security-requirement-authoring.mjs",
      "--create",
      "--request",
      "${relativeFile}",
    ],
  });
  assert.throws(
    () => validateSecurityRequirementAuthoringEditorTasks(tasks),
    new RegExp(securityRequirementAuthoringEditorRuleIds.activation, "u"),
  );
});

for (const fixture of fixtureSet.cases) {
  test(`negative fixture ${fixture.id} triggers its declared rule`, () => {
    const expected = fixture.expected_rule_ids[0];
    let action;
    switch (fixture.id) {
      case "unexpected-schema-id": {
        const schema = buildSchema();
        schema.$id = "urn:wrong";
        action = () => validateSecurityRequirementAuthoringEditorSchema(schema);
        break;
      }
      case "duplicate-parent-id": {
        const catalog = activeCatalog();
        catalog.macro_requirements[0].decisions[1].requirements[0].id = parentA;
        action = () => buildSchema({ catalog });
        break;
      }
      case "duplicate-finding-id": {
        const duplicate = finding("FINDING-0001", parentA);
        action = () => buildSchema({
          referenceService: referenceService({ findings: [duplicate, structuredClone(duplicate)] }),
        });
        break;
      }
      case "nonaccepted-finding-provider": {
        action = () => buildSchema({
          referenceService: referenceService({
            findings: [finding("FINDING-0001", parentA, { review_state: "proposed" })],
          }),
        });
        break;
      }
      case "inactive-create-advertised": {
        const schema = buildSchema();
        schema["x-threatforge"].create_available = true;
        action = () => validateSecurityRequirementAuthoringEditorSchema(schema);
        break;
      }
      case "missing-schema-association": {
        action = () => validateSecurityRequirementAuthoringEditorSettings({ "yaml.schemas": {} });
        break;
      }
      case "stale-preview-task": {
        const tasks = taskDocument();
        tasks.tasks[0].args[1] = "--create";
        action = () => validateSecurityRequirementAuthoringEditorTasks(tasks);
        break;
      }
      case "premature-create-task": {
        const tasks = taskDocument();
        tasks.tasks.push({
          ...structuredClone(buildSecurityRequirementAuthoringPreviewTask()),
          label: securityRequirementAuthoringCreateTaskLabel,
        });
        action = () => validateSecurityRequirementAuthoringEditorTasks(tasks);
        break;
      }
      default:
        throw new Error(`Unknown fixture: ${fixture.id}`);
    }
    assert.throws(action, new RegExp(expected.replaceAll(".", "\\."), "u"));
  });
}
