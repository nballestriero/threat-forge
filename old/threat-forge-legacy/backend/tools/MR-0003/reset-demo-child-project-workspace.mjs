#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Resettable demo child-project workspace generator.
 *
 * @implementsRequirement MR-0003REQ-0027
 * @implementsRequirement MR-0003REQ-0028
 * @implementsRequirement MR-0003REQ-0029
 * @implementsRequirement MR-0003REQ-0030
 * @derivedFromDecision MR-0003/ADR-0006
 * @macroRequirement MR-0003
 *
 * This tool copies the versioned demo child-project seed from
 * `examples/child-projects/minimal-governed-child-project/` into a generated
 * runtime workspace under `.threat-forge/workspaces/demo-child-project/` and
 * validates the copied Project Model with the reusable child-project skeleton
 * checker. In self-test mode it performs the same reset in an isolated
 * temporary workspace and proves unsafe targets are rejected.
 *
 * Side effects in `--reset` mode: removes and recreates the configured demo
 * workspace directory under `.threat-forge/workspaces/`, copies seed files, and
 * invokes the child-project skeleton checker. It does not mutate the versioned
 * seed, write SQLite records, expose HTTP APIs, update UI state, clone remote
 * repositories, commit, push, or write outside the configured workspace root.
 *
 * Side effects in `--self-test` mode: creates and removes temporary directories
 * under the operating-system temp area. It does not mutate repository files or
 * the default demo workspace.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const seedDir = path.join(rootDir, "examples", "child-projects", "minimal-governed-child-project");
const workspaceRoot = path.join(rootDir, ".threat-forge", "workspaces");
const defaultWorkspaceDir = path.join(workspaceRoot, "demo-child-project");
const checkerPath = path.join(rootDir, "backend", "tools", "MR-0003", "check-child-project-standard-project-model.mjs");
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
 * Adds a deterministic validation error.
 *
 * @param {string} message - Error message.
 * @returns {void}
 */
function addError(message) {
  errors.push(message);
}

/**
 * Determines whether a candidate path is equal to or under a root path.
 *
 * @param {string} rootPath - Absolute root path.
 * @param {string} candidatePath - Absolute candidate path.
 * @returns {boolean} True when candidate is contained in root.
 */
function isContainedInRoot(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * Parses command-line options.
 *
 * @param {string[]} rawArgs - CLI arguments after the script path.
 * @returns {{ mode: "reset"|"self-test"|"help", target: string }} Parsed options.
 */
function parseArgs(rawArgs) {
  const options = { mode: "help", target: defaultWorkspaceDir };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--reset") {
      options.mode = "reset";
      continue;
    }
    if (arg === "--self-test") {
      options.mode = "self-test";
      continue;
    }
    if (arg === "--target") {
      const value = rawArgs[index + 1];
      if (!value) {
        addError("--target requires a value.");
        continue;
      }
      options.target = value;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.mode = "help";
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
  console.log("  node backend/tools/MR-0003/reset-demo-child-project-workspace.mjs --reset");
  console.log("  node backend/tools/MR-0003/reset-demo-child-project-workspace.mjs --reset --target .threat-forge/workspaces/demo-child-project");
  console.log("  node backend/tools/MR-0003/reset-demo-child-project-workspace.mjs --self-test");
}

/**
 * Ensures the versioned demo seed exists and is a directory.
 *
 * @returns {void}
 */
function validateSeed() {
  if (!fs.existsSync(seedDir) || !fs.statSync(seedDir).isDirectory()) {
    addError(`Demo child-project seed does not exist: ${normalizeProjectPath(path.relative(rootDir, seedDir))}`);
  }
}

/**
 * Resolves and validates a reset target under the configured workspace root.
 *
 * @param {string} rawTarget - Raw target path.
 * @param {string} allowedRoot - Allowed workspace root.
 * @returns {{ targetDir: string, allowedRoot: string }} Resolved paths.
 */
function resolveResetTarget(rawTarget, allowedRoot = workspaceRoot) {
  if (String(rawTarget).includes("\0")) {
    addError("Demo workspace target must not contain NUL bytes.");
  }
  if (normalizeProjectPath(rawTarget).split("/").includes("..")) {
    addError("Demo workspace target must not contain traversal segments: ...");
  }

  const resolvedAllowedRoot = path.resolve(allowedRoot);
  const targetDir = path.resolve(rootDir, rawTarget);
  if (!isContainedInRoot(resolvedAllowedRoot, targetDir)) {
    addError(
      `Demo workspace target must stay under ${normalizeProjectPath(path.relative(rootDir, resolvedAllowedRoot))}: ${normalizeProjectPath(path.relative(rootDir, targetDir))}`,
    );
  }

  if (path.resolve(seedDir) === targetDir || isContainedInRoot(targetDir, path.resolve(seedDir))) {
    addError("Demo workspace target must not be the versioned seed or contain the versioned seed.");
  }

  return { targetDir, allowedRoot: resolvedAllowedRoot };
}

/**
 * Copies a directory recursively while preserving file contents.
 *
 * @param {string} sourceDir - Source directory.
 * @param {string} targetDir - Target directory.
 * @returns {number} Number of files copied.
 */
function copyDirectory(sourceDir, targetDir) {
  let copiedFiles = 0;
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copiedFiles += copyDirectory(sourcePath, targetPath);
      continue;
    }
    if (entry.isFile()) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
      copiedFiles += 1;
    }
  }

  return copiedFiles;
}

