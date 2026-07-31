import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createGovernedEntityReferenceService } from "../lib/governed-entity-references.mjs";
import {
  createFunctionalRequirementReferenceProviders,
  governedDocumentReferenceProviderIds,
} from "../lib/governed-document-reference-providers.mjs";
import {
  governedDocumentCrossModelProviders,
} from "../lib/governed-document-cross-model-providers.mjs";
import {
  validateGovernedDocumentModelCoherence,
} from "../lib/governed-document-model-coherence-validation.mjs";
import {
  createSecurityRequirementCrossModelProvider,
  securityRequirementCrossModelRuleIds,
} from "../lib/security-requirement-cross-model-provider.mjs";
import {
  loadSecurityRequirementValidationSourceSet,
} from "../lib/security-requirement-model-validation.mjs";
import {
  commonAnalysisFindingReferenceProviderIds,
  createCommonAnalysisFindingReferenceProviders,
} from "../../MR-0005/lib/common-analysis-finding-reference-eligibility.mjs";

/**
 * @file Security Requirement cross-model relation verification.
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
const securitySourceSet = loadSecurityRequirementValidationSourceSet({
  rootDir: repositoryRoot,
}).sourceSet;

function write(root, projectPath, text) {
  const target = path.join(root, ...projectPath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, "utf8");
}

function securityBody(overrides = {}) {
  const parentTitle = overrides.parentTitle ?? "Canonical functional requirement";
  const findingId = overrides.findingId ?? "FINDING-0001";
  const findingTitle = overrides.findingTitle ?? "Accepted authentication gap";
  return `# MR-0001ADR-0001REQ-0001SEC-0001 — Canonical security requirement

## Intent

Protect the governed functional behavior.

## Parent Functional Requirement

- Parent: [MR-0001ADR-0001REQ-0001] ${parentTitle}

## Finding derivation

- Finding: [${findingId}] ${findingTitle}

The accepted Finding justifies the security obligation.

## Security obligation

- ThreatForge must reject unauthenticated access.

## Scope

- Includes: Governed request handling

## Acceptance

- The requirement is accepted when unauthenticated access is rejected.
`;
}

function makeRoot(body = securityBody()) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "tf-security-cross-model-"),
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
    "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001SEC-0001_body.md",
    body,
  );
  return root;
}

function functionalProjection() {
  return [
    {
      id: "MR-0001ADR-0001REQ-0001",
      title: "Canonical functional requirement",
      requirement_type: "functional",
      macro_requirement_id: "MR-0001",
      decision_id: "ADR-0001",
      source_path:
        "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
    },
  ];
}

function acceptedFinding(overrides = {}) {
  return {
    id: "FINDING-0001",
    title: "Accepted authentication gap",
    analysis_record_id: "ANALYSIS-0001",
    affected_subjects: [
      {
        kind: "functional_requirement",
        id: "MR-0001ADR-0001REQ-0001",
      },
    ],
    review_state: "accepted",
    source_path: "analysis/FINDING-0001.analysis-finding.yml",
    ...structuredClone(overrides),
  };
}

function referenceService(findings = [acceptedFinding()], functional = functionalProjection()) {
  const functionalProviders = createFunctionalRequirementReferenceProviders({
    rootDir: "synthetic-functional-root",
    loadProjection: () => functional,
  });
  const findingProviders = createCommonAnalysisFindingReferenceProviders({
    rootDir: "synthetic-finding-root",
    loadProjection: () => findings,
  });
  return createGovernedEntityReferenceService({
    registry: {
      schema_version: 1,
      registry_id: "governed-entity-resolvers-registry",
      scope: "governed_entity_reference_resolution",
      resolvers: [
        {
          id: "functional-requirement-reference-resolver",
          entity_type: "functional_requirement",
          status: "active",
          identifier_pattern: "^MR-\\d{4}ADR-\\d{4}REQ-\\d{4}$",
          source_projection_provider:
            governedDocumentReferenceProviderIds.functionalRequirementSource,
          eligibility_provider:
            governedDocumentReferenceProviderIds.functionalRequirementEligibility,
        },
        {
          id: "common-analysis-finding-reference-resolver",
          entity_type: "common_analysis_finding",
          status: "active",
          identifier_pattern: "^FINDING-\\d{4}$",
          source_projection_provider:
            commonAnalysisFindingReferenceProviderIds.sourceProjection,
          eligibility_provider:
            commonAnalysisFindingReferenceProviderIds.eligibility,
        },
      ],
    },
    sourceProjectionProviders: new Map([
      ...functionalProviders.sourceProjectionProviders,
      ...findingProviders.sourceProjectionProviders,
    ]),
    eligibilityProviders: new Map([
      ...functionalProviders.eligibilityProviders,
      ...findingProviders.eligibilityProviders,
    ]),
  });
}

function validate(root, findings = [acceptedFinding()], functional = functionalProjection()) {
  const provider = createSecurityRequirementCrossModelProvider({
    referenceService: referenceService(findings, functional),
  });
  return validateGovernedDocumentModelCoherence({
    rootDir: root,
    sourceSet: securitySourceSet,
    providers: [...governedDocumentCrossModelProviders, provider],
  });
}

function withRoot(body, callback) {
  const root = makeRoot(body);
  try {
    callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function emitted(result) {
  return new Set(result.diagnostics.map((entry) => entry.rule_id));
}

test("inactive Security activation candidate fails without its explicit provider", () => {
  withRoot(securityBody(), (root) => {
    assert.throws(
      () =>
        validateGovernedDocumentModelCoherence({
          rootDir: root,
          sourceSet: securitySourceSet,
          providers: governedDocumentCrossModelProviders,
        }),
      /document-model\.consumer\.provider\.missing.*security-requirement/u,
    );
  });
});

test("accepts Security Requirement parent and accepted Finding relations", () => {
  withRoot(securityBody(), (root) => {
    const result = validate(root);
    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.model_counts["security-requirement"], 1);
    assert.deepEqual(
      result.provider_model_ids,
      Object.keys(result.model_counts),
    );
  });
});

test("publishes unique stable Security cross-model rules", () => {
  const values = Object.values(securityRequirementCrossModelRuleIds);
  assert.equal(new Set(values).size, values.length);
  assert.ok(
    values.every((value) =>
      value.startsWith("security-requirement.cross-model."),
    ),
  );
});

test("rejects unresolved Functional parent", () => {
  withRoot(securityBody(), (root) => {
    const registry = path.join(
      root,
      "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
    );
    fs.writeFileSync(
      registry,
      fs.readFileSync(registry, "utf8").replace(
        /  - id: MR-0001ADR-0001REQ-0001\n[\s\S]*?body_path: docs\/reference\/project-model\/body\/requirements\/MR-0001\/MR-0001ADR-0001REQ-0001_body\.md\n\n/u,
        "",
      ),
      "utf8",
    );
    assert.ok(
      emitted(validate(root)).has(
        securityRequirementCrossModelRuleIds.parent,
      ),
    );
  });
});

test("rejects parent body title divergence", () => {
  withRoot(
    securityBody({ parentTitle: "Outdated functional title" }),
    (root) => {
      assert.ok(
        emitted(validate(root)).has(
          securityRequirementCrossModelRuleIds.parentBody,
        ),
      );
    },
  );
});

test("rejects unresolved and non-accepted Findings", () => {
  withRoot(securityBody(), (root) => {
    assert.ok(
      emitted(validate(root, [])).has(
        securityRequirementCrossModelRuleIds.findingResolution,
      ),
    );
    assert.ok(
      emitted(
        validate(root, [acceptedFinding({ review_state: "proposed" })]),
      ).has(securityRequirementCrossModelRuleIds.findingAccepted),
    );
  });
});

test("rejects Finding without the Functional parent among affected subjects", () => {
  withRoot(securityBody(), (root) => {
    const result = validate(root, [
      acceptedFinding({
        affected_subjects: [
          { kind: "functional_requirement", id: "MR-0001ADR-0001REQ-9999" },
        ],
      }),
    ]);
    assert.ok(
      emitted(result).has(
        securityRequirementCrossModelRuleIds.findingAffectedParent,
      ),
    );
  });
});

test("rejects Finding without navigable Analysis Record provenance", () => {
  withRoot(securityBody(), (root) => {
    const result = validate(root, [
      acceptedFinding({ analysis_record_id: "", source_path: "" }),
    ]);
    assert.ok(
      emitted(result).has(
        securityRequirementCrossModelRuleIds.findingProvenance,
      ),
    );
  });
});

test("Security provider leaves source projections unchanged", () => {
  const findings = [acceptedFinding()];
  const functional = functionalProjection();
  const beforeFindings = structuredClone(findings);
  const beforeFunctional = structuredClone(functional);
  withRoot(securityBody(), (root) => {
    assert.deepEqual(validate(root, findings, functional).diagnostics, []);
  });
  assert.deepEqual(findings, beforeFindings);
  assert.deepEqual(functional, beforeFunctional);
});
