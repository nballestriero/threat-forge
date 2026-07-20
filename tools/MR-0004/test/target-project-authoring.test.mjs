import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createTargetProject } from "../lib/target-project-generator.mjs";
import {
  applyTargetProjectAuthoring,
  loadTargetProjectAuthoringCatalog,
  planTargetProjectAuthoring,
  readTargetProjectAuthoringRequest,
} from "../lib/target-project-authoring.mjs";
import { parseTargetProjectAuthoringArguments } from "../run-target-project-authoring.mjs";

/**
 * @file Target Project governed-document authoring verification.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0004
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Verifies target-local catalog ownership, deterministic preview, all four
 * governed document types, local identifier allocation, path confinement,
 * rollback, canonical engine immutability and command-line delegation.
 */

const testPath = fileURLToPath(import.meta.url);
const engineRoot = path.resolve(path.dirname(testPath), "..", "..", "..");
const cliPath = path.join(engineRoot, "tools", "MR-0004", "run-target-project-authoring.mjs");

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-target-authoring-"));
  const targetRoot = path.join(root, "target-project");
  createTargetProject({
    engineRoot,
    destinationRoot: targetRoot,
    projectId: "target-authoring-test",
    projectTitle: "Target Authoring Test",
    author: "ThreatForge Test",
    decisionDate: "2026-07-20",
  });
  return { root, targetRoot };
}

function removeWorkspace(workspace) {
  fs.rmSync(workspace.root, { recursive: true, force: true });
}

