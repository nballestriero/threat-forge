import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  analyzeGovernedMarkdown,
  createGovernedMarkdownAssistanceService,
  governedMarkdownAssistanceContractVersion,
} from "../lib/governed-markdown-assistance.mjs";

/**
 * @file Verification of the editor-independent governed Markdown assistance core.
 *
 * @implementsRequirement MR-0002ADR-0006REQ-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 */

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..", "..", "..");
const service = createGovernedMarkdownAssistanceService({ rootDir });

const bodyPaths = Object.freeze({
  "macro-requirement":
    "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
  decision:
    "docs/reference/project-model/body/decisions/MR-0002/ADR-0006_body.md",
  "functional-requirement":
    "docs/reference/project-model/body/requirements/MR-0002/MR-0002ADR-0006REQ-0001_body.md",
  "governance-requirement":
    "docs/reference/project-model/body/requirements/MR-0002/MR-0002ADR-0006REQ-0001GOV-0001_body.md",
});

function read(projectPath) {
  return fs
    .readFileSync(path.join(rootDir, ...projectPath.split("/")), "utf8")
    .replace(/\r\n/gu, "\n");
}

function analyze(projectPath, text, position = { line: 0, character: 0 }) {
  return service.analyze({ projectPath, text, position });
}

function hash(projectPath) {
  return createHash("sha256").update(read(projectPath)).digest("hex");
}

test("accepts valid governed bodies for every active logical model", () => {
  for (const [modelId, projectPath] of Object.entries(bodyPaths)) {
    const result = analyze(projectPath, read(projectPath));
    assert.equal(result.contract_version, governedMarkdownAssistanceContractVersion);
    assert.equal(result.supported, true);
    assert.equal(result.document.model_id, modelId);
    assert.deepEqual(result.diagnostics, []);
  }
});

