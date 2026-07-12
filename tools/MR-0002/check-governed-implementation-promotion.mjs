#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * @file ThreatForge governed implementation promotion checker.
 *
 * @implementsRequirement MR-0002ADR-0003REQ-0002GOV-0002
 * @derivedFromDecision MR-0002/ADR-0003
 * @macroRequirement MR-0002
 *
 * Validates the promotion tool, VS Code mapping, positive transaction and
 * governed negative fixtures. Every negative case must leave its isolated
 * workspace byte-for-byte unchanged.
 *
 * Side effects: reads governed repository sources; creates and removes
 * isolated temporary workspaces; executes the promotion tool and Node test
 * verification; writes only diagnostics to stdout/stderr.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_IMPLEMENTATION_PROMOTION_CHECK_ROOT
  ? path.resolve(process.env.TF_IMPLEMENTATION_PROMOTION_CHECK_ROOT)
  : path.resolve(scriptDir, "..", "..");
const toolProjectPath = "tools/MR-0002/promote-governed-implementation-scaffold.mjs";
const tasksProjectPath = ".vscode/tasks.json";
const checksProjectPath = "docs/reference/project-model/registers/checks/local-governance-checks.registry.yml";
const fixturesProjectPath = "tools/MR-0002/fixtures/implementation-promotion/negative-fixtures.registry.json";
const implementedRequirementId = "MR-0002ADR-0003REQ-0002GOV-0002";
const fixtureArtifactId = "MR-0002ADR-0003REQ-0001GOV-0002IMPL-0099";
const fixturePath = "tools/MR-0002/tests/promotion-fixture.test.mjs";

