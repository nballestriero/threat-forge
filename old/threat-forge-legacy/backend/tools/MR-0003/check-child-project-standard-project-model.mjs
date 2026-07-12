#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Deterministic child-project standard Project Model skeleton checker.
 *
 * @implementsRequirement MR-0003REQ-0019
 * @implementsRequirement MR-0003REQ-0020
 * @implementsRequirement MR-0003REQ-0021
 * @implementsRequirement MR-0003REQ-0022
 * @derivedFromDecision MR-0003/ADR-0004
 * @macroRequirement MR-0003
 *
 * This tool validates that a target child-project repository exposes the same
 * governed Project Model skeleton used by threat-forge. It performs the
 * child-project-specific root containment and skeleton checks locally, then
 * delegates to existing root-aware Project Model validators wherever practical
 * instead of duplicating their logic.
 *
 * Side effects: reads the target repository tree, invokes existing validation
 * tools with target-root environment variables, writes diagnostics to
 * stdout/stderr, and exits non-zero when validation fails. It does not mutate
 * the target repository, generate a skeleton, infer missing registries, clone
 * repositories, execute threat analysis, implement RBAC, or introduce a custom
 * child-project document-source manifest.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const fixturesDir = path.join(scriptDir, "fixtures", "child-project-standard-project-model", "negative");

const defaultChildProjectRoot = process.env.TF_CHILD_PROJECT_STANDARD_PROJECT_MODEL_ROOT
  ? process.env.TF_CHILD_PROJECT_STANDARD_PROJECT_MODEL_ROOT
  : rootDir;
const skipDelegatedValidators = process.env.TF_CHILD_PROJECT_STANDARD_PROJECT_MODEL_SKIP_DELEGATED === "1";
const skipNegativeFixtures = process.env.TF_CHILD_PROJECT_STANDARD_PROJECT_MODEL_SKIP_NEGATIVE_FIXTURES === "1";
const errors = [];

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
 * Determines whether a raw path argument contains lexical traversal.
 *
 * @param {string} value - Raw path argument.
 * @returns {boolean} True when the path contains a `..` segment.
 */
function containsTraversalSegment(value) {
  return normalizeProjectPath(value).split("/").includes("..");
}

/**
 * Converts an absolute path to a child-project-root-relative display path.
 *
 * @param {string} childRoot - Absolute child-project root path.
 * @param {string} filePath - Absolute path to display.
 * @returns {string} Child-root-relative path using forward slashes.
 */
function relativeChildPath(childRoot, filePath) {
  return path.relative(childRoot, filePath).replaceAll("\\", "/") || ".";
}

/**
 * Adds a deterministic validation error.
 *
 * @param {string} message - Human-readable diagnostic message.
 * @returns {void}
 */
function addError(message) {
  errors.push(message);
}

/**
 * Parses command-line arguments for this checker.
 *
 * @param {string[]} rawArgs - Command-line arguments after the script path.
 * @returns {{ childProjectRoot: string, skipDelegated: boolean, skipNegative: boolean, help: boolean }} Parsed options.
 */
function parseArgs(rawArgs) {
  const options = {
    childProjectRoot: defaultChildProjectRoot,
    skipDelegated: skipDelegatedValidators,
    skipNegative: skipNegativeFixtures,
    help: false,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--child-project-root") {
      const value = rawArgs[index + 1];
      if (!value) {
        addError("--child-project-root requires a value.");
        continue;
      }
      options.childProjectRoot = value;
      index += 1;
      continue;
    }
    if (arg === "--skip-delegated-validators") {
      options.skipDelegated = true;
      continue;
    }
    if (arg === "--skip-negative-fixtures") {
      options.skipNegative = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    addError(`Unsupported argument: ${arg}`);
  }

  return options;
}

/**
 * Prints CLI usage.
 *
 * @returns {void}
 */
function printUsage() {
  console.log("Usage:");
  console.log("  node backend/tools/MR-0003/check-child-project-standard-project-model.mjs");
  console.log("  node backend/tools/MR-0003/check-child-project-standard-project-model.mjs --child-project-root <path>");
  console.log("");
  console.log("Options:");
  console.log("  --child-project-root <path>     Target child-project repository root. Defaults to this repository root.");
  console.log("  --skip-delegated-validators    Run only containment and skeleton checks.");
  console.log("  --skip-negative-fixtures       Skip this tool's negative fixtures.");
}

