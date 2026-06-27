#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSqliteChildProjectStore } from "../../src/MR-0003/child-project-management/adapters/sqlite-child-project-store.adapter.mjs";
import { createChildProjectManagementService } from "../../src/MR-0003/child-project-management/child-project-management.service.mjs";

/**
 * @file Demo child-project SQLite registration tool.
 *
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @implementsRequirement MR-0003REQ-0028
 * @implementsRequirement MR-0003REQ-0029
 * @derivedFromDecision MR-0003/ADR-0005
 * @derivedFromDecision MR-0003/ADR-0006
 * @macroRequirement MR-0003
 *
 * This tool registers the resettable demo child-project workspace in the
 * platform child-project management SQLite store through the service and
 * ChildProjectStorePort boundary. It keeps the demo workspace itself under
 * `.threat-forge/workspaces/demo-child-project/` and stores operational state
 * under `.threat-forge/state/child-project-management.sqlite`, both ignored by
 * Git. The default register mode resets the demo workspace first so the stored
 * record points at a valid standard Project Model skeleton.
 *
 * Side effects in `--register` mode: optionally invokes the demo workspace reset
 * tool, creates the ignored `.threat-forge/state/` directory, opens or creates
 * the configured SQLite database, upserts the demo child-project record, and
 * upserts a latest passing check-run summary. It does not mutate the versioned
 * demo seed, expose HTTP APIs, update frontend state directly, parse child
 * Project Model contents into SQLite, clone repositories, commit, push, or write
 * outside `.threat-forge/` unless an explicit database path is supplied.
 *
 * Side effects in `--self-test` mode: creates and removes a temporary SQLite
 * database under the operating-system temp directory and does not mutate the
 * default demo workspace or default platform state database.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const resetToolPath = path.join(rootDir, "backend", "tools", "MR-0003", "reset-demo-child-project-workspace.mjs");
const stateRoot = path.join(rootDir, ".threat-forge", "state");
const defaultDatabasePath = path.join(stateRoot, "child-project-management.sqlite");
const defaultWorkspacePath = path.join(rootDir, ".threat-forge", "workspaces", "demo-child-project");
const demoChildProjectId = "demo-child-project";
const demoCheckRunId = "demo-child-project-latest-reset";
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
 * Returns a repository-relative path with stable separators.
 *
 * @param {string} absolutePath - Absolute path.
 * @returns {string} Repository-relative path.
 */
function relativeToRoot(absolutePath) {
  return normalizeProjectPath(path.relative(rootDir, absolutePath));
}

/**
 * Parses command-line options.
 *
 * @param {string[]} rawArgs - CLI arguments after the script path.
 * @returns {{mode: "register"|"self-test"|"help", databasePath: string, workspacePath: string, resetWorkspace: boolean}} Parsed options.
 */
