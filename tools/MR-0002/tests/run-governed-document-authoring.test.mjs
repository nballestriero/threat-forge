import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildGovernedDocumentAuthoringCatalog } from "../build-governed-document-authoring-catalog.mjs";
import {
  applyGovernedDocumentAuthoring,
  formatGovernedDocumentAuthoringPlan,
  planGovernedDocumentAuthoring,
  readGovernedDocumentAuthoringRequest,
  validateGovernedDocumentAuthoringRequest,
} from "../run-governed-document-authoring.mjs";

/**
 * @file Verification of the governed-document authoring request runner.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @derivedFromDecision MR-0002/ADR-0004
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 */

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..", "..", "..");
const catalog = buildGovernedDocumentAuthoringCatalog();

const functionalRequest = {
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
};


function expectedFunctionalId() {
  const macro = catalog.macro_requirements.find((entry) => entry.id === "MR-0002");
  const decision = macro.decisions.find((entry) => entry.id === "ADR-0005");
  const maximum = decision.requirements
    .filter((entry) => entry.requirement_type === "functional")
    .reduce((current, entry) => {
      const match = entry.id.match(/REQ-(\d{4})$/u);
      return match ? Math.max(current, Number.parseInt(match[1], 10)) : current;
    }, 0);
  return `MR-0002ADR-0005REQ-${String(maximum + 1).padStart(4, "0")}`;
}

function createFixtureRoot() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-authoring-runner-"));
  fs.cpSync(
    path.join(rootDir, "docs", "reference", "project-model"),
    path.join(fixtureRoot, "docs", "reference", "project-model"),
    { recursive: true },
  );
  return fixtureRoot;
}

test("validates type-specific fields and scoped relations", () => {
  assert.equal(
    validateGovernedDocumentAuthoringRequest(functionalRequest, catalog).document_type,
    "functional-requirement",
  );
  assert.throws(
    () => validateGovernedDocumentAuthoringRequest(
      { ...functionalRequest, parent_requirement_id: "MR-0002ADR-0005REQ-0003" },
      catalog,
    ),
    /unsupported field parent_requirement_id/u,
  );
  assert.throws(
    () => validateGovernedDocumentAuthoringRequest(
      { ...functionalRequest, decision_id: "ADR-9999" },
      catalog,
    ),
    /does not belong to MR-0002/u,
  );
});

test("rejects generated fields and incomplete body input", () => {
  assert.throws(
    () => validateGovernedDocumentAuthoringRequest(
      { ...functionalRequest, id: "MR-9999ADR-9999REQ-9999" },
      catalog,
    ),
    /must not declare generated field id/u,
  );
  const incomplete = structuredClone(functionalRequest);
  delete incomplete.body.acceptance;
  assert.throws(
    () => validateGovernedDocumentAuthoringRequest(incomplete, catalog),
    /missing required field acceptance/u,
  );
});

test("reads only the governed request suffix", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-authoring-request-"));
  try {
    fs.mkdirSync(path.join(fixtureRoot, "authoring"), { recursive: true });
    const projectPath = "authoring/example.governed-document-authoring.yml";
    fs.writeFileSync(
      path.join(fixtureRoot, ...projectPath.split("/")),
      `document_type: functional-requirement\nmacro_requirement_id: MR-0002\ndecision_id: ADR-0005\ntitle: Example\nbody:\n  intent: Example intent\n  functional_obligation:\n    - The core must create a plan\n  scope:\n    includes:\n      - plan generation\n  acceptance:\n    - the plan is deterministic\n`,
    );
    assert.equal(
      readGovernedDocumentAuthoringRequest(projectPath, { rootDir: fixtureRoot }).document_type,
      "functional-requirement",
    );
    assert.throws(
      () => readGovernedDocumentAuthoringRequest("authoring/example.invalid.yml", { rootDir: fixtureRoot }),
      /must end with .governed-document-authoring.yml/u,
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("formats a complete read-only preview", () => {
  const plan = planGovernedDocumentAuthoring(functionalRequest, catalog, {
    mode: "preview",
    today: "2026-07-15",
  });
  const text = formatGovernedDocumentAuthoringPlan(plan);
  assert.match(text, /Document type: functional-requirement/u);
  assert.match(text, new RegExp(`ID: ${expectedFunctionalId()}`, "u"));
  assert.match(text, /Registry record:/u);
  assert.match(text, /Body preview:/u);
  assert.match(text, /The requirement is accepted when the preview contains every generated artifact\./u);
});

test("applies a confirmed plan and returns verification evidence", () => {
  const fixtureRoot = createFixtureRoot();
  try {
    const plan = planGovernedDocumentAuthoring(functionalRequest, catalog, {
      rootDir: fixtureRoot,
      mode: "create",
      today: "2026-07-15",
    });
    const result = applyGovernedDocumentAuthoring(plan, {
      rootDir: fixtureRoot,
      verify: () => ({ result: "pass", checks: ["fixture-check"] }),
    });
    assert.equal(result.id, expectedFunctionalId());
    assert.deepEqual(result.verification, { result: "pass", checks: ["fixture-check"] });
    assert.ok(fs.existsSync(path.join(fixtureRoot, ...result.bodyPath.split("/"))));
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("rolls back the runner transaction when verification fails", () => {
  const fixtureRoot = createFixtureRoot();
  try {
    const plan = planGovernedDocumentAuthoring(functionalRequest, catalog, {
      rootDir: fixtureRoot,
      mode: "create",
      today: "2026-07-15",
    });
    assert.throws(
      () => applyGovernedDocumentAuthoring(plan, {
        rootDir: fixtureRoot,
        verify: () => { throw new Error("runner verification failure"); },
      }),
      /runner verification failure/u,
    );
    assert.equal(fs.existsSync(path.join(fixtureRoot, ...plan.documentPlan.bodyPath.split("/"))), false);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