test("typing a section marker prioritizes the next missing required section", () => {
  const projectPath = bodyPaths.decision;
  const text = [
    "# ADR-0006 — Shared Markdown assistance core and thin editor adapters",
    "",
    "##",
  ].join("\n");
  const result = analyze(projectPath, text, { line: 2, character: 2 });
  assert.equal(result.completions[0].label, "Status");
  assert.equal(result.completions[0].filter_text, "## Status");
  assert.equal(result.completions[0].preselect, true);
  assert.match(result.completions[0].insert_text, /^## Status\n/u);

  const withStatus = [
    "# ADR-0006 — Shared Markdown assistance core and thin editor adapters",
    "",
    "## Status",
    "",
    "Draft",
    "",
    "##",
  ].join("\n");
  const next = analyze(projectPath, withStatus, { line: 6, character: 2 });
  assert.equal(next.completions[0].label, "Context");
  assert.equal(next.completions[0].filter_text, "## Context");
});

test("does not propose a section already present at maximum cardinality", () => {
  const projectPath = bodyPaths.decision;
  const text = `${read(projectPath).trimEnd()}\n\n##`;
  const lines = text.split("\n");
  const result = analyze(projectPath, text, {
    line: lines.length - 1,
    character: 2,
  });
  assert.equal(result.completions.some((item) => item.label === "Status"), false);
  assert.equal(result.completions.some((item) => item.label === "Context"), false);
});

test("reports an invalid controlled status and supplies canonical values and fix", () => {
  const projectPath = bodyPaths.decision;
  const text = read(projectPath).replace("\nDraft\n", "\nDraft.\n");
  const statusLine = text.split("\n").findIndex((line) => line === "Draft.");
  const result = analyze(projectPath, text, {
    line: statusLine,
    character: 3,
  });
  assert.ok(
    result.diagnostics.some(
      (item) => item.rule_id === "decision.body.status.mirror",
    ),
  );
  assert.deepEqual(
    result.completions
      .filter((item) => item.id.startsWith("controlled:"))
      .map((item) => item.label),
    ["Draft"],
  );
  assert.match(
    result.completions.find((item) => item.id.startsWith("controlled:")).documentation,
    /authoritative registry value/u,
  );
  const diagnostic = result.diagnostics.find(
    (item) => item.rule_id === "decision.body.status.mirror",
  );
  const fix = result.quick_fixes.find((item) =>
    diagnostic.quick_fix_ids.includes(item.id),
  );
  assert.match(fix.title, /controlled Status value/u);
});

test("reports missing, duplicate, unknown and out-of-order sections with stable rules", () => {
  const projectPath = bodyPaths["functional-requirement"];
  const original = read(projectPath);
  const missing = original.replace(/\n## Scope\n[\s\S]*?(?=\n## Acceptance)/u, "");
  const missingResult = analyze(projectPath, missing);
  assert.ok(
    missingResult.diagnostics.some(
      (item) =>
        item.rule_id === "functional-requirement.body.section.structure" &&
        item.message.includes('"Scope" is missing'),
    ),
  );

  const duplicate = `${original.trimEnd()}\n\n## Intent\n\nDuplicate\n`;
  const duplicateResult = analyze(projectPath, duplicate);
  assert.ok(
    duplicateResult.diagnostics.some((item) =>
      item.message.includes("maximum cardinality"),
    ),
  );

  const unknown = `${original.trimEnd()}\n\n## Unsupported\n\nText\n`;
  const unknownResult = analyze(projectPath, unknown);
  assert.ok(
    unknownResult.diagnostics.some((item) =>
      item.message.includes("Unknown section"),
    ),
  );

  const intentBlock = original.match(/## Intent\n[\s\S]*?(?=\n## Functional obligation)/u)[0];
  const obligationBlock = original.match(/## Functional obligation\n[\s\S]*?(?=\n## Scope)/u)[0];
  const reordered = original
    .replace(intentBlock, "__INTENT__")
    .replace(obligationBlock, intentBlock)
    .replace("__INTENT__", obligationBlock);
  const orderResult = analyze(projectPath, reordered);
  assert.ok(
    orderResult.diagnostics.some((item) =>
      item.message.includes("out of canonical order"),
    ),
  );
  assert.ok(
    orderResult.quick_fixes.some((item) => item.id === "restore-section-order"),
  );
});

test("quick fixes are canonical profile projections", () => {
  const projectPath = bodyPaths["governance-requirement"];
  const text = read(projectPath).replace(
    /\n## Failure conditions\n[\s\S]*$/u,
    "\n",
  );
  const result = analyze(projectPath, text);
  const diagnostic = result.diagnostics.find((item) =>
    item.message.includes('"Failure conditions" is missing'),
  );
  assert.ok(diagnostic);
  const insertion = result.quick_fixes.find((item) =>
    diagnostic.quick_fix_ids.includes(item.id),
  );
  assert.match(insertion.edits[0].new_text, /## Failure conditions/u);
  assert.match(
    insertion.edits[0].new_text,
    /The verification must fail when/u,
  );
});

test("hover output identifies canonical profile members", () => {
  const projectPath = bodyPaths["macro-requirement"];
  const text = read(projectPath);
  const line = text.split("\n").findIndex((value) => value === "## Intent");
  const result = analyze(projectPath, text, { line, character: 4 });
  assert.equal(result.hovers.length, 1);
  assert.match(result.hovers[0].markdown, /Canonical member/u);
  assert.match(result.hovers[0].markdown, /macro-requirement\.body\.section\.intent/u);
});

test("hover explains registry authority and taxonomy meanings for mirrored Status", () => {
  const projectPath = bodyPaths.decision;
  const text = read(projectPath);
  const lines = text.split("\n");
  const headingLine = lines.findIndex((value) => value === "## Status");
  const headingResult = analyze(projectPath, text, {
    line: headingLine,
    character: 5,
  });
  assert.equal(headingResult.hovers.length, 1);
  assert.match(headingResult.hovers[0].markdown, /Authority:\*\* registry mirror/u);
  assert.match(headingResult.hovers[0].markdown, /decision\.registry\.record\.status/u);
  assert.match(headingResult.hovers[0].markdown, /FIELD-VALUE-SET-0007/u);
  assert.match(headingResult.hovers[0].markdown, /accepted.*Accepted/su);

  const valueLine = lines.findIndex((value) => value === "Draft");
  const valueResult = analyze(projectPath, text, {
    line: valueLine,
    character: 2,
  });
  assert.equal(valueResult.hovers.length, 1);
  assert.match(valueResult.hovers[0].markdown, /Current registry value: `draft`/u);
});

test("identical input returns equivalent ordered semantic output", () => {
  const projectPath = bodyPaths.decision;
  const text = read(projectPath).replace("\nDraft\n", "\nDraft.\n");
  const input = { rootDir, projectPath, text, position: { line: 4, character: 2 } };
  const first = analyzeGovernedMarkdown(input);
  const second = analyzeGovernedMarkdown(input);
  assert.deepEqual(second, first);
});

test("analysis does not modify governed files", () => {
  const before = new Map(
    Object.values(bodyPaths).map((projectPath) => [projectPath, hash(projectPath)]),
  );
  for (const projectPath of Object.values(bodyPaths)) {
    analyze(projectPath, read(projectPath), { line: 1, character: 0 });
  }
  for (const [projectPath, digest] of before) {
    assert.equal(hash(projectPath), digest);
  }
});

test("unregistered Markdown files are ignored", () => {
  const result = analyze(
    "docs/reference/project-model/body/requirements/MR-0002/unregistered_body.md",
    "# Unknown",
  );
  assert.equal(result.supported, false);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.completions, []);
});
