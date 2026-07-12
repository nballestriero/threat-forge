#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * @file ThreatForge governed implementation planner checker.
 *
 * @implementsRequirement MR-0002ADR-0001REQ-0001GOV-0002
 * @derivedFromDecision MR-0002/ADR-0001
 * @macroRequirement MR-0002
 *
 * This checker validates the read-only planner contract, the VS Code adapter
 * mapping and deterministic negative fixture coverage.
 *
 * Side effects: reads governed sources and executes the planner; writes only
 * to stdout/stderr; exits non-zero on contract or fixture failures.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_IMPLEMENTATION_PLANNER_CHECK_ROOT
  ? path.resolve(process.env.TF_IMPLEMENTATION_PLANNER_CHECK_ROOT)
  : path.resolve(scriptDir, "..", "..");
const plannerProjectPath = "tools/MR-0002/plan-governed-implementation.mjs";
const tasksProjectPath = ".vscode/tasks.json";
const fixturesProjectPath = "tools/MR-0002/fixtures/implementation-planner/negative-fixtures.registry.json";
const implementedRequirementId = "MR-0002ADR-0001REQ-0001GOV-0002";

/**
 * Runs a process synchronously from the repository root.
 *
 * @param {string} command - Executable name or absolute path.
 * @param {string[]} args - Process arguments.
 * @returns {{status: number|null, stdout: string, stderr: string, error?: Error}} Process result.
 */
