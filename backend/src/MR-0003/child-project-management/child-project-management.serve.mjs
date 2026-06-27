#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createChildProjectManagementHttpServer } from "./child-project-management.http-server.mjs";
import { createChildProjectManagementModule } from "./child-project-management.module.mjs";

/**
 * @file Process-level composition root and local serve command for child project management API.
 *
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * This module provides the executable local entrypoint for the read-only Child
 * Project Management API. It assembles the feature module through the existing
 * composition root, points the SQLite adapter at the configured operational
 * state database, passes the composed controller and route descriptors into the
 * native HTTP transport, and starts listening only from the CLI boundary.
 *
 * Side effects: `startChildProjectManagementServeCommand` starts a local HTTP
 * listener when invoked by the CLI entrypoint and may open/create the configured
 * SQLite database through the adapter boundary. Importing this module and
 * constructing the serve app do not call `listen`, mutate child project
 * workspaces, reset demo state, run validators, perform Git operations,
 * introduce write endpoints, or implement dynamic RBAC persistence.
 */

/**
 * @typedef {import("./ports/child-project-store.port.mjs").ChildProjectStorePort} ChildProjectStorePort
 * @typedef {{evaluate(input: {principal?: Record<string, unknown>, requiredCapability: string}): Record<string, unknown>}} ChildProjectManagementAccessPolicy
 * @typedef {(request: import("node:http").IncomingMessage) => Record<string, unknown>} PrincipalResolver
 * @typedef {{databasePath?: string, storePort?: ChildProjectStorePort, accessPolicy?: ChildProjectManagementAccessPolicy, principalResolver?: PrincipalResolver}} ChildProjectManagementServeAppOptions
 * @typedef {ChildProjectManagementServeAppOptions & {host?: string, port?: number, logger?: Pick<Console, "log"|"error">}} ChildProjectManagementServeCommandOptions
 */

const currentFilePath = fileURLToPath(import.meta.url);
const defaultRootDir = path.resolve(path.dirname(currentFilePath), "..", "..", "..", "..");
const defaultHost = "127.0.0.1";
const defaultPort = 4175;
const defaultDatabasePath = path.join(defaultRootDir, ".threat-forge", "state", "child-project-management.sqlite");
const optionNameMap = new Map([
  ["host", "host"],
  ["port", "port"],
  ["database", "databasePath"],
  ["database-path", "databasePath"],
  ["databasePath", "databasePath"],
]);

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
 * Reads the value that follows a CLI option token.
 *
 * @param {string[]} argv - CLI argument tokens.
 * @param {number} index - Current option index.
 * @param {string} optionName - Human-readable option name for diagnostics.
 * @returns {string} Option value.
 */
function readNextOptionValue(argv, index, optionName) {
  const value = argv[index + 1];
  if (value === undefined || String(value).startsWith("--")) {
    throw new Error(`Missing value for --${optionName}.`);
  }
  return value;
}

/**
 * Normalizes the local server port.
 *
 * @param {string|number|undefined|null} value - Port-like value.
 * @returns {number} Valid TCP port number; `0` requests an ephemeral local port.
 */
