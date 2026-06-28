import { mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

/**
 * @file Local UI test environment process runner.
 *
 * @implementsRequirement MR-0002REQ-0059
 * @implementsRequirement MR-0002REQ-0060
 * @derivedFromDecision MR-0002/ADR-0024
 * @macroRequirement MR-0002
 *
 * This developer tool starts, stops and reports the local read-only UI test
 * environment used to inspect the Governance Console with live HTTP data:
 * Project Documentation Explorer backend, Child Project Governance Plan backend
 * and Vite frontend configured to read both live endpoints.
 *
 * Side effects: on start it generates child-project governance plan artifacts,
 * spawns local developer processes, writes PID metadata and logs under
 * `.threat-forge/state/ui-test-environment/`; on stop it terminates only the
 * recorded spawned processes and removes the PID file. It does not mutate
 * governed registries, execute governance gates beyond the existing artifact
 * generation command, write child project state, replace `repo:check`, commit
 * files or push to git.
 */

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const STATE_DIRECTORY = resolve(REPOSITORY_ROOT, ".threat-forge/state/ui-test-environment");
const PID_FILE = resolve(STATE_DIRECTORY, "processes.json");
const DEFAULT_PROJECT_DOCUMENTATION_EXPLORER_URL = "http://127.0.0.1:4174";
const DEFAULT_CHILD_PROJECT_GOVERNANCE_PLAN_URL = "http://127.0.0.1:4176";

/**
 * Return the platform-specific npm command.
 *
 * @returns {string} Executable name.
 */
function isWindows() {
  return process.platform === "win32";
}

/**
 * Return the platform-specific npm command.
 *
 * @returns {string} Executable name.
 */
function npmCommand() {
  return isWindows() ? "npm.cmd" : "npm";
}

/**
 * Ensure the state directory exists.
 *
 * @returns {void}
 */
function ensureStateDirectory() {
  mkdirSync(STATE_DIRECTORY, { recursive: true });
}

/**
 * Return whether a process id still appears alive.
 *
 * @param {unknown} pid - Candidate pid.
 * @returns {boolean} True when the process appears alive.
 */
function isProcessAlive(pid) {
  const normalizedPid = Number(pid);
  if (!Number.isInteger(normalizedPid) || normalizedPid <= 0) return false;
  try {
    process.kill(normalizedPid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the current process registry if present.
 *
 * @returns {{processes?: Array<Record<string, unknown>>, started_at?: string}|null} Registry.
 */
function readProcessRegistry() {
  try {
    return JSON.parse(readFileSync(PID_FILE, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Return running processes from a registry.
 *
 * @param {{processes?: Array<Record<string, unknown>>}|null} registry - Registry.
 * @returns {Array<Record<string, unknown>>} Running process records.
 */
function getRunningProcesses(registry) {
  return (registry?.processes ?? []).filter((record) => isProcessAlive(record.pid));
}

/**
 * Spawn one long-running service and attach stdout/stderr to a log file.
 *
 * @param {{name: string, args: string[], env?: Record<string, string>}} service - Service definition.
 * @returns {Record<string, unknown>} Spawned process record.
 */
function spawnService(service) {
  const logPath = resolve(STATE_DIRECTORY, `${service.name}.log`);
  const logFd = openSync(logPath, "a");
  const child = spawn(npmCommand(), service.args, {
    cwd: REPOSITORY_ROOT,
    env: { ...process.env, ...(service.env ?? {}) },
    detached: true,
    shell: isWindows(),
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });

  if (!child.pid) {
    throw new Error(`Unable to start ${service.name}; see ${logPath} for details.`);
  }
  child.unref();

  return {
    name: service.name,
    pid: child.pid,
    command: `${npmCommand()} ${service.args.join(" ")}`,
    log_path: logPath,
  };
}

/**
 * Run one foreground npm command and fail closed when it exits unsuccessfully.
 *
 * @param {string[]} args - npm arguments.
 * @returns {void}
 */
function runForegroundNpm(args) {
  const result = spawnSync(npmCommand(), args, {
    cwd: REPOSITORY_ROOT,
    env: process.env,
    shell: isWindows(),
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(`${npmCommand()} ${args.join(" ")} failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const suffix = result.signal ? `; signal ${result.signal}` : "";
    throw new Error(`${npmCommand()} ${args.join(" ")} exited with ${result.status}${suffix}`);
  }
}

/**
 * Start the complete local UI test environment.
 *
 * @returns {void}
 */
function startEnvironment() {
  ensureStateDirectory();
  const existingRegistry = readProcessRegistry();
  const runningProcesses = getRunningProcesses(existingRegistry);
  if (runningProcesses.length > 0) {
    throw new Error(`UI test environment already appears to be running. Stop it first with npm run dev:ui-test:stop. Running PIDs: ${runningProcesses.map((record) => record.pid).join(", ")}`);
  }

  runForegroundNpm(["run", "docs:child-project-governance-plan-artifacts"]);

  const services = [
    {
      name: "project-documentation-explorer",
      args: ["run", "backend:project-documentation-explorer:serve"],
    },
    {
      name: "child-project-governance-plan",
      args: ["run", "backend:child-project-governance-plan:serve"],
    },
    {
      name: "frontend",
      args: ["run", "frontend:dev"],
      env: {
        VITE_PROJECT_DOCUMENTATION_EXPLORER_SOURCE: "http",
        VITE_PROJECT_DOCUMENTATION_EXPLORER_HTTP_BASE_URL: DEFAULT_PROJECT_DOCUMENTATION_EXPLORER_URL,
        VITE_CHILD_PROJECT_GOVERNANCE_PLAN_SOURCE: "http",
        VITE_CHILD_PROJECT_GOVERNANCE_PLAN_HTTP_BASE_URL: DEFAULT_CHILD_PROJECT_GOVERNANCE_PLAN_URL,
      },
    },
  ];

  const processes = services.map(spawnService);
  writeFileSync(PID_FILE, JSON.stringify({
    started_at: new Date().toISOString(),
    repository_root: REPOSITORY_ROOT,
    endpoints: {
      project_documentation_explorer: DEFAULT_PROJECT_DOCUMENTATION_EXPLORER_URL,
      child_project_governance_plan: DEFAULT_CHILD_PROJECT_GOVERNANCE_PLAN_URL,
      frontend: "http://127.0.0.1:5173",
    },
    processes,
  }, null, 2));

  console.log("Local UI test environment started.");
  for (const record of processes) {
    console.log(`- ${record.name}: PID ${record.pid}; log ${record.log_path}`);
  }
  console.log("Open the frontend at http://127.0.0.1:5173 after Vite finishes starting.");
}

/**
 * Terminate one process record.
 *
 * @param {Record<string, unknown>} record - Process record.
 * @returns {void}
 */
function stopProcess(record) {
  const pid = Number(record.pid);
  if (!Number.isInteger(pid) || pid <= 0) return;
  if (!isProcessAlive(pid)) {
    console.log(`- ${record.name ?? "process"}: PID ${pid} is not running.`);
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "inherit", windowsHide: true });
  } else {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Process may have exited between liveness check and termination.
      }
    }
  }
  console.log(`- ${record.name ?? "process"}: requested stop for PID ${pid}.`);
}

/**
 * Stop the local UI test environment.
 *
 * @returns {void}
 */
function stopEnvironment() {
  const registry = readProcessRegistry();
  if (!registry) {
    console.log("No local UI test environment PID file found.");
    return;
  }

  for (const record of [...(registry.processes ?? [])].reverse()) {
    stopProcess(record);
  }

  rmSync(PID_FILE, { force: true });
  console.log("Local UI test environment stopped.");
}

/**
 * Print current process status.
 *
 * @returns {void}
 */
function printStatus() {
  const registry = readProcessRegistry();
  if (!registry) {
    console.log("Local UI test environment is not registered as running.");
    return;
  }

  console.log(`Started at: ${registry.started_at ?? "unknown"}`);
  for (const record of registry.processes ?? []) {
    console.log(`- ${record.name}: PID ${record.pid}; ${isProcessAlive(record.pid) ? "running" : "not running"}; log ${record.log_path}`);
  }
}

/**
 * Print usage information.
 *
 * @returns {void}
 */
function printUsage() {
  console.log("Usage: node tools/dev/run-ui-test-environment.mjs --start|--stop|--status");
}

const command = process.argv[2];
try {
  if (command === "--start") startEnvironment();
  else if (command === "--stop") stopEnvironment();
  else if (command === "--status") printStatus();
  else {
    printUsage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
