#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Deterministic anti-regression guard for governed repository operation entrypoints.
 *
 * @implementsRequirement MR-0000REQ-0007GOV-0003
 * @derivedFromDecision MR-0000/ADR-0003
 * @macroRequirement MR-0000
 *
 * This checker verifies that the canonical governed repository operation runner
 * remains present, that the root npm commands still point to it, and that the
 * runner still references the expected project-model gate commands.
 *
 * Side effects: reads package.json, the governed runner source file, and the
 * MR-0000 graph registry; writes diagnostics to stdout/stderr; exits non-zero
 * when the repository operation entrypoints or traceability records drift. It
 * does not stage, commit, push, rewrite package scripts, modify Git hooks,
 * enforce remote branch protection, or replace the governed runner itself.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const packageJsonPath = path.join(rootDir, "package.json");
const runnerProjectPath = "backend/tools/MR-0000/run-governed-repository-operation.mjs";
const runnerPath = path.join(rootDir, runnerProjectPath);
const graphPath = path.join(
  rootDir,
  "docs",
  "reference",
  "project-model",
  "registers",
  "graph",
  "GRAPH-0000.graph.yml",
);
const errors = [];

const expectedScripts = new Map([
  ["repo:check", "node backend/tools/MR-0000/run-governed-repository-operation.mjs --check"],
  ["repo:commit-push", "node backend/tools/MR-0000/run-governed-repository-operation.mjs --commit-push"],
  [
    "docs:repo-operation-governance",
    "node backend/tools/MR-0000/check-governed-repository-operation.mjs",
  ],
]);

const requiredRunnerTraceabilityMarkers = [
  "@implementsRequirement MR-0000REQ-0007GOV-0001",
  "@implementsRequirement MR-0000REQ-0007GOV-0002",
  "@derivedFromDecision MR-0000/ADR-0003",
  "@macroRequirement MR-0000",
];

const requiredRunnerGateScripts = [
  "docs:graph-format",
  "docs:pages",
  "docs:adr-registry-fields",
  "docs:requirement-registry-fields",
  "docs:code-traceability",
  "docs:repo-operation-governance",
  "docs:body-format-registry",
  "docs:markdown-body-parser",
  "docs:adr-body-format",
  "docs:requirement-body-format",
  "docs:append-first",
];

const requiredGraphFragments = [
  "id: MR-0000REQ-0007GOV-0003",
  "id: TOOL-check-governed-repository-operation",
  "path: backend/tools/MR-0000/check-governed-repository-operation.mjs",
  "subject: MR-0000REQ-0007GOV-0003\n    predicate: implemented_by\n    object: TOOL-check-governed-repository-operation",
  "subject: TOOL-check-governed-repository-operation\n    predicate: verifies\n    object: MR-0000REQ-0007GOV-0003",
];

/**
 * Reads UTF-8 text from a file, removing a possible byte-order mark.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {string} File text without a leading UTF-8 BOM.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
}

/**
 * Records a deterministic validation error.
 *
 * @param {string} message - Human-readable diagnostic message.
 * @returns {void}
 */
function addError(message) {
  errors.push(message);
}

/**
 * Ensures a file exists.
 *
 * @param {string} filePath - Absolute file path.
 * @param {string} label - Human-readable file label.
 * @returns {boolean} True when the file exists.
 */
function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    addError(`${label} is missing: ${path.relative(rootDir, filePath).replaceAll("\\", "/")}`);
    return false;
  }
  return true;
}

/**
 * Validates the canonical root package scripts for governed repository operations.
 *
 * @returns {void}
 */
function validatePackageScripts() {
  if (!requireFile(packageJsonPath, "Root package.json")) return;

  let packageJson;
  try {
    packageJson = JSON.parse(readText(packageJsonPath));
  } catch (error) {
    addError(`Root package.json is not valid JSON: ${error.message}`);
    return;
  }

  const scripts = packageJson.scripts;
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    addError("Root package.json must define a scripts object.");
    return;
  }

  for (const [scriptName, expectedCommand] of expectedScripts.entries()) {
    if (scripts[scriptName] !== expectedCommand) {
      addError(
        `package.json script ${scriptName} must be ${JSON.stringify(expectedCommand)}; found ${JSON.stringify(
          scripts[scriptName],
        )}.`,
      );
    }
  }
}

/**
 * Validates that the governed runner source remains traceable and wired to all required gates.
 *
 * @returns {void}
 */
function validateRunnerSource() {
  if (!requireFile(runnerPath, "Governed repository operation runner")) return;

  const runnerText = readText(runnerPath);

  for (const marker of requiredRunnerTraceabilityMarkers) {
    if (!runnerText.includes(marker)) {
      addError(`Runner source is missing traceability marker: ${marker}`);
    }
  }

  for (const gateScript of requiredRunnerGateScripts) {
    if (!runnerText.includes(gateScript)) {
      addError(`Runner source is missing required gate command reference: ${gateScript}`);
    }
  }

  if (!runnerText.includes("git", runnerText.indexOf("Stage non-ignored repository changes"))) {
    addError("Runner source no longer appears to stage repository changes through Git after gates pass.");
  }

  if (!runnerText.includes("commit", runnerText.indexOf("Create governed commit"))) {
    addError("Runner source no longer appears to create a governed Git commit.");
  }

  if (!runnerText.includes("push", runnerText.indexOf("Push governed commit"))) {
    addError("Runner source no longer appears to push the governed commit.");
  }
}

/**
 * Validates graph traceability for this anti-regression guard.
 *
 * @returns {void}
 */
function validateGraphTraceability() {
  if (!requireFile(graphPath, "MR-0000 graph registry")) return;

  const graphText = readText(graphPath);
  for (const fragment of requiredGraphFragments) {
    if (!graphText.includes(fragment)) {
      addError(`GRAPH-0000 is missing required repository operation governance fragment: ${fragment}`);
    }
  }
}

validatePackageScripts();
validateRunnerSource();
validateGraphTraceability();

if (errors.length > 0) {
  console.error("Governed repository operation check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Governed repository operation check passed.");
console.log("Implemented requirement: MR-0000REQ-0007GOV-0003");
console.log(`Runner: ${runnerProjectPath}`);
console.log("Canonical commands: repo:check, repo:commit-push");
