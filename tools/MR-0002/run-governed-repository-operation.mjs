#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  createRepositoryProjectionMaterializationSession,
} from "./lib/repository-projection-materialization.mjs";

/**
 * @file ThreatForge governed repository operation runner.
 *
 * @implementsRequirement MR-0002ADR-0002REQ-0001
 * @implementsRequirement MR-0002ADR-0002REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0002REQ-0002
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0002
 * @derivedFromDecision MR-0002/ADR-0002
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Executes the canonical ThreatForge repository operation. Check mode remains
 * read-only. Commit-push mode first materializes every active registered
 * repository projection, proves idempotence, runs the read-only repository
 * gate, and only then stages, validates, commits, and pushes changes.
 *
 * Side effects in `--check` mode: reads Git state and executes the canonical
 * repository checks. It does not execute materializer write commands, stage,
 * commit, or push.
 *
 * Side effects in `--commit-push` mode: executes registered materializers with
 * rollback before the repository gate; after successful materialization and
 * checks, stages all non-ignored changes, validates the staged diff, creates
 * one commit using the supplied message, and pushes it to the configured
 * upstream.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRootDir = path.resolve(scriptDir, "..", "..");
const supportedModes = new Set(["--check", "--commit-push"]);

/**
 * Runs an executable without shell interpolation and streams its output.
 *
 * @param {string} rootDir - Repository root.
 * @param {string} label - Human-readable operation label.
 * @param {string} command - Executable path or name.
 * @param {string[]} args - Explicit command arguments.
 * @returns {void}
 */
function runCommand(rootDir, label, command, args) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw new Error(`Command failed to start for ${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Command failed for ${label} with exit code ${result.status ?? 1}.`);
  }
}

/**
 * Executes a command without shell interpolation and returns trimmed stdout.
 *
 * @param {string} rootDir - Repository root.
 * @param {string} command - Executable path or name.
 * @param {string[]} args - Explicit command arguments.
 * @returns {string} Trimmed standard output.
 */