/**
 * Checks whether an absolute candidate path is contained in a root path.
 *
 * @param {string} rootPath - Absolute root path.
 * @param {string} candidatePath - Absolute candidate path.
 * @returns {boolean} True when candidate is equal to or below root.
 */
function isContainedInRoot(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * Resolves and validates the child-project root path.
 *
 * @param {string} rawRoot - Raw child-project root option value.
 * @returns {{ rawRoot: string, childRoot: string, realChildRoot: string }} Resolved root paths.
 */
function resolveChildProjectRoot(rawRoot) {
  if (String(rawRoot).includes("\0")) {
    addError("Child project root must not contain NUL bytes.");
  }
  if (containsTraversalSegment(rawRoot)) {
    addError("Child project root must not contain traversal segments: ..");
  }

  const childRoot = path.resolve(String(rawRoot));
  if (!fs.existsSync(childRoot)) {
    addError(`Child project root does not exist: ${childRoot}`);
    return { rawRoot, childRoot, realChildRoot: childRoot };
  }
  if (!fs.statSync(childRoot).isDirectory()) {
    addError(`Child project root must be a directory: ${childRoot}`);
    return { rawRoot, childRoot, realChildRoot: childRoot };
  }

  const realChildRoot = fs.realpathSync(childRoot);
  if (!isContainedInRoot(realChildRoot, fs.realpathSync(childRoot))) {
    addError(`Child project root real path is not contained by itself: ${childRoot}`);
  }

  return { rawRoot, childRoot, realChildRoot };
}

/**
 * Ensures a required file or directory exists, has the expected kind and remains contained.
 *
 * @param {{ realChildRoot: string }} rootInfo - Resolved root information.
 * @param {string} projectPath - Child-root-relative project path.
 * @param {"file"|"directory"} kind - Required filesystem kind.
 * @returns {boolean} True when the required path is valid.
 */
function ensureRequiredPath(rootInfo, projectPath, kind) {
  const absolutePath = path.join(rootInfo.realChildRoot, ...normalizeProjectPath(projectPath).split("/"));
  if (!fs.existsSync(absolutePath)) {
    addError(`Required ${kind} does not exist: ${projectPath}`);
    return false;
  }

  const stat = fs.statSync(absolutePath);
  if (kind === "file" && !stat.isFile()) {
    addError(`Required path is not a file: ${projectPath}`);
  }
  if (kind === "directory" && !stat.isDirectory()) {
    addError(`Required path is not a directory: ${projectPath}`);
  }

  const realPath = fs.realpathSync(absolutePath);
  if (!isContainedInRoot(rootInfo.realChildRoot, realPath)) {
    addError(`Required path escapes child project root after realpath resolution: ${projectPath}`);
  }

  return true;
}

/**
 * Lists files under a directory matching a predicate.
 *
 * @param {string} directory - Absolute directory path.
 * @param {(name: string) => boolean} predicate - Name inclusion predicate.
 * @returns {string[]} Sorted file names.
 */
function listMatchingFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Validates the minimal standard Project Model skeleton required for child projects.
 *
 * @param {{ realChildRoot: string }} rootInfo - Resolved root information.
 * @returns {{ requiredPaths: number, requirementRegistries: number, decisionRegistries: number, graphRegistries: number }} Summary.
 */
function validateStandardSkeleton(rootInfo) {
  const requiredPaths = [
    { path: "docs/reference/project-model", kind: "directory" },
    { path: "docs/reference/project-model/WORKING_PLAN.md", kind: "file" },
    { path: "docs/reference/project-model/registers", kind: "directory" },
    { path: "docs/reference/project-model/registers/macro-requirements.registry.yml", kind: "file" },
    { path: "docs/reference/project-model/registers/body-formats.registry.yml", kind: "file" },
    { path: "docs/reference/project-model/registers/taxonomies.registry.yml", kind: "file" },
    { path: "docs/reference/project-model/registers/requirements", kind: "directory" },
    { path: "docs/reference/project-model/registers/requirements/requirement-governance.registry.yml", kind: "file" },
    { path: "docs/reference/project-model/registers/decisions", kind: "directory" },
    { path: "docs/reference/project-model/registers/decisions/adr-governance.registry.yml", kind: "file" },
    { path: "docs/reference/project-model/registers/graph.index.yml", kind: "file" },
    { path: "docs/reference/project-model/registers/graph", kind: "directory" },
    { path: "docs/reference/project-model/body", kind: "directory" },
    { path: "docs/reference/project-model/body/requirements", kind: "directory" },
    { path: "docs/reference/project-model/body/decisions", kind: "directory" },
  ];

  for (const entry of requiredPaths) {
    ensureRequiredPath(rootInfo, entry.path, entry.kind);
  }

  const requirementsDir = path.join(rootInfo.realChildRoot, "docs", "reference", "project-model", "registers", "requirements");
  const decisionsDir = path.join(rootInfo.realChildRoot, "docs", "reference", "project-model", "registers", "decisions");
  const graphDir = path.join(rootInfo.realChildRoot, "docs", "reference", "project-model", "registers", "graph");

  const requirementRegistries = listMatchingFiles(
    requirementsDir,
    (name) => name.endsWith(".requirements.registry.yml") || name.endsWith(".requirements.registry.yaml"),
  );
  const decisionRegistries = listMatchingFiles(
    decisionsDir,
    (name) => name.endsWith(".decisions.registry.yml") || name.endsWith(".decisions.registry.yaml"),
  );
  const graphRegistries = listMatchingFiles(graphDir, (name) => name.endsWith(".graph.yml") || name.endsWith(".graph.yaml"));

  if (requirementRegistries.length === 0) {
    addError("At least one macro-requirement Requirement registry is required under docs/reference/project-model/registers/requirements.");
  }
  if (decisionRegistries.length === 0) {
    addError("At least one macro-requirement ADR registry is required under docs/reference/project-model/registers/decisions.");
  }
  if (graphRegistries.length === 0) {
    addError("At least one graph registry is required under docs/reference/project-model/registers/graph.");
  }

  return {
    requiredPaths: requiredPaths.length,
    requirementRegistries: requirementRegistries.length,
    decisionRegistries: decisionRegistries.length,
    graphRegistries: graphRegistries.length,
  };
}

/**
 * Runs an existing Project Model validator against the child-project root.
 *
 * @param {string} label - Human-readable validator label.
 * @param {string[]} args - Node executable arguments.
 * @param {Record<string, string>} env - Environment variables for the validator.
 * @returns {void}
 */
function runDelegatedValidator(label, args, env) {
  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...env,
    },
  });

  if (result.error) {
    addError(`Delegated validator failed to start (${label}): ${result.error.message}`);
    return;
  }

  if (result.status !== 0) {
    const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    addError(`Delegated validator failed (${label}).${combinedOutput ? `\n${combinedOutput}` : ""}`);
  }
}

