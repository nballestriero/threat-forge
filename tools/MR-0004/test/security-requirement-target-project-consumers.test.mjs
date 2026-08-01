import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildSecurityRequirementAuthoringCatalog,
  createSecurityRequirementAuthoringProvider,
  normalizeSecurityRequirementAuthoringRequest,
} from "../../MR-0001/lib/security-requirement-authoring-provider.mjs";
import {
  loadSecurityRequirementValidationSourceSet,
} from "../../MR-0001/lib/security-requirement-model-validation.mjs";
import {
  loadGovernedDocumentModelSourceSet,
} from "../../MR-0001/lib/governed-document-model-sources.mjs";
import {
  governedDocumentAuthoringProviders,
} from "../../MR-0002/create-governed-document.mjs";
import { createTargetProject } from "../lib/target-project-generator.mjs";
import {
  applyTargetProjectAuthoring,
  loadTargetProjectAuthoringCatalog,
  planTargetProjectAuthoring,
} from "../lib/target-project-authoring.mjs";
import {
  resolveTargetProjectModelValidationProviders,
} from "../run-target-project-check.mjs";

/**
 * @file Security Requirement Target Project coordinated-consumer verification.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @implementsRequirement MR-0004ADR-0001REQ-0003
 * @implementsRequirement MR-0004ADR-0001REQ-0004
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0001/ADR-0010
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Proves that Target Project validation remains exact for the active four-model
 * source set, admits the Security validator exactly once when the candidate
 * source set is selected, and can preview target-local Security Requirement
 * authoring through the shared provider boundary without exposing creation while
 * the canonical model remains inactive.
 */

const testPath = fileURLToPath(import.meta.url);
const engineRoot = path.resolve(path.dirname(testPath), "..", "..", "..");
const today = "2026-07-31";

function createWorkspace() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "threatforge-security-target-consumers-"),
  );
  const targetRoot = path.join(root, "target-project");
  createTargetProject({
    engineRoot,
    destinationRoot: targetRoot,
    projectId: "security-target-consumers",
    projectTitle: "Security Target Consumers",
    author: "ThreatForge Test",
    decisionDate: today,
  });
  return { root, targetRoot };
}

function removeWorkspace(workspace) {
  fs.rmSync(workspace.root, { recursive: true, force: true });
}

function hashTree(rootDir) {
  const hash = crypto.createHash("sha256");
  function visit(current, relative = "") {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const absolute = path.join(current, entry.name);
      hash.update(`${entry.isDirectory() ? "D" : "F"}:${nextRelative}\n`);
      if (entry.isDirectory()) visit(absolute, nextRelative);
      else hash.update(fs.readFileSync(absolute));
    }
  }
  visit(rootDir);
  return hash.digest("hex");
}

function firstFunctionalParent(catalog) {
  for (const macro of catalog.macro_requirements ?? []) {
    for (const requirement of macro.requirements ?? []) {
      if (requirement.model_id === "functional-requirement") {
        return {
          ...structuredClone(requirement),
          macro_requirement_id: macro.id,
        };
      }
    }
  }
  throw new Error("Target catalog has no Functional Requirement parent.");
}

function referenceService(parent) {
  const finding = {
    id: "FINDING-0001",
    title: "Accepted target authentication finding",
    review_state: "accepted",
    analysis_record_id: "ANALYSIS-0001",
    affected_subjects: [
      { kind: "functional_requirement", id: parent.id },
    ],
    source_path: "analysis/FINDING-0001.analysis-finding.yml",
  };
  return {
    listEligibleCandidates({ allowedEntityTypes }) {
      return allowedEntityTypes?.includes("common_analysis_finding")
        ? [
            {
              id: finding.id,
              title: finding.title,
              entity_type: "common_analysis_finding",
              canonical_payload: `[${finding.id}] ${finding.title}`,
              entity: structuredClone(finding),
            },
          ]
        : [];
    },
    analyzePayload({ payload, allowedEntityTypes }) {
      if (allowedEntityTypes?.includes("functional_requirement")) {
        const canonical = `[${parent.id}] ${parent.title}`;
        return payload === canonical
          ? {
              recognized: true,
              valid: true,
              entity_type: "functional_requirement",
              entity: structuredClone(parent),
              diagnostics: [],
              canonical_payload: canonical,
            }
          : { recognized: false, valid: false, diagnostics: [] };
      }
      if (allowedEntityTypes?.includes("common_analysis_finding")) {
        const canonical = `[${finding.id}] ${finding.title}`;
        return payload === canonical
          ? {
              recognized: true,
              valid: true,
              entity_type: "common_analysis_finding",
              entity: structuredClone(finding),
              diagnostics: [],
              canonical_payload: canonical,
            }
          : { recognized: false, valid: false, diagnostics: [] };
      }
      return { recognized: false, valid: false, diagnostics: [] };
    },
  };
}

