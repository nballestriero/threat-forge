#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Governed JSDoc static type-checking pilot for the Project Documentation Explorer.
 *
 * @implementsRequirement MR-0002REQ-0053
 * @derivedFromDecision MR-0002/ADR-0020
 * @macroRequirement MR-0002
 *
 * This tool runs TypeScript `checkJs` over the selected Project Documentation
 * Explorer pilot files using the repository's existing TypeScript development
 * dependency. It also proves that a representative wrong-field fixture fails
 * closed, so the pilot is not just executing an empty/no-op configuration.
 *
 * Side effects: reads the focused TypeScript configuration, selected JavaScript
 * files and negative fixture files, then invokes the local TypeScript compiler.
 * It does not emit build artifacts, transpile JavaScript, rename source files,
 * install packages, mutate package-lock.json, change runtime validation, or
 * expand static type-checking beyond the selected pilot scope.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const tscPath = path.join(rootDir, "node_modules", "typescript", "bin", "tsc");
const positiveConfigPath = path.join(rootDir, "tsconfig.project-documentation-explorer.checkjs.json");
const negativeConfigPath = path.join(
  rootDir,
  "backend",
  "tools",
  "MR-0002",
  "fixtures",
  "jsdoc-typecheck",
  "negative",
  "tsconfig.wrong-field-name.json",
);
const skipNegativeFixtures = process.env.TF_PROJECT_DOCUMENTATION_EXPLORER_JSDOC_TYPECHECK_SKIP_NEGATIVE_FIXTURES === "1";

/**
 * Converts an absolute file path to a repository-relative display path.
 *
 * @param {string} filePath - Absolute path to display.
 * @returns {string} Repository-relative path using forward slashes.
 */
function relativeProjectPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

/**
 * Ensures a required local file exists before invoking TypeScript.
 *
 * @param {string} filePath - Absolute path to verify.
 * @param {string} label - Human-readable file label.
 * @returns {void}
 */
function ensureFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing ${label}: ${relativeProjectPath(filePath)}`);
    process.exit(1);
  }
}

/**
 * Runs the local TypeScript compiler for a single configuration.
 *
 * @param {string} configPath - Absolute tsconfig path.
 * @returns {{status: number, output: string}} TypeScript process result.
 */
function runTsc(configPath) {
  const result = spawnSync(process.execPath, [tscPath, "-p", configPath], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  if (result.error) {
    console.error(`Failed to start TypeScript: ${result.error.message}`);
    process.exit(1);
  }

  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

/**
 * Runs the positive pilot configuration, which must pass.
 *
 * @returns {void}
 */
function runPositivePilot() {
  const result = runTsc(positiveConfigPath);
  if (result.status !== 0) {
    process.stdout.write(result.output);
    console.error("Project Documentation Explorer JSDoc static type-check failed.");
    process.exit(result.status);
  }
}

/**
 * Runs the representative negative fixture, which must fail.
 *
 * @returns {void}
 */
function runNegativeFixture() {
  const result = runTsc(negativeConfigPath);
  if (result.status === 0) {
    console.error("Negative JSDoc type-check fixture unexpectedly passed.");
    process.exit(1);
  }

  if (!result.output.includes("TS2353") || !result.output.includes("details")) {
    process.stdout.write(result.output);
    console.error("Negative JSDoc type-check fixture failed without the expected wrong-field diagnostic.");
    process.exit(1);
  }
}

ensureFileExists(tscPath, "local TypeScript compiler");
ensureFileExists(positiveConfigPath, "positive JSDoc type-check config");
ensureFileExists(negativeConfigPath, "negative JSDoc type-check config");

runPositivePilot();
if (!skipNegativeFixtures) {
  runNegativeFixture();
}

console.log("Project Documentation Explorer JSDoc static type-check pilot passed.");
console.log(`Config: ${relativeProjectPath(positiveConfigPath)}`);
console.log(`Selected files: ${skipNegativeFixtures ? "positive pilot only" : "positive pilot plus 1 negative fixture"}`);
console.log("Implemented requirement: MR-0002REQ-0053");