/**
 * Runs root-aware existing validators against the target child-project root.
 *
 * @param {{ realChildRoot: string }} rootInfo - Resolved root information.
 * @param {boolean} skipDelegated - Whether delegated validators should be skipped.
 * @returns {number} Number of delegated validators executed.
 */
function validateWithDelegatedValidators(rootInfo, skipDelegated) {
  if (skipDelegated) return 0;

  const delegatedValidators = [
    {
      label: "Requirement registry fields",
      args: ["backend/tools/MR-0000/check-requirement-registry-fields.mjs"],
      env: {
        TF_REQUIREMENT_REGISTRY_FIELDS_ROOT: rootInfo.realChildRoot,
        TF_REQUIREMENT_REGISTRY_FIELDS_SKIP_NEGATIVE_FIXTURES: "1",
      },
    },
    {
      label: "Code traceability",
      args: ["backend/tools/MR-0000/check-code-traceability.mjs"],
      env: {
        TF_CODE_TRACEABILITY_ROOT: rootInfo.realChildRoot,
        TF_CODE_TRACEABILITY_SKIP_NEGATIVE_FIXTURES: "1",
      },
    },
    {
      label: "Orphan governed body files",
      args: ["backend/tools/MR-0000/check-orphan-governed-bodies.mjs"],
      env: {
        TF_ORPHAN_GOVERNED_BODIES_ROOT: rootInfo.realChildRoot,
      },
    },
  ];

  for (const validator of delegatedValidators) {
    runDelegatedValidator(validator.label, validator.args, validator.env);
  }

  return delegatedValidators.length;
}

