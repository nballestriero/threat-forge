#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file ThreatForge governed repository operation runner.
 *
 * @implementsRequirement MR-0002ADR-0002REQ-0001
 * @implementsRequirement MR-0002ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0002/ADR-0002
 * @macroRequirement MR-0002
 *
 * Executes the canonical ThreatForge repository gate before staging, committing,
 * or pushing changes. The runner delegates all specialized validation to
 * `tools/repo-check.mjs` and stops at the first failed operation.
 *
 * Side effects in `--check` mode: reads Git state and executes the canonical
 * repository checks. It does not stage, commit, or push.
 *
 * Side effects in `--commit-push` mode: after successful checks, stages all
 * non-ignored changes, validates the staged diff, creates one commit using the
 * supplied message, and pushes it to the configured upstream.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRootDir = path.resolve(scriptDir, "..", "..");
const rawArgs = process.argv.slice(2);
const mode = rawArgs[0] ?? "--check";
const commitMessage = rawArgs.slice(1).join(" ").trim();
const supportedModes = new Set(["--check", "--commit-push"]);

/**
 * Runs an executable without shell interpolation and streams its output.
 *
 * @param {string} label - Human-readable operation label.
 * @param {string} command - Executable path or name.
 * @param {string[]} args - Explicit command arguments.
 * @returns {void}
 */
function runCommand(label, command, args) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: repositoryRootDir,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`Command failed to start for ${label}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Command failed for ${label} with exit code ${result.status}.`);
    process.exit(result.status ?? 1);
  }
}

/**
 * Executes a command without shell interpolation and returns trimmed stdout.
 *
 * @param {string} command - Executable path or name.
 * @param {string[]} args - Explicit command arguments.
 * @returns {string} Trimmed standard output.
 */
function captureCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  if (result.error) throw new Error(result.error.message);
  if (result.status !== 0) {
    const diagnostic = String(result.stderr ?? "").trim();
    throw new Error(diagnostic || `${command} ${args.join(" ")} exited with ${result.status}`);
  }

  return String(result.stdout ?? "").trim();
}

/**
 * Prints and returns the short Git status.
 *
 * @param {string} label - Status section label.
 * @returns {string} Short status output.
 */
function printGitStatus(label) {
  const status = captureCommand("git", ["status", "--short", "--branch"]);
  console.log(`\n==> ${label}`);
  console.log(status || "Working tree clean.");
  return status;
}

/**
 * Validates repository root, branch, and configured upstream.
 *
 * @returns {void}
 */
function verifyRepositoryContext() {
  const gitRoot = path.resolve(captureCommand("git", ["rev-parse", "--show-toplevel"]));
  const branch = captureCommand("git", ["branch", "--show-current"]);
  const upstream = captureCommand("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);

  if (gitRoot !== repositoryRootDir) {
    throw new Error(`Runner root ${repositoryRootDir} does not match Git root ${gitRoot}.`);
  }
  if (!branch) throw new Error("Detached HEAD is not supported by the governed repository runner.");
  if (!upstream) throw new Error("The current branch has no configured upstream.");

  console.log("==> Repository context");
  console.log(`Repository root: ${gitRoot}`);
  console.log(`Current branch: ${branch}`);
  console.log(`Configured upstream: ${upstream}`);
}

/**
 * Executes the canonical ThreatForge gate.
 *
 * @returns {void}
 */
function runGovernedGate() {
  runCommand("ThreatForge repository checks", process.execPath, ["tools/repo-check.mjs"]);
}

/**
 * Stages all non-ignored changes and validates the staged diff.
 *
 * @returns {void}
 */
function stageAndValidateChanges() {
  runCommand("Stage non-ignored repository changes", "git", ["add", "--all"]);
  const stagedFiles = captureCommand("git", ["diff", "--cached", "--name-only"]);

  console.log("\n==> Staged files");
  console.log(stagedFiles || "No staged files.");

  if (!stagedFiles) {
    console.error("No staged changes are available for commit.");
    process.exit(1);
  }

  runCommand("Validate staged diff", "git", ["diff", "--cached", "--check"]);
}

/**
 * Creates the governed commit and pushes it to the configured upstream.
 *
 * @returns {void}
 */
function commitAndPush() {
  runCommand("Create governed commit", "git", ["commit", "-m", commitMessage]);
  runCommand("Push governed commit", "git", ["push"]);
}

if (!supportedModes.has(mode)) {
  console.error("Usage:");
  console.error("  node tools/MR-0002/run-governed-repository-operation.mjs --check");
  console.error('  node tools/MR-0002/run-governed-repository-operation.mjs --commit-push "commit message"');
  process.exit(1);
}

if (mode === "--commit-push" && !commitMessage) {
  console.error("Commit message is required for --commit-push.");
  process.exit(1);
}

try {
  verifyRepositoryContext();
  printGitStatus("Repository status before governed gate");
  runGovernedGate();

  if (mode === "--check") {
    printGitStatus("Repository status after governed gate");
    console.log("\nGoverned repository check passed.");
    console.log("Implemented requirement: MR-0002ADR-0002REQ-0001");
    console.log("Implemented requirement: MR-0002ADR-0002REQ-0001GOV-0001");
    process.exit(0);
  }

  stageAndValidateChanges();
  commitAndPush();
  printGitStatus("Repository status after governed push");
  console.log("\nGoverned commit-push completed.");
  console.log("Implemented requirement: MR-0002ADR-0002REQ-0001");
  console.log("Implemented requirement: MR-0002ADR-0002REQ-0001GOV-0001");
} catch (error) {
  console.error(`Governed repository operation failed: ${error.message}`);
  process.exit(1);
}