function securityCandidateContext(targetRoot) {
  const activeCatalog = loadTargetProjectAuthoringCatalog({
    engineRoot,
    targetRoot,
  });
  const loadedSourceSet = loadSecurityRequirementValidationSourceSet({
    rootDir: engineRoot,
  });
  const projected = buildSecurityRequirementAuthoringCatalog({
    rootDir: engineRoot,
    activeCatalog,
    loadedSourceSet,
  });
  const parent = firstFunctionalParent(projected.catalog);
  const service = referenceService(parent);
  const request = normalizeSecurityRequirementAuthoringRequest(
    {
      document_type: "security-requirement",
      title: "Protect target authenticated access",
      macro_requirement_id: parent.macro_requirement_id,
      decision_id: parent.decision_id,
      parent_requirement_id: parent.id,
      finding_ids: ["FINDING-0001"],
      body: {
        intent:
          "Prevent the accepted target authentication Finding from remaining unresolved.",
        security_obligation: [
          "The target project must reject unauthenticated access to protected functionality",
        ],
        scope: {
          includes: ["Target-local authenticated access"],
          excludes: ["Methodology-specific classifications"],
        },
        acceptance: [
          "protected target access rejects unauthenticated requests",
        ],
      },
    },
    { catalog: projected.catalog, referenceService: service },
  );
  const securityProvider = createSecurityRequirementAuthoringProvider({
    referenceService: service,
  });
  return {
    activeCatalog,
    projected,
    parent,
    request,
    referenceService: service,
    securityProvider,
    providers: [...governedDocumentAuthoringProviders, securityProvider],
  };
}

function planCandidate(targetRoot, context, providers = context.providers) {
  return planTargetProjectAuthoring({
    engineRoot,
    targetRoot,
    catalog: context.projected.catalog,
    request: context.request,
    referenceService: context.referenceService,
    providers,
    today,
  });
}

test("active Target Project validation providers include Security exactly once", () => {
  const sourceSet = loadGovernedDocumentModelSourceSet({ rootDir: engineRoot });
  const providers = resolveTargetProjectModelValidationProviders(sourceSet);
  assert.deepEqual(
    providers.map((provider) => provider.model_id),
    [
      "macro-requirement",
      "decision",
      "functional-requirement",
      "governance-requirement",
      "security-requirement",
    ],
  );
});

test("candidate Target Project validation adds exactly one Security provider", () => {
  const loaded = loadSecurityRequirementValidationSourceSet({
    rootDir: engineRoot,
  });
  assert.equal(loaded.activation_state, "active");
  const providers = resolveTargetProjectModelValidationProviders(
    loaded.sourceSet,
  );
  assert.deepEqual(
    providers.map((provider) => provider.model_id),
    [
      "macro-requirement",
      "decision",
      "functional-requirement",
      "governance-requirement",
      "security-requirement",
    ],
  );
  assert.equal(
    providers.filter(
      (provider) => provider.model_id === "security-requirement",
    ).length,
    1,
  );
});

test("active Target Project authoring catalog exposes Security exactly once", () => {
  const workspace = createWorkspace();
  try {
    const catalog = loadTargetProjectAuthoringCatalog({
      engineRoot,
      targetRoot: workspace.targetRoot,
    });
    assert.equal(
      catalog.document_types.filter(
        (entry) => entry.id === "security-requirement",
      ).length,
      1,
    );
    assert.equal(catalog.activation_candidate, undefined);
  } finally {
    removeWorkspace(workspace);
  }
});

test("active Target Project Security preview is deterministic and target-local", () => {
  const workspace = createWorkspace();
  try {
    const context = securityCandidateContext(workspace.targetRoot);
    const first = planCandidate(workspace.targetRoot, context);
    const second = planCandidate(workspace.targetRoot, context);
    assert.deepEqual(second, first);
    assert.equal(first.activation_state, "active");
    assert.equal(first.preview_only, false);
    assert.equal(
      first.documentPlan.id,
      `${context.parent.id}SEC-0001`,
    );
    assert.equal(
      first.documentPlan.registryPath,
      "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
    );
    assert.ok(
      first.documentPlan.changes.every(
        (change) =>
          !path.isAbsolute(change.projectPath) &&
          !String(change.projectPath).startsWith(".."),
      ),
    );
  } finally {
    removeWorkspace(workspace);
  }
});

test("active Target Project Security preview leaves both roots unchanged", () => {
  const workspace = createWorkspace();
  try {
    const targetBefore = hashTree(workspace.targetRoot);
    const engineBefore = hashTree(
      path.join(engineRoot, "docs", "reference", "project-model"),
    );
    const context = securityCandidateContext(workspace.targetRoot);
    planCandidate(workspace.targetRoot, context);
    assert.equal(hashTree(workspace.targetRoot), targetBefore);
    assert.equal(
      hashTree(path.join(engineRoot, "docs", "reference", "project-model")),
      engineBefore,
    );
  } finally {
    removeWorkspace(workspace);
  }
});

test("active Target Project Security preview fails without its explicit provider", () => {
  const workspace = createWorkspace();
  try {
    const context = securityCandidateContext(workspace.targetRoot);
    assert.throws(
      () =>
        planCandidate(
          workspace.targetRoot,
          context,
          governedDocumentAuthoringProviders,
        ),
      /provider|coverage|security-requirement/u,
    );
  } finally {
    removeWorkspace(workspace);
  }
});

test("active Target Project Security preview rejects duplicate providers", () => {
  const workspace = createWorkspace();
  try {
    const context = securityCandidateContext(workspace.targetRoot);
    assert.throws(
      () =>
        planCandidate(workspace.targetRoot, context, [
          ...context.providers,
          context.securityProvider,
        ]),
      /duplicate|provider|coverage/u,
    );
  } finally {
    removeWorkspace(workspace);
  }
});

test("active Target Project Security plan enters the target transaction", () => {
  const workspace = createWorkspace();
  try {
    const context = securityCandidateContext(workspace.targetRoot);
    const plan = planCandidate(workspace.targetRoot, context);
    const result = applyTargetProjectAuthoring(plan, {
      engineRoot,
      targetRoot: workspace.targetRoot,
      verify: () => ({ status: "pass" }),
    });
    assert.equal(result.id.endsWith("SEC-0001"), true);
    assert.equal(result.verification.status, "pass");
  } finally {
    removeWorkspace(workspace);
  }
});