/** @param {string} projectPath @returns {string} */
function readProjectFile(projectPath) {
  const absolutePath = path.join(rootDir, projectPath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Required file is missing: ${projectPath}`);
  return fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/u, "");
}

/** @param {string} command @param {string[]} args @param {Record<string,string>} [env] */
function runProcess(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, ...env },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", error: result.error };
}

/** @param {string} directory @returns {Record<string,string>} */
function snapshotDirectory(directory) {
  const snapshot = {};
  function walk(current) {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = path.relative(directory, absolutePath).replaceAll("\\", "/");
      if (entry.isDirectory()) walk(absolutePath);
      else snapshot[relativePath] = fs.readFileSync(absolutePath).toString("base64");
    }
  }
  walk(directory);
  return snapshot;
}

/** @param {string} scenario @returns {{workspace: string, sourcePath: string, registryPath: string}} */
function createWorkspace(scenario) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-promotion-"));
  const sourcePath = path.join(workspace, ...fixturePath.split("/"));
  const registryPath = path.join(workspace, "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml");
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });

  let source = `/**\n * @file Promotion fixture.\n *\n * @implementsRequirement MR-0002ADR-0003REQ-0001GOV-0002\n * @derivedFromDecision MR-0002/ADR-0003\n * @macroRequirement MR-0002\n * @implementationStatus scaffolded\n */\nimport test from "node:test";\nimport assert from "node:assert/strict";\ntest("promotion fixture", () => { assert.equal(2 + 2, 4); });\n`;
  let status = "scaffolded";
  let pathField = `    scaffolded_path: ${fixturePath}`;
  let verificationCommand = `node --test ${fixturePath}`;

  if (scenario === "already-implemented") {
    status = "implemented";
    pathField = `    implemented_path: ${fixturePath}`;
    source = source.replace("@implementationStatus scaffolded", "@implementationStatus implemented");
  } else if (scenario === "placeholder-remains") {
    source = source.replace(" */\nimport", " * TODO: implement the governed test behavior.\n */\nimport");
  } else if (scenario === "missing-status-header") {
    source = source.replace(" * @implementationStatus scaffolded\n", "");
  } else if (scenario === "missing-test-behavior") {
    source = source.replace(/import test[\s\S]*$/u, "export const fixtureValue = 4;\n");
  } else if (scenario === "verification-fails") {
    source = source.replace("assert.equal(2 + 2, 4)", "assert.equal(2 + 2, 5)");
  } else if (scenario === "unsupported-verification") {
    verificationCommand = "node -e process.exit(0)";
  }

  const registry = `schema_version: 1\nregistry_id: implementation-trace-registry\nscope: governed_implementation_trace\n\nartifacts:\n  - id: ${fixtureArtifactId}\n    title: Promotion fixture\n    artifact_type: verification_artifact\n    status: ${status}\n    linked_requirement_ids:\n      - MR-0002ADR-0003REQ-0001GOV-0002\n${pathField}\n    reason: Promotion checker fixture.\n    verification_command: ${verificationCommand}\n`;
  fs.writeFileSync(registryPath, registry, "utf8");
  if (scenario !== "missing-source") fs.writeFileSync(sourcePath, source, "utf8");
  return { workspace, sourcePath, registryPath };
}

/** @param {string[]} errors */
function validateStaticContract(errors) {
  const toolSource = readProjectFile(toolProjectPath);
  for (const fragment of [
    "@implementsRequirement MR-0002ADR-0003REQ-0002",
    "@implementsRequirement MR-0002ADR-0003REQ-0002GOV-0001",
    "Explicit promotion confirmation is required: --confirm promote",
    "Scaffold placeholder must be removed before promotion.",
    "Unsupported governed verification command",
    "applyTransaction(",
    "spawnSync(process.execPath",
  ]) {
    if (!toolSource.includes(fragment)) errors.push(`${toolProjectPath} is missing required fragment: ${fragment}`);
  }
  for (const forbidden of ["shell: true", "git commit", "git push"]) {
    if (toolSource.includes(forbidden)) errors.push(`${toolProjectPath} contains forbidden fragment: ${forbidden}`);
  }
  const tasksSource = readProjectFile(tasksProjectPath);
  for (const fragment of [
    '"label": "ThreatForge: promote implementation scaffold"',
    '"tools/MR-0002/promote-governed-implementation-scaffold.mjs"',
    '"--artifact-id"',
    '"--confirm"',
    '"promote"',
  ]) {
    if (!tasksSource.includes(fragment)) errors.push(`${tasksProjectPath} is missing promotion adapter fragment: ${fragment}`);
  }
  const checksSource = readProjectFile(checksProjectPath);
  if (!checksSource.includes("tools/MR-0002/check-governed-implementation-promotion.mjs")) {
    errors.push(`${checksProjectPath} does not register the promotion checker.`);
  }
}

/** @param {string[]} errors */
function validatePositiveCase(errors) {
  const fixture = createWorkspace("valid");
  try {
    const result = runProcess(process.execPath, [
      path.join(rootDir, toolProjectPath),
      "--artifact-id", fixtureArtifactId,
      "--confirm", "promote",
    ], { TF_IMPLEMENTATION_PROMOTION_ROOT: fixture.workspace });
    if (result.error || result.status !== 0) {
      errors.push(`Positive promotion case failed: ${result.stderr || result.error?.message || "unknown error"}`);
      return;
    }
    const source = fs.readFileSync(fixture.sourcePath, "utf8");
    const registry = fs.readFileSync(fixture.registryPath, "utf8");
    for (const fragment of [
      "Governed implementation scaffold promoted.",
      `Artifact id: ${fixtureArtifactId}`,
      "Status: implemented",
      `Path: ${fixturePath}`,
    ]) {
      if (!result.stdout.includes(fragment)) errors.push(`Positive promotion output is missing: ${fragment}`);
    }
    if (!source.includes("@implementationStatus implemented") || source.includes("@implementationStatus scaffolded")) {
      errors.push("Positive promotion did not update the source lifecycle declaration.");
    }
    if (!registry.includes("    status: implemented") || !registry.includes(`    implemented_path: ${fixturePath}`)) {
      errors.push("Positive promotion did not update the implementation trace record.");
    }
    if (registry.includes("scaffolded_path:")) errors.push("Positive promotion left scaffolded_path in the promoted record.");
    const residues = Object.keys(snapshotDirectory(fixture.workspace)).filter((file) => /\.tf-.*\.(?:tmp|bak)$/u.test(file));
    if (residues.length > 0) errors.push(`Positive promotion left transaction residues: ${residues.join(", ")}`);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
}

/** @param {string[]} errors @returns {number} */
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
  for (const fixtureCase of fixtures) {
    const fixture = createWorkspace(fixtureCase.scenario);
    try {
      const before = snapshotDirectory(fixture.workspace);
      const result = runProcess(process.execPath, [path.join(rootDir, toolProjectPath), ...(fixtureCase.args ?? [])], {
        TF_IMPLEMENTATION_PROMOTION_ROOT: fixture.workspace,
      });
      const after = snapshotDirectory(fixture.workspace);
      const diagnostics = `${result.stdout}\n${result.stderr}`;
      if (result.status === 0) errors.push(`${fixtureCase.id} negative fixture unexpectedly passed.`);
      if (!diagnostics.includes(fixtureCase.expected_error_contains)) {
        errors.push(`${fixtureCase.id} did not emit expected diagnostic: ${fixtureCase.expected_error_contains}`);
      }
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        errors.push(`${fixtureCase.id} changed its workspace despite promotion failure.`);
      }
    } finally {
      fs.rmSync(fixture.workspace, { recursive: true, force: true });
    }
  }
  return fixtures.length;
}

const errors = [];
let fixtureCount = 0;
try {
  validateStaticContract(errors);
  validatePositiveCase(errors);
  fixtureCount = validateNegativeFixtures(errors);
} catch (error) {
  errors.push(error.message);
}

if (errors.length > 0) {
  console.error("Governed implementation promotion check failed.");
  console.error(`Implemented requirement: ${implementedRequirementId}`);
  console.error(`Negative fixtures checked: ${fixtureCount}`);
  console.error("Warnings: 0");
  console.error(`Errors: ${errors.length}`);
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log("Governed implementation promotion check passed.");
  console.log(`Implemented requirement: ${implementedRequirementId}`);
  console.log(`Negative fixtures checked: ${fixtureCount}`);
  console.log("Warnings: 0");
  console.log("Errors: 0");
}
