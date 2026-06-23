#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Deterministic anti-regression guard for governed repository operation entrypoints.
 *
 * @implementsRequirement MR-0000REQ-0007GOV-0003
 * @implementsRequirement MR-0000REQ-0007GOV-0004
 * @derivedFromDecision MR-0000/ADR-0003
 * @macroRequirement MR-0000
 *
 * This checker verifies that the canonical governed repository operation runner
 * remains present, that the root npm commands still point to it, and that the
 * runner still references the expected project-model gate commands. Negative
 * fixtures prove that representative invalid repository operation states fail
 * closed and emit expected diagnostics.
 *
 * Side effects: reads package.json, the governed runner source file, and the
 * MR-0000 graph registry; writes diagnostics to stdout/stderr; exits non-zero
 * when the repository operation entrypoints or traceability records drift. It
 * does not stage, commit, push, rewrite package scripts, modify Git hooks,
 * enforce remote branch protection, or replace the governed runner itself.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..", "..");
const rootDir = process.env.TF_REPO_OPERATION_GOVERNANCE_ROOT
  ? path.resolve(process.env.TF_REPO_OPERATION_GOVERNANCE_ROOT)
  : defaultRootDir;
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
const negativeFixturesDir = process.env.TF_REPO_OPERATION_GOVERNANCE_NEGATIVE_FIXTURES_DIR
  ? path.resolve(process.env.TF_REPO_OPERATION_GOVERNANCE_NEGATIVE_FIXTURES_DIR)
  : path.join(scriptDir, "fixtures", "repo-operation-governance", "negative");
const skipNegativeFixtures = process.env.TF_REPO_OPERATION_GOVERNANCE_SKIP_NEGATIVE_FIXTURES === "1";
const errors = [];

const expectedScripts = new Map([
  ["repo:check", "node backend/tools/MR-0000/run-governed-repository-operation.mjs --check"],
  ["repo:commit-push", "node backend/tools/MR-0000/run-governed-repository-operation.mjs --commit-push"],
  [
    "docs:repo-operation-governance",
    "node backend/tools/MR-0000/check-governed-repository-operation.mjs",
  ],
  [
    "docs:lockfile-integrity",
    "node backend/tools/MR-0000/check-lockfile-integrity.mjs",
  ],
  [
    "test:runtime",
    "node --test backend/tests/MR-0002/project-documentation-explorer/project-documentation-explorer.service.test.mjs",
  ],
]);

const requiredRunnerTraceabilityMarkers = [
  "@implementsRequirement MR-0000REQ-0007GOV-0001",
  "@implementsRequirement MR-0000REQ-0007GOV-0002",
  "@implementsRequirement MR-0000REQ-0017",
  "@implementsRequirement MR-0000REQ-0018",
  "@implementsRequirement MR-0000REQ-0019",
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
  "docs:lockfile-integrity",
  "frontend:build",
  "test:runtime",
];