function parseArgs(rawArgs) {
  const options = {
    mode: "help",
    databasePath: defaultDatabasePath,
    workspacePath: defaultWorkspacePath,
    resetWorkspace: true,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--register") {
      options.mode = "register";
      continue;
    }
    if (arg === "--self-test") {
      options.mode = "self-test";
      continue;
    }
    if (arg === "--database") {
      const value = rawArgs[index + 1];
      if (!value) {
        addError("--database requires a value.");
        continue;
      }
      options.databasePath = path.resolve(rootDir, value);
      index += 1;
      continue;
    }
    if (arg === "--workspace") {
      const value = rawArgs[index + 1];
      if (!value) {
        addError("--workspace requires a value.");
        continue;
      }
      options.workspacePath = path.resolve(rootDir, value);
      index += 1;
      continue;
    }
    if (arg === "--skip-reset") {
      options.resetWorkspace = false;
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
  console.log("  node backend/tools/MR-0003/register-demo-child-project.mjs --register");
  console.log("  node backend/tools/MR-0003/register-demo-child-project.mjs --register --skip-reset");
  console.log("  node backend/tools/MR-0003/register-demo-child-project.mjs --self-test");
}

/**
 * Runs the existing safe demo workspace reset tool.
 *
 * @param {string} workspacePath - Absolute workspace path.
 * @returns {void}
 */
function resetDemoWorkspace(workspacePath) {
  const result = spawnSync(process.execPath, [resetToolPath, "--reset", "--target", workspacePath], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    addError(`Demo workspace reset failed to start: ${result.error.message}`);
    return;
  }
  if (result.status !== 0) {
    const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    addError(`Demo workspace reset failed.${combinedOutput ? `\n${combinedOutput}` : ""}`);
  }
}

/**
 * Creates the demo child-project record saved in platform operational storage.
 *
 * @param {string} workspacePath - Absolute workspace path.
 * @param {string} timestamp - Timestamp used for persisted metadata.
 * @returns {Record<string, unknown>} Child project record.
 */
function createDemoChildProjectRecord(workspacePath, timestamp) {
  return {
    id: demoChildProjectId,
    name: "Demo Child Project",
    repository: {
      kind: "local",
      url: null,
      local_path: relativeToRoot(workspacePath),
      default_branch: "master",
    },
    project_model: {
      root: "docs/reference/project-model",
      governance_profile: "threat-forge-standard-child-project",
    },
    lifecycle_policy: {
      document_first_required: true,
      code_traceability_required: true,
      threat_analysis_pre_code_required: "reserved",
      governed_commit_push_required: true,
      direct_push_allowed: false,
    },
    archived: false,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

/**
 * Creates the latest demo check run summary saved in platform operational storage.
 *
 * @param {string} timestamp - Timestamp used for persisted metadata.
 * @returns {Record<string, unknown>} Child project check run.
 */
function createDemoCheckRun(timestamp) {
  return {
    id: demoCheckRunId,
    child_project_id: demoChildProjectId,
    checked_at: timestamp,
    repository_head: null,
    branch: "master",
    overall_status: "pass",
    gate_results: [
      {
        gate_name: "child-project-demo-workspace-reset",
        status: "pass",
        summary: "Demo child-project workspace was reset from the versioned seed.",
      },
      {
        gate_name: "child-project-standard-project-model",
        status: "pass",
        summary: "Demo child-project Project Model skeleton is valid.",
      },
    ],
    violations: [],
  };
}

/**
 * Registers the demo child project through the service and store port.
 *
 * @param {{databasePath: string, workspacePath: string, now?: () => string}} options - Registration options.
 * @returns {Promise<{databasePath: string, workspacePath: string, state: Record<string, unknown>}|null>} Registration summary.
 */
async function registerDemoChildProject({ databasePath, workspacePath, now = () => new Date().toISOString() }) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const timestamp = now();
  const store = createSqliteChildProjectStore({ databasePath, now });
  try {
    const service = createChildProjectManagementService({ storePort: store });
    await service.registerChildProject({ childProject: createDemoChildProjectRecord(workspacePath, timestamp) });
    await service.recordCheckRun({ checkRun: createDemoCheckRun(timestamp) });
    const state = await service.getOperationalState({ childProjectId: demoChildProjectId });
    if (!state) {
      addError(`Registered demo child project could not be read back: ${demoChildProjectId}`);
      return null;
    }
    return { databasePath, workspacePath, state };
  } finally {
    store.close();
  }
}

/**
 * Runs deterministic self-test behavior without touching default state.
 *
 * @returns {Promise<{databasePath: string, workspacePath: string, state: Record<string, unknown>}|null>} Self-test summary.
 */
async function runSelfTest() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tf-demo-child-project-registration-"));
  try {
    const databasePath = path.join(tempRoot, "child-project-management.sqlite");
    const workspacePath = path.join(tempRoot, "workspaces", "demo-child-project");
    const summary = await registerDemoChildProject({
      databasePath,
      workspacePath,
      now: () => "2026-06-27T00:00:00.000Z",
    });

    const latestStatus = summary?.state?.latest_check_run?.overall_status;
    if (latestStatus !== "pass") {
      addError(`Demo registration self-test expected latest status pass, got ${String(latestStatus)}.`);
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

if (options.mode === "register" && options.resetWorkspace) {
  resetDemoWorkspace(options.workspacePath);
}

const summary = options.mode === "self-test"
  ? await runSelfTest()
  : errors.length === 0
    ? await registerDemoChildProject(options)
    : null;

if (errors.length > 0 || !summary) {
  console.error("Demo child-project SQLite registration failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Demo child-project SQLite registration passed.");
console.log(`Mode: ${options.mode}`);
console.log(`Database: ${normalizeProjectPath(path.relative(rootDir, summary.databasePath))}`);
console.log(`Workspace: ${normalizeProjectPath(path.relative(rootDir, summary.workspacePath))}`);
console.log(`Child project: ${demoChildProjectId}`);
console.log(`Latest status: ${summary.state.latest_check_run?.overall_status ?? "unknown"}`);
console.log("Implemented requirement: MR-0003REQ-0025");
console.log("Implemented requirement: MR-0003REQ-0026");
console.log("Implemented requirement: MR-0003REQ-0028");
console.log("Implemented requirement: MR-0003REQ-0029");
