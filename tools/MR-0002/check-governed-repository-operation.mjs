#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  loadRepositoryProjectionMaterializers,
} from "./lib/repository-projection-materialization.mjs";

/**
 * @file Deterministic checker for the ThreatForge governed repository runner.
 *
 * @implementsRequirement MR-0002ADR-0002REQ-0001GOV-0002
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0002
 * @derivedFromDecision MR-0002/ADR-0002
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Validates runner traceability, registry-driven materialization, fail-closed
 * operation ordering and absence of projection-specific hard-coded commands.
 * It validates the canonical materialization registry without executing write
 * commands, runs deterministic integration tests in isolated repositories, and
 * proves source-check detection through registered negative mutations.
 *
 * Side effects: reads governed sources and registries and executes isolated
 * test fixtures. It does not execute materializers against the canonical
 * workspace and performs no canonical Git mutations.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRootDir = path.resolve(scriptDir, "..", "..");
const runnerPath = path.join(
  repositoryRootDir,
  "tools",
  "MR-0002",
  "run-governed-repository-operation.mjs",
);
const fixturesRegistryPath = path.join(
  repositoryRootDir,
  "tools",
  "MR-0002",
  "fixtures",
  "repository-operation",
  "negative-fixtures.registry.json",
);
const materializationTestPath = path.join(
  repositoryRootDir,
  "tools",
  "MR-0002",
  "tests",
  "repository-projection-materialization.test.mjs",
);

const requiredTraceabilityMarkers = [
  "@implementsRequirement MR-0002ADR-0002REQ-0001",
  "@implementsRequirement MR-0002ADR-0002REQ-0001GOV-0001",
  "@implementsRequirement MR-0002ADR-0002REQ-0002",
  "@implementsRequirement MR-0002ADR-0002REQ-0002GOV-0001",
  "@implementsRequirement MR-0002ADR-0002REQ-0002GOV-0002",
  "@derivedFromDecision MR-0002/ADR-0002",
  "@macroRequirement MR-0002",
  "@implementationStatus implemented",
];
const forbiddenProjectionSpecificFragments = [
  "materialize-governed-document-authoring-schema.mjs",
  "materialize-vscode-governed-document-authoring-adapter.mjs",
  ".vscode/schemas/governed-document-authoring.schema.json",
];

/** @param {string} filePath @returns {string} */
function readText(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n/gu, "\n");
}

/**
 * Validates the runner source without executing it.
 *
 * @param {string} runnerText - Runner source text.
 * @returns {string[]} Deterministic diagnostics.
 */
function validateRunnerSource(runnerText) {
  const errors = [];
  const traceabilityLines = new Set(
    runnerText
      .split(/\r?\n/u)
      .map((line) => line.replace(/^\s*\*?\s*/u, "").trim())
      .filter(Boolean),
  );

  for (const marker of requiredTraceabilityMarkers) {
    if (!traceabilityLines.has(marker)) {
      errors.push(`Runner is missing traceability marker: ${marker}`);
    }
  }

  if (!runnerText.includes('new Set(["--check", "--commit-push"])')) {
    errors.push("Runner is missing supported governed modes.");
  }
  if (!runnerText.includes('["tools/repo-check.mjs"]')) {
    errors.push("Runner is missing canonical repo-check invocation.");
  }
  if (!runnerText.includes('mode === "--commit-push" && !commitMessage')) {
    errors.push("Runner is missing mandatory commit message validation.");
  }
  if (!runnerText.includes('"@{u}"')) {
    errors.push("Runner is missing configured upstream validation.");
  }
  if (!runnerText.includes("createRepositoryProjectionMaterializationSession({ rootDir })")) {
    errors.push("Runner is missing registered materialization session creation.");
  }
  if (!runnerText.includes("materializationSession.execute();")) {
    errors.push("Runner is missing registered materialization execution.");
  }
  if (!runnerText.includes("materializationSession.rollback();")) {
    errors.push("Runner is missing pre-stage materialization rollback.");
  }
  if (!runnerText.includes('if (mode === "--commit-push")')) {
    errors.push("Runner must limit materializer writes to commit-push mode.");
  }
  if (!runnerText.includes('["add", "--all"]')) {
    errors.push("Runner is missing governed stage operation.");
  }
  if (!runnerText.includes('["diff", "--cached", "--check"]')) {
    errors.push("Runner is missing staged diff validation.");
  }
  if (!runnerText.includes('["commit", "-m", commitMessage]')) {
    errors.push("Runner is missing governed commit operation.");
  }
  if (!runnerText.includes('["push"]')) {
    errors.push("Runner is missing governed push operation.");
  }

  for (const fragment of forbiddenProjectionSpecificFragments) {
    if (runnerText.includes(fragment)) {
      errors.push(`Runner contains projection-specific hard-coded fragment: ${fragment}`);
    }
  }

  const materializationIndex = runnerText.indexOf("materializationSession.execute();");
  const gateIndex = runnerText.indexOf("runGovernedGate(rootDir);");
  const releaseIndex = runnerText.indexOf("materializationSession.release();");
  const stageIndex = runnerText.indexOf("stageAndValidateChanges(rootDir);");
  const commitPushIndex = runnerText.indexOf("commitAndPush(rootDir, commitMessage);");
  if (
    materializationIndex < 0 ||
    gateIndex < 0 ||
    releaseIndex < 0 ||
    stageIndex < 0 ||
    commitPushIndex < 0 ||
    !(
      materializationIndex < gateIndex &&
      gateIndex < releaseIndex &&
      releaseIndex < stageIndex &&
      stageIndex < commitPushIndex
    )
  ) {
    errors.push(
      "Runner operation order must remain materialization, repository gate, release, stage validation, then commit and push.",
    );
  }

  return errors;
}