/**
 * Runs the reusable child-project skeleton checker for a workspace.
 *
 * @param {string} targetDir - Workspace directory to validate.
 * @returns {void}
 */
function validateWorkspace(targetDir) {
  const result = spawnSync(process.execPath, [checkerPath, "--child-project-root", targetDir, "--skip-negative-fixtures"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      TF_CHILD_PROJECT_STANDARD_PROJECT_MODEL_SKIP_NEGATIVE_FIXTURES: "1",
    },
  });

  if (result.error) {
    addError(`Child project skeleton checker failed to start: ${result.error.message}`);
    return;
  }
  if (result.status !== 0) {
    const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    addError(`Generated demo child-project workspace failed validation.${combinedOutput ? `\n${combinedOutput}` : ""}`);
  }
}

/**
 * Resets a demo workspace from the versioned seed.
 *
 * @param {string} rawTarget - Target path.
 * @param {string} allowedRoot - Allowed root path.
 * @returns {{ targetDir: string, copiedFiles: number }} Reset summary.
 */
function resetWorkspace(rawTarget, allowedRoot = workspaceRoot) {
  validateSeed();
  const target = resolveResetTarget(rawTarget, allowedRoot);
  if (errors.length > 0) return { targetDir: target.targetDir, copiedFiles: 0 };

  fs.mkdirSync(target.allowedRoot, { recursive: true });
  fs.rmSync(target.targetDir, { recursive: true, force: true });
  const copiedFiles = copyDirectory(seedDir, target.targetDir);
  validateWorkspace(target.targetDir);
  return { targetDir: target.targetDir, copiedFiles };
}

/**
 * Runs deterministic self-test behavior without touching the default workspace.
 *
 * @returns {{ targetDir: string, copiedFiles: number }} Self-test summary.
 */
function runSelfTest() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tf-demo-child-project-workspace-"));
  const tempWorkspaceRoot = path.join(tempRoot, "workspaces");
  const tempTarget = path.join(tempWorkspaceRoot, "demo-child-project");

  try {
    const summary = resetWorkspace(tempTarget, tempWorkspaceRoot);
    if (errors.length > 0) return summary;

    const before = errors.length;
    resolveResetTarget(rootDir, tempWorkspaceRoot);
    if (errors.length === before) {
      addError("Unsafe target self-test failed: repository root was not rejected as a demo workspace target.");
    } else {
      errors.splice(before, errors.length - before);
    }

    return summary;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

const options = parseArgs(process.argv.slice(2));
if (options.mode === "help") {
  printUsage();
  process.exit(errors.length > 0 ? 1 : 0);
}

const summary = options.mode === "self-test" ? runSelfTest() : resetWorkspace(options.target);

if (errors.length > 0) {
  console.error("Demo child-project workspace reset failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Demo child-project workspace reset passed.");
console.log(`Mode: ${options.mode}`);
console.log(`Seed: ${normalizeProjectPath(path.relative(rootDir, seedDir))}`);
console.log(`Workspace: ${normalizeProjectPath(path.relative(rootDir, summary.targetDir))}`);
console.log(`Copied files: ${summary.copiedFiles}`);
console.log("Validation: child-project standard Project Model skeleton");
console.log("Implemented requirement: MR-0003REQ-0027");
console.log("Implemented requirement: MR-0003REQ-0028");
console.log("Implemented requirement: MR-0003REQ-0029");
console.log("Implemented requirement: MR-0003REQ-0030");
