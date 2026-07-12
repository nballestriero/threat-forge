#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Deterministic checker for the ThreatForge governed repository runner.
 *
 * @implementsRequirement MR-0002ADR-0002REQ-0001GOV-0002
 * @derivedFromDecision MR-0002/ADR-0002
 * @macroRequirement MR-0002
 *
 * Validates traceability and mandatory operation ordering in the canonical
 * repository runner, then proves detection behavior through registered
 * negative source mutations.
 *
 * Side effects: reads the runner and fixture registry, prints diagnostics, and
 * exits non-zero on validation failure. It does not execute Git mutations.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRootDir = path.resolve(scriptDir, "..", "..");
const runnerPath = path.join(repositoryRootDir, "tools", "MR-0002", "run-governed-repository-operation.mjs");
const fixturesRegistryPath = path.join(
  repositoryRootDir,
  "tools",
  "MR-0002",
  "fixtures",
  "repository-operation",
  "negative-fixtures.registry.json",
);

const requiredTraceabilityMarkers = [
  "@implementsRequirement MR-0002ADR-0002REQ-0001",
  "@implementsRequirement MR-0002ADR-0002REQ-0001GOV-0001",
  "@derivedFromDecision MR-0002/ADR-0002",
  "@macroRequirement MR-0002",
];

/**
 * Reads UTF-8 text and removes a possible byte-order mark.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {string} Normalized file text.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
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
    if (!traceabilityLines.has(marker)) errors.push(`Runner is missing traceability marker: ${marker}`);
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

  const gateIndex = runnerText.indexOf("runGovernedGate();");
  const stageIndex = runnerText.indexOf("stageAndValidateChanges();");
  const commitPushIndex = runnerText.indexOf("commitAndPush();");
  if (gateIndex < 0 || stageIndex < 0 || commitPushIndex < 0 || !(gateIndex < stageIndex && stageIndex < commitPushIndex)) {
    errors.push("Runner operation order must remain gate, stage validation, then commit and push.");
  }

  return errors;
}

/**
 * Loads and validates negative fixture records.
 *
 * @returns {Array<Record<string, string>>} Fixture records.
 */
function loadFixtures() {
  if (!fs.existsSync(fixturesRegistryPath)) {
    throw new Error(`Negative fixture registry is missing: ${path.relative(repositoryRootDir, fixturesRegistryPath)}`);
  }

  const registry = JSON.parse(readText(fixturesRegistryPath));
  if (!Array.isArray(registry.fixtures) || registry.fixtures.length === 0) {
    throw new Error("Negative fixture registry must define a non-empty fixtures array.");
  }

  return registry.fixtures;
}

const errors = [];
let runnerText = "";
let fixturesChecked = 0;

if (!fs.existsSync(runnerPath)) {
  errors.push(`Governed repository runner is missing: ${path.relative(repositoryRootDir, runnerPath)}`);
} else {
  runnerText = readText(runnerPath);
  errors.push(...validateRunnerSource(runnerText));
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

      const mutatedText = runnerText.replace(removeFragment, "");
      const diagnostics = validateRunnerSource(mutatedText);
      fixturesChecked += 1;

      if (!diagnostics.some((message) => message.includes(expectedError))) {
        errors.push(`${fixtureId} did not produce expected diagnostic: ${expectedError}`);
      }
    }
  } catch (error) {
    errors.push(error.message);
  }
}

if (errors.length > 0) {
  console.error("Governed repository operation check failed.");
  for (const error of errors) console.error(`- ${error}`);
  console.error(`Negative fixtures checked: ${fixturesChecked}`);
  console.error(`Errors: ${errors.length}`);
  process.exit(1);
}

console.log("Governed repository operation check passed.");
console.log("Implemented requirement: MR-0002ADR-0002REQ-0001GOV-0002");
console.log(`Negative fixtures checked: ${fixturesChecked}`);
console.log("Warnings: 0");
console.log("Errors: 0");
