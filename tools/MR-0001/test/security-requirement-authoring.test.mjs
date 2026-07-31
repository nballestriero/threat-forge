import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertSecurityRequirementCreationAllowed,
  buildSecurityRequirementAuthoringCatalog,
  createSecurityRequirementAuthoringProvider,
  normalizeSecurityRequirementAuthoringRequest,
  planSecurityRequirementAuthoring,
  securityRequirementAuthoringRuleIds,
} from "../lib/security-requirement-authoring-provider.mjs";
import {
  securityRequirementRegistryVariantExpectation,
} from "../lib/security-requirement-model-validation.mjs";
import {
  governedDocumentAuthoringProviders,
  validateGovernedDocumentAuthoringProviderCoverage,
} from "../../MR-0002/create-governed-document.mjs";
import {
  executeSecurityRequirementAuthoring,
} from "../../MR-0002/run-security-requirement-authoring.mjs";

/**
 * @file Security Requirement governed authoring verification suite.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0001
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Verifies candidate catalog isolation, exact provider coverage, canonical
 * parent and Finding selection, deterministic SEC registry/body generation,
 * preview immutability and create fail-closed behavior before activation.
 */

const parentId = "MR-0001ADR-0001REQ-0001";
const parentTitle = "Authenticate registered users";
const fixtureSet = JSON.parse(
  fs.readFileSync(
    new URL(
      "../fixtures/security-requirement-authoring/negative-fixtures.registry.json",
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

function activeCatalog() {
  const documentTypes = [
    "macro-requirement",
    "decision",
    "functional-requirement",
    "governance-requirement",
  ].map((id) => ({
    id,
    title: id,
    record_fields:
      id === "functional-requirement"
        ? [statusField(), requirementTypeField()]
        : [],
    body_sections: [],
  }));
  return {
    schema_version: 2,
    catalog_id: "governed-document-authoring-catalog",
    sources: [],
    document_types: documentTypes,
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
            body_path:
              "docs/reference/project-model/body/decisions/MR-0001/ADR-0001_body.md",
            requirements: [
              {
                id: parentId,
                title: parentTitle,
                status: "accepted",
                requirement_type: "functional",
                model_id: "functional-requirement",
                parent_requirement_id: null,
                body_path:
                  `docs/reference/project-model/body/requirements/MR-0001/${parentId}_body.md`,
              },
            ],
          },
        ],
        requirements: [
          {
            id: parentId,
            title: parentTitle,
            status: "accepted",
            requirement_type: "functional",
            model_id: "functional-requirement",
            parent_requirement_id: null,
            body_path:
              `docs/reference/project-model/body/requirements/MR-0001/${parentId}_body.md`,
          },
        ],
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

function finding(id, overrides = {}) {
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

function referenceService(overrides = {}) {
  const parent = {
    id: parentId,
    title: parentTitle,
    requirement_type: "functional",
    macro_requirement_id: "MR-0001",
    decision_id: "ADR-0001",
  };
  const findings = overrides.findings ?? [
    finding("FINDING-0001"),
    finding("FINDING-0002"),
  ];
  return {
    listEligibleCandidates() {
      return findings.map((entity) => ({
        id: entity.id,
        title: entity.title,
        entity_type: "common_analysis_finding",
        entity: structuredClone(entity),
        eligibility: { eligible: true, review_state: "accepted" },
        canonical_payload: `[${entity.id}] ${entity.title}`,
      }));
    },
    analyzePayload({ payload, allowedEntityTypes }) {
      const id = String(payload).match(/^\[([^\]]+)\]/u)?.[1] ?? "";
      if (allowedEntityTypes.includes("functional_requirement")) {
        return id === parent.id
          ? { valid: true, entity: structuredClone(parent) }
          : { valid: false, diagnostics: [] };
      }
      const entity = findings.find((entry) => entry.id === id);
      return entity
        ? { valid: true, entity: structuredClone(entity) }
        : { valid: false, diagnostics: [] };
    },
  };
}

function authoringRequest(overrides = {}) {
  return {
    document_type: "security-requirement",
    title: "Protect authenticated access",
    macro_requirement_id: "MR-0001",
    decision_id: "ADR-0001",
    parent_requirement_id: parentId,
    finding_ids: ["FINDING-0002", "FINDING-0001"],
    body: {
      intent: "Prevent accepted authentication Findings from remaining unresolved.",
      security_obligation: [
        "ThreatForge must reject unauthenticated access to protected functionality",
      ],
      scope: {
        includes: ["Registered-user authentication boundary"],
        excludes: ["Methodology-specific classifications"],
      },
      acceptance: [
        "protected access rejects unauthenticated requests",
      ],
    },
    ...structuredClone(overrides),
  };
}

function withTemporaryRoot(callback) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "tf-security-authoring-"),
  );
  try {
    const macroPath = path.join(
      rootDir,
      "docs/reference/project-model/registers/macro-requirements.registry.yml",
    );
    const requirementPath = path.join(
      rootDir,
      "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
    );
    fs.mkdirSync(path.dirname(macroPath), { recursive: true });
    fs.mkdirSync(path.dirname(requirementPath), { recursive: true });
    fs.writeFileSync(
      macroPath,
      [
        "schema_version: 1",
        "registry_id: macro-requirements-registry",
        "macro_requirements:",
        "  - id: MR-0001",
        "    title: Governed documentation",
        "    status: active",
        "    macro_requirement_type: product",
        "    body_path: docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
        "    decisions_registry_path: docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml",
        "    requirements_registry_path: docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      requirementPath,
      [
        "schema_version: 1",
        "registry_id: MR-0001-requirements-registry",
        "macro_requirement_id: MR-0001",
        "",
        "requirements:",
        `  - id: ${parentId}`,
        `    title: ${parentTitle}`,
        "    status: accepted",
        "    requirement_type: functional",
        "    macro_requirement_id: MR-0001",
        "    decision_id: ADR-0001",
        `    body_path: docs/reference/project-model/body/requirements/MR-0001/${parentId}_body.md`,
        "",
      ].join("\n"),
      "utf8",
    );
    return callback(rootDir);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
}

function projectedCatalog(service = referenceService()) {
  const projected = buildSecurityRequirementAuthoringCatalog({
    rootDir: process.cwd(),
    activeCatalog: activeCatalog(),
    loadedSourceSet: loadedSourceSet(),
  });
  return {
    ...projected,
    provider: createSecurityRequirementAuthoringProvider({
      referenceService: service,
    }),
  };
}

test("publishes unique stable Security authoring rule identifiers", () => {
  const values = Object.values(securityRequirementAuthoringRuleIds);
  assert.equal(new Set(values).size, values.length);
  assert.ok(
    values.every((value) =>
      value.startsWith("security-requirement.authoring."),
    ),
  );
});

test("registers every negative fixture against a stable authoring rule", () => {
  assert.equal(fixtureSet.schema_version, 1);
  assert.equal(
    fixtureSet.fixture_set_id,
    "security-requirement-authoring-negative-fixtures",
  );
  const known = new Set(Object.values(securityRequirementAuthoringRuleIds));
  const caseIds = fixtureSet.cases.map((entry) => entry.id);
  assert.equal(new Set(caseIds).size, caseIds.length);
  const covered = new Set();
  for (const entry of fixtureSet.cases) {
    assert.ok(entry.expected_rule_ids.length > 0);
    for (const ruleId of entry.expected_rule_ids) {
      assert.ok(known.has(ruleId), `${entry.id} references unknown rule ${ruleId}.`);
      covered.add(ruleId);
    }
  }
  assert.deepEqual([...covered].sort(), [...known].sort());
});

test("projects one inactive Security authoring document type without mutating the active catalog", () => {
  const active = activeCatalog();
  const before = structuredClone(active);
  const result = buildSecurityRequirementAuthoringCatalog({
    rootDir: process.cwd(),
    activeCatalog: active,
    loadedSourceSet: loadedSourceSet(),
  });
  assert.equal(result.activation_state, "inactive");
  assert.equal(result.catalog.document_types.length, 5);
  assert.equal(
    result.catalog.document_types.filter(
      (entry) => entry.id === "security-requirement",
    ).length,
    1,
  );
  assert.deepEqual(active, before);
});

test("requires exact explicit provider coverage for the candidate catalog", () => {
  const { catalog, provider } = projectedCatalog();
  assert.ok(
    validateGovernedDocumentAuthoringProviderCoverage(
      catalog,
      governedDocumentAuthoringProviders,
    ).length > 0,
  );
  assert.deepEqual(
    validateGovernedDocumentAuthoringProviderCoverage(
      catalog,
      [...governedDocumentAuthoringProviders, provider],
    ),
    [],
  );
});

test("normalizes parent and accepted Findings into canonical body payloads", () => {
  const { catalog } = projectedCatalog();
  const normalized = normalizeSecurityRequirementAuthoringRequest(
    authoringRequest(),
    { catalog, referenceService: referenceService() },
  );
  assert.deepEqual(
    normalized.body.parent_functional_requirement,
    { parent: [`[${parentId}] ${parentTitle}`] },
  );
  assert.deepEqual(
    normalized.body.finding_derivation.finding,
    ["[FINDING-0001] Finding 0001", "[FINDING-0002] Finding 0002"],
  );
});

test("plans a deterministic SEC registry record and governed Markdown body", () => {
  withTemporaryRoot((rootDir) => {
    const plan = planSecurityRequirementAuthoring(authoringRequest(), {
      rootDir,
      activeCatalog: activeCatalog(),
      referenceService: referenceService(),
      loadedSourceSet: loadedSourceSet(),
      today: "2026-07-31",
    });
    assert.equal(plan.activation_state, "inactive");
    assert.equal(plan.documentPlan.id, `${parentId}SEC-0001`);
    assert.match(plan.documentPlan.recordBlock, /requirement_type: security/u);
    assert.match(
      plan.documentPlan.bodyText,
      new RegExp(`- Parent: \\[${parentId}\\] ${parentTitle}`, "u"),
    );
    assert.match(
      plan.documentPlan.bodyText,
      /- Finding: \[FINDING-0001\] Finding 0001/u,
    );
    assert.match(
      plan.documentPlan.bodyText,
      /## Security obligation/u,
    );
  });
});

test("rejects unknown request fields before planning", () => {
  const { catalog } = projectedCatalog();
  assert.throws(
    () => normalizeSecurityRequirementAuthoringRequest(
      { ...authoringRequest(), method_id: "stride" },
      { catalog, referenceService: referenceService() },
    ),
    /security-requirement\.authoring\.request\.shape/u,
  );
});

test("rejects a Functional parent outside the selected ownership chain", () => {
  const { catalog } = projectedCatalog();
  assert.throws(
    () => normalizeSecurityRequirementAuthoringRequest(
      authoringRequest({ parent_requirement_id: "MR-0001ADR-0001REQ-9999" }),
      { catalog, referenceService: referenceService() },
    ),
    /security-requirement\.authoring\.parent/u,
  );
});

test("rejects duplicate and malformed Finding identifiers", () => {
  const { catalog } = projectedCatalog();
  for (const findingIds of [
    ["FINDING-0001", "FINDING-0001"],
    ["finding-0001"],
    [],
  ]) {
    assert.throws(
      () => normalizeSecurityRequirementAuthoringRequest(
        authoringRequest({ finding_ids: findingIds }),
        { catalog, referenceService: referenceService() },
      ),
      /security-requirement\.authoring\.finding\.resolution/u,
    );
  }
});

test("rejects a Finding that is not an accepted resolvable candidate", () => {
  const { catalog } = projectedCatalog();
  assert.throws(
    () => normalizeSecurityRequirementAuthoringRequest(
      authoringRequest({ finding_ids: ["FINDING-9999"] }),
      { catalog, referenceService: referenceService() },
    ),
    /security-requirement\.authoring\.finding\.resolution/u,
  );
});

test("rejects a Finding that does not affect the selected Functional parent", () => {
  const service = referenceService({
    findings: [
      finding("FINDING-0001", {
        affected_subjects: [
          { kind: "functional_requirement", id: "MR-0001ADR-0001REQ-0002" },
        ],
      }),
    ],
  });
  const { catalog } = projectedCatalog(service);
  assert.throws(
    () => normalizeSecurityRequirementAuthoringRequest(
      authoringRequest({ finding_ids: ["FINDING-0001"] }),
      { catalog, referenceService: service },
    ),
    /security-requirement\.authoring\.finding\.affected-parent/u,
  );
});

test("rejects a Finding without navigable Analysis Record provenance", () => {
  const service = referenceService({
    findings: [
      finding("FINDING-0001", {
        analysis_record_id: "",
        source_path: "",
      }),
    ],
  });
  const { catalog } = projectedCatalog(service);
  assert.throws(
    () => normalizeSecurityRequirementAuthoringRequest(
      authoringRequest({ finding_ids: ["FINDING-0001"] }),
      { catalog, referenceService: service },
    ),
    /security-requirement\.authoring\.finding\.provenance/u,
  );
});

test("preview never invokes the create transaction", () => {
  let applied = false;
  const result = executeSecurityRequirementAuthoring(
    { mode: "preview", request: authoringRequest() },
    {
      rootDir: process.cwd(),
      catalog: activeCatalog(),
      plan: () => ({
        activation_state: "inactive",
        request: {},
        selected_finding_ids: [],
        documentPlan: {},
      }),
      apply: () => {
        applied = true;
      },
    },
  );
  assert.equal(result.applied, false);
  assert.equal(applied, false);
});

test("create fails closed before invoking the transaction while inactive", () => {
  let applied = false;
  assert.throws(
    () => executeSecurityRequirementAuthoring(
      { mode: "create", request: authoringRequest() },
      {
        rootDir: process.cwd(),
        catalog: activeCatalog(),
        plan: () => ({
          activation_state: "inactive",
          request: {},
          documentPlan: {},
        }),
        apply: () => {
          applied = true;
        },
      },
    ),
    /security-requirement\.authoring\.activation/u,
  );
  assert.equal(applied, false);
});

test("active creation delegates once to the shared transaction", () => {
  let calls = 0;
  const result = executeSecurityRequirementAuthoring(
    { mode: "create", request: authoringRequest() },
    {
      rootDir: process.cwd(),
      catalog: activeCatalog(),
      plan: () => ({
        activation_state: "active",
        request: {},
        documentPlan: {},
      }),
      apply: () => {
        calls += 1;
        return { id: `${parentId}SEC-0001` };
      },
    },
  );
  assert.equal(result.applied, true);
  assert.equal(calls, 1);
});

test("creation permission accepts only the active canonical state", () => {
  assert.equal(
    assertSecurityRequirementCreationAllowed({ activation_state: "active" }),
    true,
  );
  for (const activationState of ["inactive", "synthetic", "", undefined]) {
    assert.throws(
      () => assertSecurityRequirementCreationAllowed({
        activation_state: activationState,
      }),
      /security-requirement\.authoring\.activation/u,
    );
  }
});