function captureCommand(rootDir, command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
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
 * @param {string} rootDir - Repository root.
 * @param {string} label - Status section label.
 * @returns {string} Short status output.
 */
function printGitStatus(rootDir, label) {
  const status = captureCommand(rootDir, "git", ["status", "--short", "--branch"]);
  console.log(`\n==> ${label}`);
  console.log(status || "Working tree clean.");
  return status;
}

/**
 * Validates repository root, branch, and configured upstream.
 *
 * @param {string} rootDir - Repository root.
 * @returns {void}
 */
function verifyRepositoryContext(rootDir) {
  const gitRoot = path.resolve(captureCommand(rootDir, "git", ["rev-parse", "--show-toplevel"]));
  const branch = captureCommand(rootDir, "git", ["branch", "--show-current"]);
  const upstream = captureCommand(rootDir, "git", [
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{u}",
  ]);

  if (gitRoot !== rootDir) {
    throw new Error(`Runner root ${rootDir} does not match Git root ${gitRoot}.`);
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
 * @param {string} rootDir - Repository root.
 * @returns {void}
 */
function runGovernedGate(rootDir) {
  runCommand(rootDir, "ThreatForge repository checks", process.execPath, ["tools/repo-check.mjs"]);
}

/**
 * Stages all non-ignored changes and validates the staged diff.
 *
 * @param {string} rootDir - Repository root.
 * @returns {void}
 */
function stageAndValidateChanges(rootDir) {
  runCommand(rootDir, "Stage non-ignored repository changes", "git", ["add", "--all"]);
  const stagedFiles = captureCommand(rootDir, "git", ["diff", "--cached", "--name-only"]);

  console.log("\n==> Staged files");
  console.log(stagedFiles || "No staged files.");

  if (!stagedFiles) throw new Error("No staged changes are available for commit.");
  runCommand(rootDir, "Validate staged diff", "git", ["diff", "--cached", "--check"]);
}

/**
 * Creates the governed commit and pushes it to the configured upstream.
 *
 * @param {string} rootDir - Repository root.
 * @param {string} commitMessage - Commit message.
 * @returns {void}
 */
function commitAndPush(rootDir, commitMessage) {
  runCommand(rootDir, "Create governed commit", "git", ["commit", "-m", commitMessage]);
  runCommand(rootDir, "Push governed commit", "git", ["push"]);
}

/**
 * Executes one governed repository operation.
 *
 * @param {{rootDir?: string, mode: "--check"|"--commit-push", commitMessage?: string}} options - Operation options.
 * @returns {{mode: string, materialized: boolean}}
 */
export function runGovernedRepositoryOperation(options) {
  const rootDir = path.resolve(options?.rootDir ?? defaultRepositoryRootDir);
  const mode = String(options?.mode ?? "--check");
  const commitMessage = String(options?.commitMessage ?? "").trim();
  let materializationSession = null;

  if (!supportedModes.has(mode)) {
    throw new Error(`Unsupported governed repository operation mode: ${mode}`);
  }
  if (mode === "--commit-push" && !commitMessage) {
    throw new Error("Commit message is required for --commit-push.");
  }

  try {
    verifyRepositoryContext(rootDir);
    printGitStatus(rootDir, "Repository status before governed gate");

    if (mode === "--commit-push") {
      materializationSession = createRepositoryProjectionMaterializationSession({ rootDir });
      const result = materializationSession.execute();
      console.log("\n==> Registered repository projection materialization");
      console.log(`Registry: ${result.registryId}`);
      console.log(`Active materializers: ${result.activeMaterializerIds.length}`);
      for (const id of result.activeMaterializerIds) console.log(`- ${id}`);
    }

    runGovernedGate(rootDir);

    if (mode === "--check") {
      printGitStatus(rootDir, "Repository status after governed gate");
      console.log("\nGoverned repository check passed.");
      console.log("Implemented requirement: MR-0002ADR-0002REQ-0001");
      console.log("Implemented requirement: MR-0002ADR-0002REQ-0001GOV-0001");
      return { mode, materialized: false };
    }

    materializationSession.release();
    stageAndValidateChanges(rootDir);
    commitAndPush(rootDir, commitMessage);
    printGitStatus(rootDir, "Repository status after governed push");
    console.log("\nGoverned commit-push completed.");
    console.log("Implemented requirement: MR-0002ADR-0002REQ-0001");
    console.log("Implemented requirement: MR-0002ADR-0002REQ-0001GOV-0001");
    console.log("Implemented requirement: MR-0002ADR-0002REQ-0002");
    console.log("Implemented requirement: MR-0002ADR-0002REQ-0002GOV-0001");
    console.log("Implemented requirement: MR-0002ADR-0002REQ-0002GOV-0002");
    return { mode, materialized: true };
  } catch (error) {
    if (materializationSession && materializationSession.getState() !== "released") {
      try {
        materializationSession.rollback();
      } catch (rollbackError) {
        throw new Error(`${error.message} Materialization rollback failed: ${rollbackError.message}`);
      }
    }
    throw error;
  }
}

/** @returns {void} */
function printUsage() {
  console.error("Usage:");
  console.error("  node tools/MR-0002/run-governed-repository-operation.mjs --check");
  console.error('  node tools/MR-0002/run-governed-repository-operation.mjs --commit-push "commit message"');
}

const isDirectInvocation = process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectInvocation) {
  const rawArgs = process.argv.slice(2);
  const mode = rawArgs[0] ?? "--check";
  const commitMessage = rawArgs.slice(1).join(" ").trim();
  try {
    runGovernedRepositoryOperation({ mode, commitMessage });
  } catch (error) {
    if (!supportedModes.has(mode) || (mode === "--commit-push" && !commitMessage)) printUsage();
    console.error(`Governed repository operation failed: ${error.message}`);
    process.exit(1);
  }
}
