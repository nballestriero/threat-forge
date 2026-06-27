#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Governed MR-0000 repository operation runner.
 *
 * @implementsRequirement MR-0000REQ-0007GOV-0001
 * @implementsRequirement MR-0000REQ-0007GOV-0002
 * @implementsRequirement MR-0000REQ-0017
 * @implementsRequirement MR-0000REQ-0018
 * @implementsRequirement MR-0000REQ-0019
 * @implementsRequirement MR-0000REQ-0021
 * @implementsRequirement MR-0000REQ-0023
 * @implementsRequirement MR-0003REQ-0022
 * @implementsRequirement MR-0003REQ-0029
 * @implementsRequirement MR-0003REQ-0050
 * @implementsRequirement MR-0003REQ-0054
 * @implementsRequirement MR-0003REQ-0059
 * @derivedFromDecision MR-0000/ADR-0003
 * @derivedFromDecision MR-0000/ADR-0006
 * @derivedFromDecision MR-0000/ADR-0008
 * @derivedFromDecision MR-0003/ADR-0004
 * @derivedFromDecision MR-0003/ADR-0010
 * @derivedFromDecision MR-0003/ADR-0011
 * @macroRequirement MR-0000
 * @macroRequirement MR-0003
 *
 * This runner is the thin local workflow entrypoint for governed
 * project-model work. It executes the existing MR-0000/documentation gates
 * in a deterministic order and can then stage, commit, and push repository
 * changes only after those gates pass.
 *
 * Side effects in `--check` mode: reads repository files, invokes existing
 * validation commands, prints status, and exits with the first failing gate
 * status. It does not stage, commit, or push.
 *
 * Side effects in `--commit-push` mode: invokes existing validation commands,
 * stages non-ignored repository changes after successful gates, creates one Git
 * commit with the supplied message, pushes to the configured upstream, prints
 * final repository status, and exits non-zero on any failure. It does not
 * duplicate specialized validator logic, repair project-model files, create
 * confirmation manifests, or bypass Git hooks.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..", "..");

const rawArgs = process.argv.slice(2);
const mode = rawArgs[0] ?? "--check";
const commitMessage = rawArgs.slice(1).join(" ").trim();

const gateCommands = [
  { label: "Graph format", command: "npm", args: ["run", "docs:graph-format"] },
  { label: "Project-model pages", command: "npm", args: ["run", "docs:pages"] },
  {
    label: "Documentation structure",
    command: process.execPath,
    args: ["tools/docs/check-docs-structure.mjs"],
  },
  { label: "ADR registry fields", command: "npm", args: ["run", "docs:adr-registry-fields"] },
  { label: "Requirement registry fields", command: "npm", args: ["run", "docs:requirement-registry-fields"] },
  { label: "Code traceability", command: "npm", args: ["run", "docs:code-traceability"] },
  {
    label: "Project Documentation Explorer JSDoc type-check",
    command: "npm",
    args: ["run", "docs:project-documentation-explorer-jsdoc-typecheck"],
  },
  {
    label: "Repository operation governance",
    command: "npm",
    args: ["run", "docs:repo-operation-governance"],
  },
  { label: "Body format registry", command: "npm", args: ["run", "docs:body-format-registry"] },
  { label: "Markdown body parser", command: "npm", args: ["run", "docs:markdown-body-parser"] },
  { label: "ADR body format", command: "npm", args: ["run", "docs:adr-body-format"] },
  { label: "Requirement body format", command: "npm", args: ["run", "docs:requirement-body-format"] },
  { label: "Append-first protected records", command: "npm", args: ["run", "docs:append-first"] },
  { label: "Lockfile registry and integrity", command: "npm", args: ["run", "docs:lockfile-integrity"] },
  { label: "Orphan governed body files", command: "npm", args: ["run", "docs:orphan-governed-bodies"] },
  {
    label: "Child project standard Project Model skeleton",
    command: "npm",
    args: ["run", "docs:child-project-standard-project-model"],
  },
  {
    label: "Child project demo workspace reset self-test",
    command: "npm",
    args: ["run", "docs:child-project-demo-workspace"],
  },
  {
    label: "Child project demo SQLite registration self-test",
    command: "npm",
    args: ["run", "docs:child-project-demo-registration"],
  },
  {
    label: "Child project management API serve self-test",
    command: "npm",
    args: ["run", "docs:child-project-management-api-serve"],
  },
  {
    label: "Child project governance registry contract",
    command: "npm",
    args: ["run", "docs:child-project-governance-registries"],
  },
  {
    label: "Child project governance gate planner self-test",
    command: "npm",
    args: ["run", "docs:child-project-governance-plan"],
  },
  { label: "OpenAPI contract structure", command: "npm", args: ["run", "docs:openapi-contract"] },
  { label: "Frontend build", command: "npm", args: ["run", "frontend:build"] },
  { label: "Runtime unit tests", command: "npm", args: ["run", "test:runtime"] },
];

/**
 * Builds a child-process invocation that is stable across platforms.
 *
 * Windows cannot reliably start npm package-manager shims through
 * spawnSync() in every shell/context combination. npm commands are therefore
 * routed through cmd.exe on Windows, while direct executables such as node and
 * git remain shell-free.
 *
 * @param {string} command - Command executable name.
 * @param {string[]} args - Command arguments.
 * @returns {{ command: string, args: string[], shell: boolean }} Invocation descriptor.
 */