/**
 * Reads UTF-8 JSON text.
 *
 * @param {string} filePath - JSON file path.
 * @returns {Record<string, unknown>} Parsed JSON value.
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Writes fixture files and directories under a temporary root.
 *
 * @param {string} tempRoot - Temporary root path.
 * @param {Record<string, string>} files - Files to write by root-relative path.
 * @param {string[]} directories - Directories to create by root-relative path.
 * @returns {void}
 */
function writeFixtureTree(tempRoot, files, directories) {
  for (const directory of directories ?? []) {
    const targetDir = path.resolve(tempRoot, normalizeProjectPath(directory));
    if (!isContainedInRoot(tempRoot, targetDir)) {
      throw new Error(`Fixture directory escapes temporary root: ${directory}`);
    }
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const [projectPath, contents] of Object.entries(files ?? {})) {
    const targetPath = path.resolve(tempRoot, normalizeProjectPath(projectPath));
    if (!isContainedInRoot(tempRoot, targetPath)) {
      throw new Error(`Fixture file escapes temporary root: ${projectPath}`);
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, String(contents ?? ""), "utf8");
  }
}

/**
 * Runs a single negative fixture against this checker.
 *
 * @param {string} fixturePath - Fixture JSON path.
 * @returns {{ passed: boolean, id: string, diagnostic?: string }} Fixture result.
 */
function runNegativeFixture(fixturePath) {
  const fixture = readJson(fixturePath);
  const fixtureId = String(fixture.id ?? path.basename(fixturePath, ".json"));
  const expectedDiagnostic = String(fixture.expectedDiagnostic ?? "").trim();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `tf-child-project-model-${fixtureId}-`));

  try {
    writeFixtureTree(tempRoot, fixture.files ?? {}, fixture.directories ?? []);
    const args = Array.isArray(fixture.args)
      ? fixture.args.map(String)
      : ["--child-project-root", tempRoot, "--skip-delegated-validators"];
    const result = spawnSync(process.execPath, [scriptPath, ...args, "--skip-negative-fixtures"], {
      cwd: tempRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        TF_CHILD_PROJECT_STANDARD_PROJECT_MODEL_SKIP_NEGATIVE_FIXTURES: "1",
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
 * Proves representative invalid child-project skeletons fail closed.
 *
 * @param {boolean} skipNegative - Whether negative fixtures should be skipped.
 * @returns {number} Number of fixtures executed.
 */
function validateNegativeFixtures(skipNegative) {
  if (skipNegative || !fs.existsSync(fixturesDir)) return 0;

  const fixturePaths = fs
    .readdirSync(fixturesDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(fixturesDir, name));

  for (const fixturePath of fixturePaths) {
    const result = runNegativeFixture(fixturePath);
    if (!result.passed) {
      addError(`Negative fixture ${result.id} failed: ${result.diagnostic}`);
    }
  }

  return fixturePaths.length;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printUsage();
  process.exit(errors.length > 0 ? 1 : 0);
}

const rootInfo = resolveChildProjectRoot(options.childProjectRoot);
const skeletonSummary = validateStandardSkeleton(rootInfo);
const delegatedValidatorCount = errors.length === 0 ? validateWithDelegatedValidators(rootInfo, options.skipDelegated) : 0;
const negativeFixtureCount = errors.length === 0 ? validateNegativeFixtures(options.skipNegative) : 0;

if (errors.length > 0) {
  console.error("Child project standard Project Model skeleton check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Child project standard Project Model skeleton check passed.");
console.log(`Child project root: ${rootInfo.realChildRoot}`);
console.log(`Project Model root: ${relativeChildPath(rootInfo.realChildRoot, path.join(rootInfo.realChildRoot, "docs", "reference", "project-model"))}`);
console.log(`Required skeleton paths: ${skeletonSummary.requiredPaths}`);
console.log(`Requirement registries: ${skeletonSummary.requirementRegistries}`);
console.log(`ADR registries: ${skeletonSummary.decisionRegistries}`);
console.log(`Graph registries: ${skeletonSummary.graphRegistries}`);
console.log(`Delegated validators: ${delegatedValidatorCount}`);
console.log(`Negative fixtures: ${negativeFixtureCount}`);
console.log("Implemented requirement: MR-0003REQ-0019");
console.log("Implemented requirement: MR-0003REQ-0020");
console.log("Implemented requirement: MR-0003REQ-0021");
console.log("Implemented requirement: MR-0003REQ-0022");
