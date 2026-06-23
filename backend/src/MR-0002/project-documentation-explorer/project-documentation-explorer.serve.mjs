import path from "node:path";
import { fileURLToPath } from "node:url";

import { createProjectDocumentationExplorerHttpServer } from "./project-documentation-explorer.http-server.mjs";
import { createProjectDocumentationExplorerModule } from "./project-documentation-explorer.module.mjs";

/**
 * @file Process-level composition root and local serve command for the Project Documentation Explorer API.
 *
 * @implementsRequirement MR-0002REQ-0047
 * @derivedFromDecision MR-0002/ADR-0014
 * @macroRequirement MR-0002
 *
 * This module provides the executable local entrypoint for the read-only Project
 * Documentation Explorer HTTP API. It assembles the feature module through the
 * existing composition root, passes the composed controller and route
 * descriptors into the native HTTP transport, and starts listening only from the
 * CLI boundary.
 *
 * Side effects: `startProjectDocumentationExplorerServeCommand` starts a local
 * HTTP listener when invoked by the CLI entrypoint. Importing this module and
 * constructing the serve app do not call `listen`, mutate governed sources,
 * perform Git operations, introduce write endpoints, implement dynamic RBAC, or
 * move the frontend from snapshot consumption to live HTTP consumption.
 */

const currentFilePath = fileURLToPath(import.meta.url);
const defaultRootDir = path.resolve(path.dirname(currentFilePath), "..", "..", "..", "..");
const defaultHost = "127.0.0.1";
const defaultPort = 4174;
const optionNameMap = new Map([
  ["host", "host"],
  ["port", "port"],
  ["rootDir", "rootDir"],
  ["root-dir", "rootDir"],
]);

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
    throw new Error(`Invalid Project Documentation Explorer serve port: ${value}.`);
  }
  return port;
}

/**
 * Parses CLI/environment options for the local serve command.
 *
 * @param {string[]} [argv] - CLI arguments, excluding `node` and script path.
 * @param {Record<string, string|undefined>} [env] - Environment variables.
 * @returns {{host: string, port: number, rootDir: string}} Normalized serve options.
 */
export function parseProjectDocumentationExplorerServeOptions(argv = process.argv.slice(2), env = process.env) {
  const options = {
    host: env.TF_PROJECT_DOCUMENTATION_EXPLORER_HOST || defaultHost,
    port: env.TF_PROJECT_DOCUMENTATION_EXPLORER_PORT || String(defaultPort),
    rootDir: env.TF_PROJECT_DOCUMENTATION_EXPLORER_ROOT || defaultRootDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!String(token).startsWith("--")) {
      throw new Error(`Unknown Project Documentation Explorer serve argument: ${token}.`);
    }

    const [rawName, inlineValue] = String(token).slice(2).split("=", 2);
    const optionName = optionNameMap.get(rawName);
    if (!optionName) {
      throw new Error(`Unknown Project Documentation Explorer serve option: --${rawName}.`);
    }

    const value = inlineValue ?? readNextOptionValue(argv, index, rawName);
    if (inlineValue === undefined) index += 1;
    options[optionName] = value;
  }

  return Object.freeze({
    host: String(options.host || defaultHost),
    port: normalizePort(options.port),
    rootDir: path.resolve(String(options.rootDir || defaultRootDir)),
  });
}

/**
 * Builds the read-only Project Documentation Explorer serve app without listening.
 *
 * @param {{rootDir?: string, sourcePort?: Record<string, Function>, accessPolicy?: Record<string, Function>, principalResolver?: Function}} [options] - Composition options.
 * @returns {{module: Record<string, unknown>, server: import("node:http").Server, options: Record<string, unknown>}} Serve app.
 */
export function createProjectDocumentationExplorerServeApp(options = {}) {
  const module = createProjectDocumentationExplorerModule({
    rootDir: options.rootDir,
    sourcePort: options.sourcePort,
    accessPolicy: options.accessPolicy,
  });
  const server = createProjectDocumentationExplorerHttpServer({
    controller: module.controller,
    routes: module.routes,
    principalResolver: options.principalResolver,
  });

  return Object.freeze({
    module,
    server,
    options: Object.freeze({ rootDir: options.rootDir }),
  });
}

/**
 * Starts the local Project Documentation Explorer read-only HTTP server.
 *
 * @param {{host?: string, port?: number, rootDir?: string, sourcePort?: Record<string, Function>, accessPolicy?: Record<string, Function>, principalResolver?: Function, logger?: Pick<Console, "log"|"error">}} [options] - Serve options.
 * @returns {Promise<{server: import("node:http").Server, url: string}>} Started server handle.
 */
export async function startProjectDocumentationExplorerServeCommand(options = {}) {
  const host = String(options.host || defaultHost);
  const port = normalizePort(options.port ?? defaultPort);
  const rootDir = path.resolve(String(options.rootDir || defaultRootDir));
  const logger = options.logger ?? console;
  const app = createProjectDocumentationExplorerServeApp({
    rootDir,
    sourcePort: options.sourcePort,
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
  logger.log(`Project Documentation Explorer read-only API listening on ${url}`);
  logger.log("Use x-threat-forge-authenticated: true and x-threat-forge-role: registered_user headers for bootstrap access.");

  return Object.freeze({ server: app.server, url });
}


/**
 * Determines whether this module is being executed as the CLI entrypoint.
 *
 * @param {string} [moduleUrl] - Current module URL.
 * @param {string|undefined} [entrypointPath] - Process entrypoint path.
 * @returns {boolean} True when this module is the process entrypoint.
 */
export function isProjectDocumentationExplorerServeCliEntrypoint(moduleUrl = import.meta.url, entrypointPath = process.argv[1]) {
  if (!entrypointPath) return false;

  try {
    return path.normalize(fileURLToPath(moduleUrl)) === path.normalize(path.resolve(entrypointPath));
  } catch {
    return false;
  }
}

/**
 * Runs the local serve command and maps startup failures to process exit.
 *
 * @param {string[]} [argv] - CLI arguments, excluding `node` and script path.
 * @param {Record<string, string|undefined>} [env] - Environment variables.
 * @param {Pick<Console, "log"|"error">} [logger] - Logger.
 * @returns {Promise<void>} Completion promise.
 */
export async function runProjectDocumentationExplorerServeCli(argv = process.argv.slice(2), env = process.env, logger = console) {
  try {
    const options = parseProjectDocumentationExplorerServeOptions(argv, env);
    await startProjectDocumentationExplorerServeCommand({ ...options, logger });
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (isProjectDocumentationExplorerServeCliEntrypoint()) {
  await runProjectDocumentationExplorerServeCli();
}