/** @returns {Array<Record<string, string>>} */
function loadFixtures() {
  if (!fs.existsSync(fixturesRegistryPath)) {
    throw new Error(
      `Negative fixture registry is missing: ${path.relative(repositoryRootDir, fixturesRegistryPath)}`,
    );
  }
  const registry = JSON.parse(readText(fixturesRegistryPath));
  if (!Array.isArray(registry.fixtures) || registry.fixtures.length === 0) {
    throw new Error("Negative fixture registry must define a non-empty fixtures array.");
  }
  return registry.fixtures;
}

/** @returns {{status: number|null, output: string}} */
function runMaterializationTests() {
  if (!fs.existsSync(materializationTestPath)) {
    throw new Error(
      `Repository materialization integration test is missing: ${path.relative(repositoryRootDir, materializationTestPath)}`,
    );
  }
  const result = spawnSync(process.execPath, ["--test", materializationTestPath], {
    cwd: repositoryRootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  if (result.error) throw new Error(`Cannot run repository materialization tests: ${result.error.message}`);
  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim(),
  };
}

const errors = [];
let runnerText = "";
let fixturesChecked = 0;
let materializersChecked = 0;
let integrationSuitesChecked = 0;

if (!fs.existsSync(runnerPath)) {
  errors.push(`Governed repository runner is missing: ${path.relative(repositoryRootDir, runnerPath)}`);
} else {
  runnerText = readText(runnerPath);
  errors.push(...validateRunnerSource(runnerText));
}

try {
  const registry = loadRepositoryProjectionMaterializers({ rootDir: repositoryRootDir });
  materializersChecked = registry.materializers.length;
} catch (error) {
  errors.push(`Materialization registry validation failed: ${error.message}`);
}

if (runnerText) {
  try {
    for (const fixture of loadFixtures()) {
      const fixtureId = String(fixture.id ?? "").trim();
      const removeFragment = String(fixture.remove_fragment ?? "");
      const expectedError = String(fixture.expected_error ?? "").trim();
      if (!fixtureId || !removeFragment || !expectedError) {
        errors.push("Repository operation negative fixture is missing id, remove_fragment, or expected_error.");
        continue;
      }
      if (!runnerText.includes(removeFragment)) {
        errors.push(`${fixtureId} cannot remove its configured source fragment.`);
        continue;
      }
      const diagnostics = validateRunnerSource(runnerText.replace(removeFragment, ""));
      fixturesChecked += 1;
      if (!diagnostics.some((message) => message.includes(expectedError))) {
        errors.push(`${fixtureId} did not produce expected diagnostic: ${expectedError}`);
      }
    }
  } catch (error) {
    errors.push(error.message);
  }
}

try {
  const suite = runMaterializationTests();
  if (suite.status !== 0) {
    errors.push(
      `Repository materialization integration suite failed with exit code ${suite.status ?? "unknown"}: ${suite.output}`,
    );
  } else {
    integrationSuitesChecked = 1;
  }
} catch (error) {
  errors.push(error.message);
}

if (errors.length > 0) {
  console.error("Governed repository operation check failed.");
  for (const error of errors) console.error(`- ${error}`);
  console.error(`Materializers checked: ${materializersChecked}`);
  console.error(`Negative fixtures checked: ${fixturesChecked}`);
  console.error(`Integration suites checked: ${integrationSuitesChecked}`);
  console.error(`Errors: ${errors.length}`);
  process.exit(1);
}

console.log("Governed repository operation check passed.");
console.log("Implemented requirement: MR-0002ADR-0002REQ-0001GOV-0002");
console.log("Implemented requirement: MR-0002ADR-0002REQ-0002GOV-0001");
console.log("Implemented requirement: MR-0002ADR-0002REQ-0002GOV-0002");
console.log(`Materializers checked: ${materializersChecked}`);
console.log(`Negative fixtures checked: ${fixturesChecked}`);
console.log(`Integration suites checked: ${integrationSuitesChecked}`);
console.log("Warnings: 0");
console.log("Errors: 0");
