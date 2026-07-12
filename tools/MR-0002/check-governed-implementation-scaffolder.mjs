#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * @file ThreatForge governed implementation scaffolder checker.
 *
 * @implementsRequirement MR-0002ADR-0003REQ-0001GOV-0002
 * @derivedFromDecision MR-0002/ADR-0003
 * @macroRequirement MR-0002
 *
 * Validates the scaffold creator, VS Code adapter, positive isolated creation,
 * implementation trace compatibility and governed negative fixture coverage.
 *
 * Side effects: creates and removes isolated temporary workspaces; reads the
 * repository and Git status; writes only to stdout/stderr.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_IMPLEMENTATION_SCAFFOLDER_CHECK_ROOT
  ? path.resolve(process.env.TF_IMPLEMENTATION_SCAFFOLDER_CHECK_ROOT)
  : path.resolve(scriptDir, "..", "..");
const creatorProjectPath = "tools/MR-0002/create-governed-implementation-scaffold.mjs";
const plannerProjectPath = "tools/MR-0002/plan-governed-implementation.mjs";
const traceCheckerProjectPath = "tools/MR-0001/check-implementation-trace-registry.mjs";
const tasksProjectPath = ".vscode/tasks.json";
const fixturesProjectPath = "tools/MR-0002/fixtures/implementation-scaffolder/negative-fixtures.registry.json";
const implementedRequirementId = "MR-0002ADR-0003REQ-0001GOV-0002";

/**
 * Runs a child process.
 *
 * @param {string} command - Executable.
 * @param {string[]} args - Arguments.
 * @param {Record<string, string>} [envOverrides] - Environment overrides.
 * @returns {{status: number|null, stdout: string, stderr: string, error?: Error}} Process result.
 */
function runProcess(command, args, envOverrides = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, ...envOverrides },
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

/**
 * Reads a UTF-8 project file.
 *
 * @param {string} projectPath - Repository-relative path.
 * @returns {string} File text.
 */