function normalizePort(value) {
  const port = Number.parseInt(String(value ?? defaultPort), 10);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Invalid Child Project Management serve port: ${value}.`);
  }
  return port;
}

/**
 * Normalizes the configured SQLite database path.
 *
 * @param {string|undefined|null} value - Database path option.
 * @returns {string} Absolute database path.
 */
function normalizeDatabasePath(value) {
  const rawPath = String(value ?? defaultDatabasePath).trim() || defaultDatabasePath;
  return path.resolve(defaultRootDir, rawPath);
}

/**
 * Parses CLI/environment options for the local serve command.
 *
 * @param {string[]} [argv] - CLI arguments, excluding `node` and script path.
 * @param {Record<string, string|undefined>} [env] - Environment variables.
 * @returns {{host: string, port: number, databasePath: string, selfTest: boolean}} Normalized serve options.
 */
export function parseChildProjectManagementServeOptions(argv = process.argv.slice(2), env = process.env) {
  /** @type {Record<string, string>} */
  const options = {
    host: env.TF_CHILD_PROJECT_MANAGEMENT_HOST || defaultHost,
    port: env.TF_CHILD_PROJECT_MANAGEMENT_PORT || String(defaultPort),
    databasePath: env.TF_CHILD_PROJECT_MANAGEMENT_DATABASE || defaultDatabasePath,
  };
  let selfTest = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--self-test") {
      selfTest = true;
      continue;
    }
    if (!String(token).startsWith("--")) {
      throw new Error(`Unknown Child Project Management serve argument: ${token}.`);
    }

    const [rawName, inlineValue] = String(token).slice(2).split("=", 2);
    const optionName = optionNameMap.get(rawName);
    if (!optionName) {
      throw new Error(`Unknown Child Project Management serve option: --${rawName}.`);
    }

    const value = inlineValue ?? readNextOptionValue(argv, index, rawName);
    if (inlineValue === undefined) index += 1;
    options[optionName] = value;
  }

  return Object.freeze({
    host: String(options.host || defaultHost),
    port: normalizePort(options.port),
    databasePath: normalizeDatabasePath(options.databasePath),
    selfTest,
  });
}

/**
 * Builds the read-only Child Project Management serve app without listening.
 *
 * @param {ChildProjectManagementServeAppOptions} [options] - Composition options.
 * @returns {{module: Record<string, unknown>, server: import("node:http").Server, options: Record<string, unknown>}} Serve app.
 */
export function createChildProjectManagementServeApp(options = {}) {
  const module = createChildProjectManagementModule({
    databasePath: options.databasePath,
    storePort: options.storePort,
    accessPolicy: options.accessPolicy,
  });
  const server = createChildProjectManagementHttpServer({
    controller: module.controller,
    routes: module.routes,
    principalResolver: options.principalResolver,
  });

  return Object.freeze({
    module,
    server,
    options: Object.freeze({
      databasePath: path.resolve(String(options.databasePath ?? defaultDatabasePath)),
    }),
  });
}

/**
 * Starts the local Child Project Management read-only HTTP server.
 *
 * @param {ChildProjectManagementServeCommandOptions} [options] - Serve options.
 * @returns {Promise<{server: import("node:http").Server, url: string, databasePath: string}>} Started server handle.
 */
export async function startChildProjectManagementServeCommand(options = {}) {
  const host = String(options.host || defaultHost);
  const port = normalizePort(options.port ?? defaultPort);
  const databasePath = normalizeDatabasePath(options.databasePath);
  const logger = options.logger ?? console;
  const app = createChildProjectManagementServeApp({
    databasePath,
    storePort: options.storePort,
    accessPolicy: options.accessPolicy,
    principalResolver: options.principalResolver,
  });

  await new Promise((resolve, reject) => {
    app.server.once("error", reject);
    app.server.listen(port, host, resolve);
  });

  const address = app.server.address();
  const resolvedPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${host}:${resolvedPort}`;
  logger.log(`Child Project Management read-only API listening on ${url}`);
  logger.log("Use x-threat-forge-authenticated: true and x-threat-forge-role: registered_user headers for bootstrap access.");
  logger.log(`Database: ${normalizeProjectPath(path.relative(defaultRootDir, databasePath))}`);

  return Object.freeze({ server: app.server, url, databasePath });
}

/**
 * Performs an authenticated JSON GET request for serve self-tests.
 *
 * @param {string} url - Absolute URL.
 * @returns {Promise<Record<string, unknown>>} Parsed JSON payload.
 */
