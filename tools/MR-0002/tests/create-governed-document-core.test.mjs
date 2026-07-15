import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildGovernedDocumentAuthoringCatalog } from "../build-governed-document-authoring-catalog.mjs";
import {
  applyGeneratedDocument,
  planGeneratedDocument,
} from "../create-governed-document.mjs";

/**
 * @file Verification of the importable governed-document transaction core.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 */

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..", "..", "..");
const catalog = buildGovernedDocumentAuthoringCatalog();

function createFixtureRoot() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-governed-document-core-"));
  fs.cpSync(
    path.join(rootDir, "docs", "reference", "project-model"),
    path.join(fixtureRoot, "docs", "reference", "project-model"),
    { recursive: true },
  );
  return fixtureRoot;
}

function loadFixtureCatalog(fixtureRoot) {
  const result = spawnSync(
    process.execPath,
    [path.join(rootDir, "tools", "MR-0002", "build-governed-document-authoring-catalog.mjs")],
    {
      cwd: rootDir,
      encoding: "utf8",
      env: { ...process.env, TF_GOVERNED_DOCUMENT_AUTHORING_CATALOG_ROOT: fixtureRoot },
    },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

function runModelCheck(scriptName, envName, fixtureRoot) {
  const result = spawnSync(
    process.execPath,
    [path.join(rootDir, "tools", "MR-0001", scriptName)],
    {
      cwd: rootDir,
      encoding: "utf8",
      env: { ...process.env, [envName]: fixtureRoot },
    },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}


function nextSequenceId(values, prefix) {
  const maximum = values.reduce((current, value) => {
    const match = String(value).match(/(\d{4})$/u);
    return match ? Math.max(current, Number.parseInt(match[1], 10)) : current;
  }, 0);
  return `${prefix}${String(maximum + 1).padStart(4, "0")}`;
}

function expectedIds() {
  const macro = catalog.macro_requirements.find((entry) => entry.id === "MR-0002");
  const decision = macro.decisions.find((entry) => entry.id === "ADR-0005");
  const parent = decision.requirements.find((entry) => entry.id === "MR-0002ADR-0005REQ-0003");
  return {
    macro: nextSequenceId(catalog.macro_requirements.map((entry) => entry.id), "MR-"),
    decision: nextSequenceId(macro.decisions.map((entry) => entry.id), "ADR-"),
    functional: nextSequenceId(
      decision.requirements.filter((entry) => entry.requirement_type === "functional").map((entry) => entry.id),
      "MR-0002ADR-0005REQ-",
    ),
    governance: nextSequenceId(
      decision.requirements.filter((entry) => entry.parent_requirement_id === parent.id).map((entry) => entry.id),
      "MR-0002ADR-0005REQ-0003GOV-",
    ),
  };
}

const requests = {
  macro: {
    document_type: "macro-requirement",
    title: "Example macro requirement",
    macro_requirement_type: "functional",
    body: {
      intent: "Define one project-level capability.",
      context: "The project needs an additional governed capability.",
      macro_obligation: ["The project must expose the additional governed capability"],
      scope: {
        includes: ["the additional governed capability"],
        excludes: ["unrelated platform behavior"],
      },
      non_goals: ["Replace existing macro-requirements"],
    },
  },
  decision: {
    document_type: "decision",
    macro_requirement_id: "MR-0002",
    title: "Example decision",
    decision_type: "structural",
    author: "Nicolo Ballestriero",
    body: {
      context: "The authoring workflow needs one structural choice.",
      decision: "ThreatForge adopts one shared authoring request contract.",
      consequences: {
        benefit: ["The editor and CLI consume the same contract"],
        constraint: ["Every adapter remains thin"],
      },
      non_goals: ["Introduce a custom editor extension"],
    },
  },
  functional: {
    document_type: "functional-requirement",
    macro_requirement_id: "MR-0002",
    decision_id: "ADR-0005",
    title: "Example functional requirement",
    body: {
      intent: "Provide one verifiable authoring behavior.",
      functional_obligation: ["The authoring core must produce one deterministic preview"],
      scope: {
        includes: ["deterministic preview generation"],
        excludes: ["repository mutation during preview"],
      },
      acceptance: ["the preview contains every generated artifact"],
    },
  },
  governance: {
    document_type: "governance-requirement",
    macro_requirement_id: "MR-0002",
    decision_id: "ADR-0005",
    parent_requirement_id: "MR-0002ADR-0005REQ-0003",
    title: "Example governance requirement",
    body: {
      intent: "Keep the editor adapter free from duplicated rules.",
      governance_obligation: ["The editor adapter must consume generated canonical projections"],
      verification_obligations: ["The verification must confirm that no editor-owned enum exists"],
      failure_conditions: ["an editor-owned canonical enum is detected"],
    },
  },
};

test("plans all four governed document types deterministically", () => {
  const macro = planGeneratedDocument(requests.macro, catalog, { today: "2026-07-15" });
  const decision = planGeneratedDocument(requests.decision, catalog, { today: "2026-07-15" });
  const functional = planGeneratedDocument(requests.functional, catalog, { today: "2026-07-15" });
  const governance = planGeneratedDocument(requests.governance, catalog, { today: "2026-07-15" });
  const expected = expectedIds();
  assert.equal(macro.id, expected.macro);
  assert.equal(macro.changes.length, 4);
  assert.equal(decision.id, expected.decision);
  assert.equal(functional.id, expected.functional);
  assert.equal(governance.id, expected.governance);
  assert.deepEqual(
    planGeneratedDocument(requests.functional, catalog, { today: "2026-07-15" }),
    functional,
  );
});

test("creates a complete Macro-requirement transaction", () => {
  const fixtureRoot = createFixtureRoot();
  try {
    const plan = planGeneratedDocument(requests.macro, catalog, { rootDir: fixtureRoot, today: "2026-07-15" });
    const result = applyGeneratedDocument(plan, { rootDir: fixtureRoot, afterInstall: () => {} });
    assert.equal(result.producedArtifacts.length, 4);
    for (const projectPath of result.producedArtifacts) {
      assert.ok(fs.existsSync(path.join(fixtureRoot, ...projectPath.split("/"))));
    }
    const childDecisionRegistry = fs.readFileSync(
      path.join(fixtureRoot, "docs/reference/project-model/registers/decisions", `${plan.id}.decisions.registry.yml`),
      "utf8",
    );
    const childRequirementRegistry = fs.readFileSync(
      path.join(fixtureRoot, "docs/reference/project-model/registers/requirements", `${plan.id}.requirements.registry.yml`),
      "utf8",
    );
    assert.match(childDecisionRegistry, /decisions: \[\]/u);
    assert.match(childRequirementRegistry, /requirements: \[\]/u);
    runModelCheck("check-macro-requirement-model.mjs", "TF_MACRO_REQUIREMENT_MODEL_ROOT", fixtureRoot);

    let fixtureCatalog = loadFixtureCatalog(fixtureRoot);
    const decisionRequest = { ...requests.decision, macro_requirement_id: plan.id };
    const decisionPlan = planGeneratedDocument(decisionRequest, fixtureCatalog, { rootDir: fixtureRoot, today: "2026-07-15" });
    applyGeneratedDocument(decisionPlan, { rootDir: fixtureRoot, afterInstall: () => {} });

    fixtureCatalog = loadFixtureCatalog(fixtureRoot);
    const functionalRequest = {
      ...requests.functional,
      macro_requirement_id: plan.id,
      decision_id: decisionPlan.id,
    };
    const functionalPlan = planGeneratedDocument(functionalRequest, fixtureCatalog, { rootDir: fixtureRoot, today: "2026-07-15" });
    applyGeneratedDocument(functionalPlan, { rootDir: fixtureRoot, afterInstall: () => {} });

    fixtureCatalog = loadFixtureCatalog(fixtureRoot);
    const governanceRequest = {
      ...requests.governance,
      macro_requirement_id: plan.id,
      decision_id: decisionPlan.id,
      parent_requirement_id: functionalPlan.id,
    };
    const governancePlan = planGeneratedDocument(governanceRequest, fixtureCatalog, { rootDir: fixtureRoot, today: "2026-07-15" });
    applyGeneratedDocument(governancePlan, { rootDir: fixtureRoot, afterInstall: () => {} });

    runModelCheck("check-decision-model.mjs", "TF_DECISION_MODEL_ROOT", fixtureRoot);
    runModelCheck("check-functional-requirement-model.mjs", "TF_FUNCTIONAL_REQUIREMENT_MODEL_ROOT", fixtureRoot);
    runModelCheck("check-governance-requirement-model.mjs", "TF_GOVERNANCE_REQUIREMENT_MODEL_ROOT", fixtureRoot);
    fixtureCatalog = loadFixtureCatalog(fixtureRoot);
    const createdMacro = fixtureCatalog.macro_requirements.find((entry) => entry.id === plan.id);
    assert.equal(createdMacro.decisions.length, 1);
    assert.equal(createdMacro.requirements.length, 2);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("creates canonical Decision, Functional and Governance documents", () => {
  const cases = [
    [requests.decision, "check-decision-model.mjs", "TF_DECISION_MODEL_ROOT"],
    [requests.functional, "check-functional-requirement-model.mjs", "TF_FUNCTIONAL_REQUIREMENT_MODEL_ROOT"],
    [requests.governance, "check-governance-requirement-model.mjs", "TF_GOVERNANCE_REQUIREMENT_MODEL_ROOT"],
  ];
  for (const [request, checker, envName] of cases) {
    const fixtureRoot = createFixtureRoot();
    try {
      const plan = planGeneratedDocument(request, catalog, { rootDir: fixtureRoot, today: "2026-07-15" });
      applyGeneratedDocument(plan, { rootDir: fixtureRoot, afterInstall: () => {} });
      runModelCheck(checker, envName, fixtureRoot);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }
});

test("rolls back every artifact when post-install verification fails", () => {
  const fixtureRoot = createFixtureRoot();
  try {
    const registryPath = path.join(
      fixtureRoot,
      "docs/reference/project-model/registers/macro-requirements.registry.yml",
    );
    const before = fs.readFileSync(registryPath, "utf8");
    const plan = planGeneratedDocument(requests.macro, catalog, { rootDir: fixtureRoot, today: "2026-07-15" });
    assert.throws(
      () => applyGeneratedDocument(plan, {
        rootDir: fixtureRoot,
        afterInstall: () => { throw new Error("verification fixture failure"); },
      }),
      /verification fixture failure/u,
    );
    assert.equal(fs.readFileSync(registryPath, "utf8"), before);
    for (const change of plan.changes.filter((entry) => entry.mode === "create")) {
      assert.equal(fs.existsSync(path.join(fixtureRoot, ...change.projectPath.split("/"))), false);
    }
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