function buildInvocation(command, args) {
  if (process.platform === "win32" && command === "npm") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "npm", ...args],
      shell: false,
    };
  }

  return { command, args, shell: false };
}

/**
 * Runs a command while streaming its output to the current process.
 *
 * @param {string} label - Human-readable operation label.
 * @param {string} command - Executable name.
 * @param {string[]} args - Command arguments.
 * @returns {void}
 */
function runCommand(label, command, args) {
  console.log(`\n==> ${label}`);
  const invocation = buildInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: invocation.shell,
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
 * Runs a command and returns trimmed stdout.
 *
 * @param {string} command - Executable name.
 * @param {string[]} args - Command arguments.
 * @returns {string} Trimmed stdout.
 */
function captureCommand(command, args) {
  const invocation = buildInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: invocation.shell,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr ?? "").trim();
    throw new Error(stderr || `${command} ${args.join(" ")} exited with ${result.status}`);
  }

  return String(result.stdout ?? "").trim();
}

/**
 * Prints the current short Git status.
 *
 * @param {string} label - Label printed before the status output.
 * @returns {string} Short Git status text.
 */
function printGitStatus(label) {
  const status = captureCommand("git", ["status", "--short", "--branch"]);
  console.log(`\n==> ${label}`);
  console.log(status || "Working tree clean.");
  return status;
}

/**
 * Ensures the current directory is a Git repository with a configured upstream.
 *
 * @returns {void}
 */
function verifyGitRepository() {
  const repoRoot = captureCommand("git", ["rev-parse", "--show-toplevel"]);
  const currentBranch = captureCommand("git", ["branch", "--show-current"]);
  const upstream = captureCommand("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);

  console.log("==> Repository context");
  console.log(`Repository root: ${repoRoot}`);
  console.log(`Current branch: ${currentBranch || "detached HEAD"}`);
  console.log(`Configured upstream: ${upstream}`);
}

/**
 * Runs all governed project-model gates in deterministic order.
 *
 * @returns {void}
 */
function runGovernedGates() {
  for (const gate of gateCommands) {
    runCommand(gate.label, gate.command, gate.args);
  }
}

/**
 * Stages all non-ignored changes and verifies that at least one change is staged.
 *
 * @returns {void}
 */
function stageChanges() {
  runCommand("Stage non-ignored repository changes", "git", ["add", "--all"]);
  const stagedFiles = captureCommand("git", ["diff", "--cached", "--name-only"]);

  console.log("\n==> Staged files");
  console.log(stagedFiles || "No staged files.");

  if (!stagedFiles) {
    console.error("No staged changes are available for commit.");
    process.exit(1);
  }
}

/**
 * Commits staged changes and pushes to the configured upstream.
 *
 * @returns {void}
 */
function commitAndPush() {
  runCommand("Create governed commit", "git", ["commit", "-m", commitMessage]);
  runCommand("Push governed commit", "git", ["push"]);
}

if (!["--check", "--commit-push"].includes(mode)) {
  console.error("Usage:");
  console.error("  npm run repo:check");
  console.error('  npm run repo:commit-push -- "commit message"');
  process.exit(1);
}

if (mode === "--commit-push" && !commitMessage) {
  console.error('Commit message is required. Example: npm run repo:commit-push -- "docs: update governed model"');
  process.exit(1);
}

verifyGitRepository();
printGitStatus("Repository status before governed gates");
runGovernedGates();

if (mode === "--check") {
  printGitStatus("Repository status after governed gates");
  console.log("\nGoverned repository check passed.");
  console.log("Implemented requirement: MR-0000REQ-0007GOV-0001");
  console.log("Implemented requirement: MR-0000REQ-0007GOV-0002");
  console.log("Implemented requirement: MR-0000REQ-0017");
  console.log("Implemented requirement: MR-0000REQ-0018");
  console.log("Implemented requirement: MR-0000REQ-0019");
  console.log("Implemented requirement: MR-0000REQ-0021");
  console.log("Implemented requirement: MR-0000REQ-0023");
  console.log("Implemented requirement: MR-0003REQ-0022");
console.log("Implemented requirement: MR-0003REQ-0050");
console.log("Implemented requirement: MR-0003REQ-0054");
  process.exit(0);
}

stageChanges();
commitAndPush();
printGitStatus("Repository status after governed push");
console.log("\nGoverned commit-push completed.");
console.log("Implemented requirement: MR-0000REQ-0007GOV-0001");
console.log("Implemented requirement: MR-0000REQ-0007GOV-0002");
console.log("Implemented requirement: MR-0000REQ-0017");
console.log("Implemented requirement: MR-0000REQ-0018");
console.log("Implemented requirement: MR-0000REQ-0019");
console.log("Implemented requirement: MR-0000REQ-0021");
console.log("Implemented requirement: MR-0000REQ-0023");
console.log("Implemented requirement: MR-0003REQ-0022");
console.log("Implemented requirement: MR-0003REQ-0050");
console.log("Implemented requirement: MR-0003REQ-0054");