function requestJson(url) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const request = http.request({
      hostname: requestUrl.hostname,
      port: requestUrl.port,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      method: "GET",
      headers: {
        accept: "application/json",
        "x-threat-forge-authenticated": "true",
        "x-threat-forge-role": "registered_user",
      },
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode !== 200) {
          reject(new Error(`Expected HTTP 200 from ${url}, got ${response.statusCode}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
    request.end();
  });
}

/**
 * Registers deterministic child-project state for the serve self-test.
 *
 * @param {Record<string, unknown>} service - Composed child-project management service.
 * @returns {Promise<void>} Completion promise.
 */
async function seedSelfTestState(service) {
  await service.registerChildProject({
    childProject: {
      id: "demo-child-project",
      name: "Demo Child Project",
      repository: {
        kind: "local",
        url: null,
        local_path: ".threat-forge/workspaces/demo-child-project",
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
      created_at: "2026-06-27T00:00:00.000Z",
      updated_at: "2026-06-27T00:00:00.000Z",
    },
  });
  await service.recordCheckRun({
    checkRun: {
      id: "demo-child-project-self-test-run",
      child_project_id: "demo-child-project",
      checked_at: "2026-06-27T00:00:00.000Z",
      repository_head: null,
      branch: "master",
      overall_status: "pass",
      gate_results: [
        { gate_name: "child-project-standard-project-model", status: "pass", summary: "Demo Project Model skeleton is valid." },
      ],
      violations: [],
    },
  });
}

/**
 * Runs a bounded local HTTP smoke test without touching default state.
 *
 * @param {Pick<Console, "log"|"error">} [logger] - Logger.
 * @returns {Promise<void>} Completion promise.
 */
export async function runChildProjectManagementServeSelfTest(logger = console) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tf-child-project-management-serve-"));
  const databasePath = path.join(tempRoot, "child-project-management.sqlite");
  const app = createChildProjectManagementServeApp({ databasePath });
  try {
    await seedSelfTestState(app.module.service);
    await new Promise((resolve, reject) => {
      app.server.once("error", reject);
      app.server.listen(0, defaultHost, resolve);
    });

    const address = app.server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : 0;
    const baseUrl = `http://${defaultHost}:${resolvedPort}`;
    const listPayload = await requestJson(`${baseUrl}/api/child-projects`);
    const detailPayload = await requestJson(`${baseUrl}/api/child-projects/demo-child-project`);

    const listedItem = Array.isArray(listPayload.items)
      ? listPayload.items.find((item) => item?.child_project?.id === "demo-child-project")
      : null;
    if (!listedItem) {
      throw new Error("Serve self-test did not return demo-child-project from list endpoint.");
    }
    if (detailPayload?.child_project?.id !== "demo-child-project") {
      throw new Error("Serve self-test did not return demo-child-project from detail endpoint.");
    }
    if (detailPayload?.latest_check_run?.overall_status !== "pass") {
      throw new Error("Serve self-test expected demo-child-project latest status pass.");
    }

    logger.log("Child Project Management API serve self-test passed.");
    logger.log(`Database: ${normalizeProjectPath(path.relative(defaultRootDir, databasePath))}`);
    logger.log("Endpoint: GET /api/child-projects");
    logger.log("Endpoint: GET /api/child-projects/demo-child-project");
    logger.log("Implemented requirement: MR-0003REQ-0014");
    logger.log("Implemented requirement: MR-0003REQ-0015");
    logger.log("Implemented requirement: MR-0003REQ-0025");
    logger.log("Implemented requirement: MR-0003REQ-0026");
  } finally {
    await new Promise((resolve) => app.server.close(resolve));
    if (app.module.storePort && typeof app.module.storePort.close === "function") {
      app.module.storePort.close();
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

/**
 * Determines whether this module is being executed as the CLI entrypoint.
 *
 * @param {string} [moduleUrl] - Current module URL.
 * @param {string|undefined} [entrypointPath] - Process entrypoint path.
 * @returns {boolean} True when this module is the process entrypoint.
 */
export function isChildProjectManagementServeCliEntrypoint(moduleUrl = import.meta.url, entrypointPath = process.argv[1]) {
  if (!entrypointPath) return false;

  try {
    return path.normalize(fileURLToPath(moduleUrl)) === path.normalize(path.resolve(entrypointPath));
  } catch {
    return false;
  }
}

/**
 * Runs the local serve command or bounded self-test and maps failures to process exit.
 *
 * @param {string[]} [argv] - CLI arguments, excluding `node` and script path.
 * @param {Record<string, string|undefined>} [env] - Environment variables.
 * @param {Pick<Console, "log"|"error">} [logger] - Logger.
 * @returns {Promise<void>} Completion promise.
 */
export async function runChildProjectManagementServeCli(argv = process.argv.slice(2), env = process.env, logger = console) {
  try {
    const options = parseChildProjectManagementServeOptions(argv, env);
    if (options.selfTest) {
      await runChildProjectManagementServeSelfTest(logger);
      return;
    }
    await startChildProjectManagementServeCommand({ ...options, logger });
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (isChildProjectManagementServeCliEntrypoint()) {
  await runChildProjectManagementServeCli();
}