const requiredGraphFragments = [
  "id: MR-0000REQ-0007GOV-0003",
  "id: MR-0000REQ-0007GOV-0004",
  "id: TOOL-check-governed-repository-operation",
  "path: backend/tools/MR-0000/check-governed-repository-operation.mjs",
  "subject: MR-0000REQ-0007GOV-0003\n    predicate: implemented_by\n    object: TOOL-check-governed-repository-operation",
  "subject: TOOL-check-governed-repository-operation\n    predicate: verifies\n    object: MR-0000REQ-0007GOV-0003",
  "subject: MR-0000REQ-0007GOV-0004\n    predicate: implemented_by\n    object: TOOL-check-governed-repository-operation",
  "subject: TOOL-check-governed-repository-operation\n    predicate: verifies\n    object: MR-0000REQ-0007GOV-0004",
  "subject: MR-0000REQ-0017\n    predicate: implemented_by\n    object: TOOL-run-governed-repository-operation",
  "subject: TOOL-run-governed-repository-operation\n    predicate: verifies\n    object: MR-0000REQ-0017",
  "id: TOOL-project-documentation-explorer-service-test",
  "path: backend/tests/MR-0002/project-documentation-explorer/project-documentation-explorer.service.test.mjs",
  "subject: MR-0000REQ-0018\n    predicate: implemented_by\n    object: TOOL-run-governed-repository-operation",
  "subject: TOOL-run-governed-repository-operation\n    predicate: verifies\n    object: MR-0000REQ-0018",
  "subject: MR-0000REQ-0018\n    predicate: implemented_by\n    object: TOOL-project-documentation-explorer-service-test",
  "subject: TOOL-project-documentation-explorer-service-test\n    predicate: verifies\n    object: MR-0000REQ-0018",
  "id: TOOL-check-lockfile-integrity",
  "path: backend/tools/MR-0000/check-lockfile-integrity.mjs",
  "subject: MR-0000REQ-0019\n    predicate: implemented_by\n    object: TOOL-run-governed-repository-operation",
  "subject: TOOL-run-governed-repository-operation\n    predicate: verifies\n    object: MR-0000REQ-0019",
  "subject: MR-0000REQ-0019\n    predicate: implemented_by\n    object: TOOL-check-lockfile-integrity",
  "subject: TOOL-check-lockfile-integrity\n    predicate: verifies\n    object: MR-0000REQ-0019",
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


/**
 * Converts path separators to stable forward slashes.
 *
 * @param {string|null|undefined} value - Path-like value.
 * @returns {string} Normalized path text.
 */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Safely writes fixture files under a temporary root.
 *
 * @param {string} tempRoot - Temporary repository root.
 * @param {Record<string, string>} files - Repository-relative fixture files.
 * @returns {void}
 */
function writeFixtureFiles(tempRoot, files) {
  for (const [projectPath, contents] of Object.entries(files ?? {})) {
    const normalizedPath = normalizeProjectPath(projectPath);
    const targetPath = path.resolve(tempRoot, normalizedPath);
    if (!targetPath.startsWith(tempRoot + path.sep)) {
      throw new Error(`Fixture file escapes temporary root: ${projectPath}`);
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, String(contents ?? ""), "utf8");
  }
}

/**
 * Runs a single negative repository operation governance fixture through this checker.
 *
 * @param {string} fixturePath - Fixture JSON path.
 * @returns {{ passed: boolean, id: string, diagnostic?: string }} Fixture result.
 */
function runNegativeFixture(fixturePath) {
  const fixture = JSON.parse(readText(fixturePath));
  const fixtureId = String(fixture.id ?? path.basename(fixturePath, ".json"));
  const expectedDiagnostic = String(fixture.expectedDiagnostic ?? "").trim();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `tf-repo-operation-governance-${fixtureId}-`));

  try {
    writeFixtureFiles(tempRoot, fixture.files ?? {});
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: tempRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        TF_REPO_OPERATION_GOVERNANCE_ROOT: tempRoot,
        TF_REPO_OPERATION_GOVERNANCE_SKIP_NEGATIVE_FIXTURES: "1",
      },
    });

    const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (result.status === 0) {
      return { passed: false, id: fixtureId, diagnostic: "fixture unexpectedly passed" };
    }
    if (expectedDiagnostic && !combinedOutput.includes(expectedDiagnostic)) {
      return {
        passed: false,
        id: fixtureId,
        diagnostic: `expected diagnostic fragment was not found: ${expectedDiagnostic}`,
      };
    }
    return { passed: true, id: fixtureId };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

/**
 * Proves representative invalid repository operation governance states fail closed.
 *
 * @returns {number} Number of negative fixtures executed.
 */
function validateNegativeFixtures() {
  if (skipNegativeFixtures || !fs.existsSync(negativeFixturesDir)) return 0;

  const fixturePaths = fs
    .readdirSync(negativeFixturesDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(negativeFixturesDir, name));

  for (const fixturePath of fixturePaths) {
    const result = runNegativeFixture(fixturePath);
    if (!result.passed) {
      errors.push(`Negative fixture ${result.id} failed: ${result.diagnostic}`);
    }
  }

  return fixturePaths.length;
}

validatePackageScripts();
validateRunnerSource();
validateGraphTraceability();
const negativeFixtureCount = validateNegativeFixtures();

if (errors.length > 0) {
  console.error("Governed repository operation check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Governed repository operation check passed.");
console.log("Implemented requirement: MR-0000REQ-0007GOV-0003");
console.log("Implemented requirement: MR-0000REQ-0007GOV-0004");
console.log(`Runner: ${runnerProjectPath}`);
console.log("Canonical commands: repo:check, repo:commit-push");
console.log(`Negative fixtures: ${negativeFixtureCount}`);