function readProjectFile(projectPath) {
  const absolutePath = path.join(rootDir, projectPath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Required file is missing: ${projectPath}`);
  return fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/u, "");
}

/**
 * Captures current Git porcelain status.
 *
 * @returns {string} Git status output.
 */
function captureRepositoryStatus() {
  const result = runProcess("git", ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (result.error || result.status !== 0) {
    throw new Error(`Unable to inspect repository status: ${result.stderr || result.error?.message || "unknown error"}`);
  }
  return result.stdout;
}

/**
 * Writes the minimal governed workspace used by integration cases.
 *
 * @param {string} workspaceRoot - Temporary workspace root.
 * @param {{existingPath?: string, registeredPath?: string}} [setup] - Fixture setup.
 * @returns {void}
 */
function createFixtureWorkspace(workspaceRoot, setup = {}) {
  const requirementsDir = path.join(
    workspaceRoot,
    "docs/reference/project-model/registers/requirements",
  );
  const implementationDir = path.join(
    workspaceRoot,
    "docs/reference/project-model/registers/implementation",
  );
  fs.mkdirSync(requirementsDir, { recursive: true });
  fs.mkdirSync(implementationDir, { recursive: true });

  fs.writeFileSync(
    path.join(requirementsDir, "MR-0002.requirements.registry.yml"),
    [
      "schema_version: 1",
      "registry_id: MR-0002-requirements-registry",
      "macro_requirement_id: MR-0002",
      "",
      "requirements:",
      "  - id: MR-0002ADR-0003REQ-0001",
      "    title: Fixture requirement",
      "    status: draft",
      "    requirement_type: functional",
      "    macro_requirement_id: MR-0002",
      "    body_path: fixture.md",
      "",
    ].join("\n"),
    "utf8",
  );

  const registeredRecord = setup.registeredPath
    ? [
        "",
        "  - id: MR-0002ADR-0003REQ-0001IMPL-0099",
        "    title: Registered fixture",
        "    artifact_type: tool",
        "    status: scaffolded",
        "    linked_requirement_ids:",
        "      - MR-0002ADR-0003REQ-0001",
        `    scaffolded_path: ${setup.registeredPath}`,
        "    reason: Fixture",
        `    verification_command: node --check ${setup.registeredPath}`,
      ].join("\n")
    : "";

  fs.writeFileSync(
    path.join(implementationDir, "implementation-trace.registry.yml"),
    [
      "schema_version: 1",
      "registry_id: implementation-trace-registry",
      "scope: governed_implementation_trace",
      "",
      "artifacts:",
      registeredRecord,
      "",
    ].join("\n"),
    "utf8",
  );

  if (setup.existingPath) {
    const existingAbsolutePath = path.join(workspaceRoot, ...setup.existingPath.split("/"));
    fs.mkdirSync(path.dirname(existingAbsolutePath), { recursive: true });
    fs.writeFileSync(existingAbsolutePath, "// existing\n", "utf8");
  }
}

/**
 * Runs the scaffold creator against an isolated workspace.
 *
 * @param {string} workspaceRoot - Temporary workspace.
 * @param {string[]} args - Creator arguments.
 * @returns {{status: number|null, stdout: string, stderr: string, error?: Error}} Process result.
 */
function runCreator(workspaceRoot, args) {
  return runProcess(
    process.execPath,
    [path.join(rootDir, creatorProjectPath), ...args],
    { TF_IMPLEMENTATION_SCAFFOLDER_ROOT: workspaceRoot },
  );
}

/**
 * Validates static implementation and task obligations.
 *
 * @param {string[]} errors - Mutable diagnostics.
 * @returns {void}
 */
function validateStaticContract(errors) {
  const creatorSource = readProjectFile(creatorProjectPath);
  const requiredCreatorFragments = [
    "@implementsRequirement MR-0002ADR-0003REQ-0001",
    "@implementsRequirement MR-0002ADR-0003REQ-0001GOV-0001",
    "@derivedFromDecision MR-0002/ADR-0003",
    'Explicit creation confirmation is required: --confirm create',
    "Refusing to overwrite existing path",
    "Implementation path is already registered",
    "@implementationStatus scaffolded",
    'flag: "wx"',
    "applyTransaction",
  ];
  for (const fragment of requiredCreatorFragments) {
    if (!creatorSource.includes(fragment)) {
      errors.push(`${creatorProjectPath} is missing required fragment: ${fragment}`);
    }
  }

  const plannerSource = readProjectFile(plannerProjectPath);
  if (!plannerSource.includes("export function createGovernedImplementationPlan")) {
    errors.push(`${plannerProjectPath} does not expose the shared governed plan contract.`);
  }

  const taskSource = readProjectFile(tasksProjectPath);
  const requiredTaskFragments = [
    '"label": "ThreatForge: create implementation scaffold"',
    '"tools/MR-0002/create-governed-implementation-scaffold.mjs"',
    '"--confirm"',
    '"${input:threatForgeImplementationCreateConfirmation}"',
    '"create"',
    '"cancel"',
  ];
  for (const fragment of requiredTaskFragments) {
    if (!taskSource.includes(fragment)) {
      errors.push(`${tasksProjectPath} is missing required scaffold adapter fragment: ${fragment}`);
    }
  }

  const traceCheckerSource = readProjectFile(traceCheckerProjectPath);
  for (const fragment of [
    '"scaffolded"',
    "scaffolded_path",
    "@implementationStatus",
    "MR-0002ADR-0003REQ-0001GOV-0001",
  ]) {
    if (!traceCheckerSource.includes(fragment)) {
      errors.push(`${traceCheckerProjectPath} is missing scaffold trace fragment: ${fragment}`);
    }
  }
}

/**
 * Validates positive creation and implementation trace compatibility.
 *
 * @param {string[]} errors - Mutable diagnostics.
 * @returns {void}
 */
function validatePositiveCase(errors) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threat-forge-scaffold-positive-"));
  try {
    createFixtureWorkspace(workspaceRoot);
    const targetProjectPath = "tools/MR-0002/generated-positive.mjs";
    const result = runCreator(workspaceRoot, [
      "--requirement",
      "MR-0002ADR-0003REQ-0001",
      "--artifact-type",
      "tool",
      "--title",
      "Positive generated scaffold",
      "--path",
      targetProjectPath,
      "--confirm",
      "create",
    ]);

    if (result.error || result.status !== 0) {
      errors.push(`Positive scaffold case failed: ${result.stderr || result.error?.message || "unknown error"}`);
      return;
    }

    const targetAbsolutePath = path.join(workspaceRoot, ...targetProjectPath.split("/"));
    if (!fs.existsSync(targetAbsolutePath)) {
      errors.push("Positive scaffold case did not create the expected source file.");
      return;
    }

    const sourceText = fs.readFileSync(targetAbsolutePath, "utf8");
    for (const fragment of [
      "@implementsRequirement MR-0002ADR-0003REQ-0001",
      "@derivedFromDecision MR-0002/ADR-0003",
      "@macroRequirement MR-0002",
      "@implementationStatus scaffolded",
    ]) {
      if (!sourceText.includes(fragment)) errors.push(`Positive scaffold source is missing: ${fragment}`);
    }

    const registryText = fs.readFileSync(
      path.join(workspaceRoot, "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml"),
      "utf8",
    );
    for (const fragment of [
      "MR-0002ADR-0003REQ-0001IMPL-0001",
      "status: scaffolded",
      `scaffolded_path: ${targetProjectPath}`,
    ]) {
      if (!registryText.includes(fragment)) errors.push(`Positive scaffold registry is missing: ${fragment}`);
    }

    const traceResult = runProcess(
      process.execPath,
      [path.join(rootDir, traceCheckerProjectPath)],
      {
        TF_IMPLEMENTATION_TRACE_ROOT: workspaceRoot,
        TF_IMPLEMENTATION_TRACE_SKIP_FIXTURES: "true",
        TF_IMPLEMENTATION_TRACE_DISABLE_REPORTS: "1",
      },
    );
    if (traceResult.error || traceResult.status !== 0) {
      errors.push(`Generated scaffold failed implementation trace validation: ${traceResult.stderr || traceResult.error?.message || "unknown error"}`);
    }

    const repeatResult = runCreator(workspaceRoot, [
      "--requirement",
      "MR-0002ADR-0003REQ-0001",
      "--artifact-type",
      "tool",
      "--title",
      "Repeated scaffold",
      "--path",
      targetProjectPath,
      "--confirm",
      "create",
    ]);
    if (repeatResult.status === 0 || !`${repeatResult.stdout}\n${repeatResult.stderr}`.includes("Refusing to overwrite existing path")) {
      errors.push("Repeated scaffold creation did not deterministically reject the existing target.");
    }
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

/**
 * Executes governed negative fixture cases.
 *
 * @param {string[]} errors - Mutable diagnostics.
 * @returns {number} Number of checked fixtures.
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
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), `threat-forge-scaffold-${fixture.id}-`));
    try {
      createFixtureWorkspace(workspaceRoot, {
        existingPath: fixture.setup_existing_path,
        registeredPath: fixture.setup_registered_path,
      });
      const beforeRegistry = fs.readFileSync(
        path.join(workspaceRoot, "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml"),
        "utf8",
      );
      const result = runCreator(workspaceRoot, fixture.args ?? []);
      const diagnostics = `${result.stdout}\n${result.stderr}`;
      if (result.status === 0) errors.push(`${fixture.id} negative fixture unexpectedly passed.`);
      if (!diagnostics.includes(fixture.expected_error_contains)) {
        errors.push(`${fixture.id} did not emit expected diagnostic: ${fixture.expected_error_contains}`);
      }

      const afterRegistry = fs.readFileSync(
        path.join(workspaceRoot, "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml"),
        "utf8",
      );
      if (afterRegistry !== beforeRegistry) {
        errors.push(`${fixture.id} changed the implementation trace registry despite failure.`);
      }
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  }

  return fixtures.length;
}

const errors = [];
let fixtureCount = 0;
let statusBefore = "";
let statusAfter = "";

try {
  statusBefore = captureRepositoryStatus();
  validateStaticContract(errors);
  validatePositiveCase(errors);
  fixtureCount = validateNegativeFixtures(errors);
  statusAfter = captureRepositoryStatus();
  if (statusAfter !== statusBefore) {
    errors.push("Scaffolder verification changed the repository working tree.");
  }
} catch (error) {
  errors.push(error.message);
}

if (errors.length > 0) {
  console.error("Governed implementation scaffolder check failed.");
  console.error(`Implemented requirement: ${implementedRequirementId}`);
  console.error(`Negative fixtures checked: ${fixtureCount}`);
  console.error("Warnings: 0");
  console.error(`Errors: ${errors.length}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log("Governed implementation scaffolder check passed.");
  console.log(`Implemented requirement: ${implementedRequirementId}`);
  console.log(`Negative fixtures checked: ${fixtureCount}`);
  console.log("Warnings: 0");
  console.log("Errors: 0");
}