function writeRequest(targetRoot, name, text) {
  const projectPath = `authoring/${name}.governed-document-authoring.yml`;
  const absolute = path.join(targetRoot, ...projectPath.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${text.trim()}\n`, "utf8");
  return projectPath;
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

function decisionRequest(targetRoot) {
  return writeRequest(
    targetRoot,
    "decision",
    `
document_type: decision
title: Add a second target-local decision
macro_requirement_id: MR-0001
decision_type: structural
author: Target Author
body:
  context: The target project needs another local decision while remaining isolated from the ThreatForge engine.
  decision: The target project records the additional choice as a governed target-local Decision.
  consequences:
    benefit:
      - Target ownership remains explicit.
    risk:
      - Incorrect routing could affect the wrong project.
  non_goals:
    - Modify canonical ThreatForge decisions
`,
  );
}

function macroRequest(targetRoot) {
  return writeRequest(
    targetRoot,
    "macro",
    `
document_type: macro-requirement
title: Target-local reporting capability
macro_requirement_type: functional
body:
  intent: Describe one additional target-local capability independently from canonical ThreatForge ownership.
  context: The demonstration project needs a second governed ownership scope for later target-specific decisions and requirements.
  macro_obligation:
    - The target project must preserve target-local reporting knowledge.
  scope:
    includes:
      - Target-local reporting documentation
    excludes:
      - Canonical ThreatForge project-model changes
  non_goals:
    - Implement executable reporting code
`,
  );
}

function functionalRequest(targetRoot) {
  return writeRequest(
    targetRoot,
    "functional",
    `
document_type: functional-requirement
title: Record a second demonstration request
macro_requirement_id: MR-0001
decision_id: ADR-0001
body:
  intent: Capture another target-local documentary behavior for the demonstration system.
  functional_obligation:
    - The demonstration project must record a second governed request description.
  scope:
    includes:
      - Target-local documentary request behavior
    excludes:
      - Executable request handling
  acceptance:
    - the target registry and body contain the new Functional Requirement
`,
  );
}

function governanceRequest(targetRoot) {
  return writeRequest(
    targetRoot,
    "governance",
    `
document_type: governance-requirement
title: Verify the demonstration request description
macro_requirement_id: MR-0001
decision_id: ADR-0001
parent_requirement_id: MR-0001ADR-0001REQ-0001
body:
  intent: Define target-local verification for the governed demonstration request description.
  governance_obligation:
    - The target validation must preserve the parent Functional Requirement structure.
  verification_obligations:
    - The verification must reject an invalid target-local request description.
  failure_conditions:
    - the target-local request description violates its canonical body profile
`,
  );
}

function planFor(targetRoot, requestPath) {
  return planTargetProjectAuthoring({
    engineRoot,
    targetRoot,
    requestPath,
    today: "2026-07-20",
  });
}

test("target catalog uses engine rules and only target-local ownership records", () => {
  const workspace = createWorkspace();
  try {
    const catalog = loadTargetProjectAuthoringCatalog({ engineRoot, targetRoot: workspace.targetRoot });
    assert.deepEqual(catalog.macro_requirements.map((entry) => entry.id), ["MR-0001"]);
    assert.ok(catalog.document_types.some((entry) => entry.id === "governance-requirement"));
    assert.ok(catalog.sources.some((entry) => entry.ownership === "threatforge_engine"));
    assert.ok(catalog.sources.some((entry) => entry.ownership === "target_project"));
  } finally {
    removeWorkspace(workspace);
  }
});

test("repeated preview is deterministic and read-only", () => {
  const workspace = createWorkspace();
  try {
    const requestPath = decisionRequest(workspace.targetRoot);
    const before = hashTree(workspace.targetRoot);
    const first = planFor(workspace.targetRoot, requestPath);
    const second = planFor(workspace.targetRoot, requestPath);
    assert.deepEqual(first, second);
    assert.equal(first.documentPlan.id, "ADR-0002");
    assert.equal(hashTree(workspace.targetRoot), before);
  } finally {
    removeWorkspace(workspace);
  }
});

for (const scenario of [
  {
    name: "Macro-requirement",
    request: macroRequest,
    expectedId: "MR-0002",
    expectedPath: "docs/reference/project-model/body/macro-requirements/MR-0002_body.md",
  },
  {
    name: "Decision",
    request: decisionRequest,
    expectedId: "ADR-0002",
    expectedPath: "docs/reference/project-model/body/decisions/MR-0001/ADR-0002_body.md",
  },
  {
    name: "Functional Requirement",
    request: functionalRequest,
    expectedId: "MR-0001ADR-0001REQ-0002",
    expectedPath:
      "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0002_body.md",
  },
  {
    name: "Governance Requirement",
    request: governanceRequest,
    expectedId: "MR-0001ADR-0001REQ-0001GOV-0001",
    expectedPath:
      "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001GOV-0001_body.md",
  },
]) {
  test(`create writes and validates one target-local ${scenario.name}`, () => {
    const workspace = createWorkspace();
    try {
      const requestPath = scenario.request(workspace.targetRoot);
      const engineBefore = hashTree(path.join(engineRoot, "docs", "reference", "project-model"));
      const plan = planFor(workspace.targetRoot, requestPath);
      const result = applyTargetProjectAuthoring(plan, {
        engineRoot,
        targetRoot: workspace.targetRoot,
      });
      assert.equal(result.id, scenario.expectedId);
      assert.equal(result.verification.status, "pass");
      assert.ok(fs.existsSync(path.join(workspace.targetRoot, ...scenario.expectedPath.split("/"))));
      assert.equal(
        hashTree(path.join(engineRoot, "docs", "reference", "project-model")),
        engineBefore,
      );
    } finally {
      removeWorkspace(workspace);
    }
  });
}

test("failed post-write target validation rolls back every authored change", () => {
  const workspace = createWorkspace();
  try {
    const requestPath = functionalRequest(workspace.targetRoot);
    const plan = planFor(workspace.targetRoot, requestPath);
    const before = hashTree(workspace.targetRoot);
    assert.throws(
      () =>
        applyTargetProjectAuthoring(plan, {
          engineRoot,
          targetRoot: workspace.targetRoot,
          verify: () => {
            throw new Error("forced target validation failure");
          },
        }),
      /forced target validation failure/u,
    );
    assert.equal(hashTree(workspace.targetRoot), before);
  } finally {
    removeWorkspace(workspace);
  }
});

test("unsafe request paths and mismatched target roots fail before modification", () => {
  const first = createWorkspace();
  const second = createWorkspace();
  try {
    assert.throws(
      () =>
        readTargetProjectAuthoringRequest({
          engineRoot,
          targetRoot: first.targetRoot,
          requestPath: "../escape.governed-document-authoring.yml",
        }),
      /unsafe|escapes/u,
    );
    const requestPath = decisionRequest(first.targetRoot);
    const plan = planFor(first.targetRoot, requestPath);
    const firstBefore = hashTree(first.targetRoot);
    const secondBefore = hashTree(second.targetRoot);
    assert.throws(
      () =>
        applyTargetProjectAuthoring(plan, {
          engineRoot,
          targetRoot: second.targetRoot,
        }),
      /different target_root/u,
    );
    assert.equal(hashTree(first.targetRoot), firstBefore);
    assert.equal(hashTree(second.targetRoot), secondBefore);
  } finally {
    removeWorkspace(first);
    removeWorkspace(second);
  }
});

test("command-line adapter previews a target-relative request without writing", () => {
  const workspace = createWorkspace();
  try {
    const requestPath = decisionRequest(workspace.targetRoot);
    const before = hashTree(workspace.targetRoot);
    const parsed = parseTargetProjectAuthoringArguments([
      "--preview",
      "--target-root",
      workspace.targetRoot,
      "--request",
      requestPath,
      "--decision-date",
      "2026-07-20",
    ]);
    assert.equal(parsed.mode, "preview");
    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        "--preview",
        "--target-root",
        workspace.targetRoot,
        "--request",
        requestPath,
        "--decision-date",
        "2026-07-20",
      ],
      { cwd: engineRoot, encoding: "utf8", windowsHide: true },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /ID: ADR-0002/u);
    assert.match(result.stdout, /Mode: preview/u);
    assert.equal(hashTree(workspace.targetRoot), before);
  } finally {
    removeWorkspace(workspace);
  }
});