function runProcess(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

/**
 * Reads a UTF-8 repository file.
 *
 * @param {string} projectPath - Repository-relative path.
 * @returns {string} File text without a leading byte-order mark.
 */
function readProjectFile(projectPath) {
  const absolutePath = path.join(rootDir, projectPath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Required file is missing: ${projectPath}`);
  return fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/u, "");
}

/**
 * Captures the Git working tree representation used to prove read-only execution.
 *
 * @returns {string} Porcelain status output.
 */
function captureRepositoryStatus() {
  const result = runProcess("git", ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (result.error || result.status !== 0) {
    throw new Error(`Unable to inspect repository status: ${result.stderr || result.error?.message || "unknown error"}`);
  }
  return result.stdout;
}

/**
 * Validates static planner and VS Code adapter obligations.
 *
 * @param {string[]} errors - Mutable error collection.
 * @returns {void}
 */
function validateStaticContract(errors) {
  const plannerSource = readProjectFile(plannerProjectPath);
  const requiredPlannerFragments = [
    "@implementsRequirement MR-0002ADR-0001REQ-0001",
    "@implementsRequirement MR-0002ADR-0001REQ-0001GOV-0001",
    "@derivedFromDecision MR-0002/ADR-0001",
    "Only explicit --dry-run mode is supported.",
    "Unknown governed Requirement id",
    "Unsupported artifact type",
    "Proposed path must be relative to the repository root.",
  ];
  for (const fragment of requiredPlannerFragments) {
    if (!plannerSource.includes(fragment)) errors.push(`${plannerProjectPath} is missing required fragment: ${fragment}`);
  }

  const forbiddenMutationFragments = [
    "writeFileSync(",
    "appendFileSync(",
    "mkdirSync(",
    "rmSync(",
    "unlinkSync(",
    "renameSync(",
    "copyFileSync(",
    "git commit",
    "git push",
  ];
  for (const fragment of forbiddenMutationFragments) {
    if (plannerSource.includes(fragment)) errors.push(`${plannerProjectPath} contains forbidden mutation fragment: ${fragment}`);
  }

  const taskSource = readProjectFile(tasksProjectPath);
  const requiredTaskFragments = [
    '"label": "ThreatForge: plan implementation artifact dry-run"',
    '"tools/MR-0002/plan-governed-implementation.mjs"',
    '"--requirement"',
    '"--artifact-type"',
    '"--title"',
    '"--path"',
    '"--dry-run"',
  ];
  for (const fragment of requiredTaskFragments) {
    if (!taskSource.includes(fragment)) errors.push(`${tasksProjectPath} is missing required planner adapter fragment: ${fragment}`);
  }
}

/**
 * Executes the positive planner contract and validates its output.
 *
 * @param {string[]} errors - Mutable error collection.
 * @returns {void}
 */
function validatePositiveCase(errors) {
  const result = runProcess(process.execPath, [
    path.join(rootDir, plannerProjectPath),
    "--requirement",
    "MR-0002ADR-0001REQ-0001",
    "--artifact-type",
    "tool",
    "--title",
    "Planner positive fixture",
    "--path",
    "tools/MR-0002/planned-positive-example.mjs",
    "--dry-run",
  ]);
  if (result.error || result.status !== 0) {
    errors.push(`Positive planner case failed: ${result.stderr || result.error?.message || "unknown error"}`);
    return;
  }

  const requiredOutput = [
    "Governed implementation plan",
    "Requirement: MR-0002ADR-0001REQ-0001",
    "Macro-requirement: MR-0002",
    "Decision: MR-0002/ADR-0001",
    "Artifact type: tool",
    "Implementation trace artifact_type: tool",
    "Proposed path: tools/MR-0002/planned-positive-example.mjs",
    "@implementsRequirement MR-0002ADR-0001REQ-0001",
    "Verification command: node --check tools/MR-0002/planned-positive-example.mjs",
    "Mode: dry-run",
  ];
  for (const fragment of requiredOutput) {
    if (!result.stdout.includes(fragment)) errors.push(`Positive planner output is missing: ${fragment}`);
  }
}

/**
 * Executes governed negative fixture cases.
 *
 * @param {string[]} errors - Mutable error collection.
 * @returns {number} Number of fixtures checked.
 */
function validateNegativeFixtures(errors) {
  let registry;
  try {
    registry = JSON.parse(readProjectFile(fixturesProjectPath));
  } catch (error) {
    errors.push(`Unable to parse ${fixturesProjectPath}: ${error.message}`);
    return 0;
  }

  const fixtures = Array.isArray(registry.fixtures) ? registry.fixtures : [];
  if (fixtures.length === 0) {
    errors.push(`${fixturesProjectPath} must define a non-empty fixtures array.`);
    return 0;
  }

  for (const fixture of fixtures) {
    const result = runProcess(process.execPath, [path.join(rootDir, plannerProjectPath), ...(fixture.args ?? [])]);
    const diagnostics = `${result.stdout}\n${result.stderr}`;
    if (result.status === 0) errors.push(`${fixture.id} negative fixture unexpectedly passed.`);
    if (!diagnostics.includes(fixture.expected_error_contains)) {
      errors.push(`${fixture.id} did not emit expected diagnostic: ${fixture.expected_error_contains}`);
    }
  }
  return fixtures.length;
}

const errors = [];
let statusBefore = "";
let statusAfter = "";
let fixtureCount = 0;

try {
  statusBefore = captureRepositoryStatus();
  validateStaticContract(errors);
  validatePositiveCase(errors);
  fixtureCount = validateNegativeFixtures(errors);
  statusAfter = captureRepositoryStatus();
  if (statusAfter !== statusBefore) errors.push("Planner verification changed the repository working tree.");
} catch (error) {
  errors.push(error.message);
}

if (errors.length > 0) {
  console.error("Governed implementation planner check failed.");
  console.error(`Implemented requirement: ${implementedRequirementId}`);
  console.error(`Negative fixtures checked: ${fixtureCount}`);
  console.error("Warnings: 0");
  console.error(`Errors: ${errors.length}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log("Governed implementation planner check passed.");
  console.log(`Implemented requirement: ${implementedRequirementId}`);
  console.log(`Negative fixtures checked: ${fixtureCount}`);
  console.log("Warnings: 0");
  console.log("Errors: 0");
}
