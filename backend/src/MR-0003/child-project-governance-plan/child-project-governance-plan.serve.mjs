#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Read-only HTTP API for generated child project governance gate plan artifacts.
 *
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0059
 * @implementsRequirement MR-0003REQ-0060
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0011
 * @macroRequirement MR-0003
 *
 * This module serves the generated child project governance gate plan artifacts
 * produced by `plan-child-project-governance-gates.mjs`. It is a read-only
 * API boundary for the next UI slice: callers can list available plan artifacts
 * and fetch one deterministic artifact by governance profile and target scope.
 * The canonical source remains the governed registry family under
 * `docs/reference/project-model/registers/child-project-governance`; JSON plan
 * artifacts remain generated evidence, not authoritative records.
 *
 * Side effects: `startChildProjectGovernancePlanServeCommand` starts a bounded
 * local HTTP listener when invoked by the CLI entrypoint. Request handling reads
 * JSON files from the configured generated-artifact directory. The module does
 * not execute governance gates, mutate child projects, write SQLite state, run
 * git operations, modify Project Model sources, or implement final dynamic RBAC.
 */

const currentFilePath = fileURLToPath(import.meta.url);
const defaultRootDir = path.resolve(path.dirname(currentFilePath), "..", "..", "..", "..");
const defaultHost = "127.0.0.1";
const defaultPort = 4176;
const defaultArtifactDir = path.join(defaultRootDir, "artifacts", "child-project-governance", "gate-plans");
const requiredCapability = "child_project_governance_plan.read";
const safeIdentifierPattern = /^[a-z0-9][a-z0-9._-]*$/u;
const jsonContentType = "application/json; charset=utf-8";
const corsHeaders = Object.freeze({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "accept, content-type, x-threat-forge-authenticated, x-threat-forge-role",
  "access-control-max-age": "300",
});
const optionNameMap = new Map([
  ["host", "host"],
  ["port", "port"],
  ["artifact-dir", "artifactDir"],
  ["artifactDir", "artifactDir"],
]);

/**
 * @typedef {{profile: string, target_scope: string, result?: string, summary?: Record<string, number>, gates_evaluated?: number, gates?: unknown[]}} GovernanceGatePlan
 * @typedef {{schema_version: number, artifact_type: string, generated_by?: string, implements_requirements?: string[], registry_directory?: string, plan: GovernanceGatePlan}} GovernanceGatePlanArtifact
 * @typedef {{artifactDir?: string, principalResolver?: (request: import("node:http").IncomingMessage) => Record<string, unknown>}} ChildProjectGovernancePlanServeAppOptions
 * @typedef {ChildProjectGovernancePlanServeAppOptions & {host?: string, port?: number, logger?: Pick<Console, "log"|"error">}} ChildProjectGovernancePlanServeCommandOptions
 */

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
    throw new Error(`Invalid child project governance plan serve port: ${value}.`);
  }
  return port;
}

/**
 * Resolves a repository-relative or absolute artifact directory.
 *
 * @param {string|undefined|null} value - Artifact directory option.
 * @returns {string} Absolute artifact directory.
 */
function normalizeArtifactDir(value) {
  const rawPath = String(value ?? defaultArtifactDir).trim() || defaultArtifactDir;
  return path.isAbsolute(rawPath) ? path.resolve(rawPath) : path.resolve(defaultRootDir, rawPath);
}

/**
 * Parses CLI/environment options for the local serve command.
 *
 * @param {string[]} [argv] - CLI arguments, excluding `node` and script path.
 * @param {Record<string, string|undefined>} [env] - Environment variables.
 * @returns {{host: string, port: number, artifactDir: string, selfTest: boolean}} Normalized serve options.
 */
export function parseChildProjectGovernancePlanServeOptions(argv = process.argv.slice(2), env = process.env) {
  /** @type {Record<string, string>} */
  const options = {
    host: env.TF_CHILD_PROJECT_GOVERNANCE_PLAN_HOST || defaultHost,
    port: env.TF_CHILD_PROJECT_GOVERNANCE_PLAN_PORT || String(defaultPort),
    artifactDir: env.TF_CHILD_PROJECT_GOVERNANCE_PLAN_ARTIFACT_DIR || defaultArtifactDir,
  };
  let selfTest = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--self-test") {
      selfTest = true;
      continue;
    }
    if (!String(token).startsWith("--")) {
      throw new Error(`Unknown child project governance plan serve argument: ${token}.`);
    }

    const [rawName, inlineValue] = String(token).slice(2).split("=", 2);
    const optionName = optionNameMap.get(rawName);
    if (!optionName) {
      throw new Error(`Unknown child project governance plan serve option: --${rawName}.`);
    }

    const value = inlineValue ?? readNextOptionValue(argv, index, rawName);
    if (inlineValue === undefined) index += 1;
    options[optionName] = value;
  }

  return Object.freeze({
    host: String(options.host || defaultHost),
    port: normalizePort(options.port),
    artifactDir: normalizeArtifactDir(options.artifactDir),
    selfTest,
  });
}

/**
 * Builds a conservative principal from request headers for bootstrap use.
 *
 * @param {import("node:http").IncomingMessage} request - HTTP request.
 * @returns {Record<string, unknown>} Principal object.
 */
export function resolveChildProjectGovernancePlanHeaderPrincipal(request) {
  const authenticated = String(request.headers["x-threat-forge-authenticated"] ?? "").toLowerCase() === "true";
  const role = String(request.headers["x-threat-forge-role"] ?? "").trim();
  return { authenticated, role: role || undefined };
}

/**
 * Builds the bootstrap access decision for read-only plan endpoints.
 *
 * @param {Record<string, unknown>} principal - Caller principal.
 * @returns {{authenticated: boolean, role?: string, allowed: boolean, required_capability: string, capabilities: string[]}} Access decision.
 */
function evaluateAccess(principal) {
  const authenticated = Boolean(principal?.authenticated);
  const role = String(principal?.role ?? "");
  const capabilities = authenticated && role === "registered_user" ? [requiredCapability] : [];
  return {
    authenticated,
    role: role || undefined,
    allowed: capabilities.includes(requiredCapability),
    required_capability: requiredCapability,
    capabilities,
  };
}

/**
 * Writes a JSON response.
 *
 * @param {import("node:http").ServerResponse} response - HTTP response.
 * @param {number} statusCode - HTTP status code.
 * @param {Record<string, unknown>} payload - JSON payload.
 * @returns {void}
 */
function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    ...corsHeaders,
    "content-type": jsonContentType,
    "cache-control": "no-store",
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

/**
 * Writes a browser CORS preflight response for read-only local preview.
 *
 * @param {import("node:http").ServerResponse} response - HTTP response.
 * @returns {void}
 */
function writePreflight(response) {
  response.writeHead(204, corsHeaders);
  response.end();
}

/**
 * Returns true for supported read-only route pathnames.
 *
 * @param {string} pathname - Request pathname.
 * @returns {boolean} True when the path belongs to this API surface.
 */
function isKnownPath(pathname) {
  return pathname === "/api/child-project-governance/gate-plans" || pathname.startsWith("/api/child-project-governance/gate-plans/");
}

/**
 * Validates a route identifier segment.
 *
 * @param {string} value - Decoded route segment.
 * @param {string} label - Segment label.
 * @returns {string} Valid route segment.
 */
function requireSafeIdentifier(value, label) {
  if (!safeIdentifierPattern.test(value)) {
    throw Object.assign(new Error(`Invalid ${label}: ${value}.`), { statusCode: 400, code: "invalid_request" });
  }
  return value;
}

/**
 * Builds an artifact file name from safe profile and target-scope ids.
 *
 * @param {string} profile - Governance profile id.
 * @param {string} targetScope - Target scope id.
 * @returns {string} Stable artifact file name.
 */
function buildArtifactFileName(profile, targetScope) {
  return `${requireSafeIdentifier(profile, "profile")}.${requireSafeIdentifier(targetScope, "target_scope")}.plan.json`;
}

/**
 * Reads one JSON artifact file and checks the minimum envelope shape.
 *
 * @param {string} artifactPath - Absolute artifact path.
 * @returns {GovernanceGatePlanArtifact} Parsed artifact.
 */
function readPlanArtifact(artifactPath) {
  const parsed = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  if (parsed?.artifact_type !== "child_project_governance_gate_plan") {
    throw new Error(`Unsupported gate plan artifact type in ${normalizeProjectPath(path.relative(defaultRootDir, artifactPath))}.`);
  }
  if (!parsed.plan || typeof parsed.plan !== "object") {
    throw new Error(`Gate plan artifact is missing plan object: ${normalizeProjectPath(path.relative(defaultRootDir, artifactPath))}.`);
  }
  if (!parsed.plan.profile || !parsed.plan.target_scope) {
    throw new Error(`Gate plan artifact is missing profile or target_scope: ${normalizeProjectPath(path.relative(defaultRootDir, artifactPath))}.`);
  }
  return /** @type {GovernanceGatePlanArtifact} */ (parsed);
}

/**
 * Lists available plan artifact file paths.
 *
 * @param {string} artifactDir - Artifact directory.
 * @returns {string[]} Sorted absolute artifact paths.
 */
function listArtifactPaths(artifactDir) {
  if (!fs.existsSync(artifactDir)) return [];
  return fs.readdirSync(artifactDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".plan.json"))
    .map((entry) => path.join(artifactDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Builds a compact list item from a plan artifact.
 *
 * @param {GovernanceGatePlanArtifact} artifact - Gate plan artifact.
 * @param {string} artifactPath - Absolute artifact path.
 * @returns {Record<string, unknown>} UI-safe summary item.
 */
function summarizeArtifact(artifact, artifactPath) {
  return {
    profile: artifact.plan.profile,
    target_scope: artifact.plan.target_scope,
    result: artifact.plan.result ?? "unknown",
    gates_evaluated: artifact.plan.gates_evaluated ?? 0,
    summary: artifact.plan.summary ?? {},
    artifact_path: normalizeProjectPath(path.relative(defaultRootDir, artifactPath)),
  };
}

/**
 * Lists gate plan artifacts as a UI-safe read model.
 *
 * @param {string} artifactDir - Artifact directory.
 * @returns {{artifact_directory: string, items: Record<string, unknown>[]}} List payload.
 */
function listGatePlans(artifactDir) {
  const items = listArtifactPaths(artifactDir).map((artifactPath) => summarizeArtifact(readPlanArtifact(artifactPath), artifactPath));
  return {
    artifact_directory: normalizeProjectPath(path.relative(defaultRootDir, artifactDir)),
    items,
  };
}

/**
 * Loads one gate plan artifact by profile and target scope.
 *
 * @param {string} artifactDir - Artifact directory.
 * @param {string} profile - Governance profile id.
 * @param {string} targetScope - Target scope id.
 * @returns {{artifact_path: string, artifact: GovernanceGatePlanArtifact}} Detail payload.
 */
function getGatePlan(artifactDir, profile, targetScope) {
  const artifactPath = path.join(artifactDir, buildArtifactFileName(profile, targetScope));
  if (!fs.existsSync(artifactPath)) {
    throw Object.assign(new Error(`Gate plan artifact not found: ${profile}/${targetScope}.`), { statusCode: 404, code: "not_found" });
  }
  return {
    artifact_path: normalizeProjectPath(path.relative(defaultRootDir, artifactPath)),
    artifact: readPlanArtifact(artifactPath),
  };
}

/**
 * Creates a native Node.js HTTP request handler for gate plan artifacts.
 *
 * @param {ChildProjectGovernancePlanServeAppOptions} [options] - Handler options.
 * @returns {(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) => Promise<void>} HTTP handler.
 */
export function createChildProjectGovernancePlanHttpHandler(options = {}) {
  const artifactDir = normalizeArtifactDir(options.artifactDir);
  const principalResolver = options.principalResolver ?? resolveChildProjectGovernancePlanHeaderPrincipal;

  return async function childProjectGovernancePlanHttpHandler(request, response) {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const method = String(request.method ?? "GET").toUpperCase();
    const pathname = requestUrl.pathname;

    if (method === "OPTIONS" && isKnownPath(pathname)) {
      writePreflight(response);
      return;
    }

    if (method !== "GET" && isKnownPath(pathname)) {
      writeJson(response, 405, { error: "method_not_allowed", message: "Child project governance plan API is read-only." });
      return;
    }

    if (!isKnownPath(pathname)) {
      writeJson(response, 404, { error: "not_found", message: `Route not found: ${method} ${pathname}` });
      return;
    }

    try {
      const principal = principalResolver(request);
      const access = evaluateAccess(principal);
      if (!access.allowed) {
        writeJson(response, 403, { error: "access_denied", message: "Current principal cannot read child project governance plans.", access });
        return;
      }

      if (pathname === "/api/child-project-governance/gate-plans") {
        writeJson(response, 200, { access, ...listGatePlans(artifactDir) });
        return;
      }

      const match = /^\/api\/child-project-governance\/gate-plans\/([^/]+)\/([^/]+)$/u.exec(pathname);
      if (!match) {
        writeJson(response, 404, { error: "not_found", message: `Route not found: ${method} ${pathname}` });
        return;
      }

      const profile = decodeURIComponent(match[1]);
      const targetScope = decodeURIComponent(match[2]);
      writeJson(response, 200, { access, ...getGatePlan(artifactDir, profile, targetScope) });
    } catch (error) {
      const statusCode = Number(error?.statusCode ?? 500);
      const code = String(error?.code ?? "internal_error");
      const message = statusCode >= 500 ? "Child project governance plan request failed." : String(error?.message ?? "Request failed.");
      writeJson(response, statusCode, { error: code, message });
    }
  };
}

/**
 * Builds the read-only Child Project Governance Plan serve app without listening.
 *
 * @param {ChildProjectGovernancePlanServeAppOptions} [options] - Composition options.
 * @returns {{server: import("node:http").Server, options: {artifactDir: string}}} Serve app.
 */
export function createChildProjectGovernancePlanServeApp(options = {}) {
  const artifactDir = normalizeArtifactDir(options.artifactDir);
  const server = http.createServer(createChildProjectGovernancePlanHttpHandler({
    artifactDir,
    principalResolver: options.principalResolver,
  }));

  return Object.freeze({
    server,
    options: Object.freeze({ artifactDir }),
  });
}

/**
 * Starts the local read-only Child Project Governance Plan HTTP server.
 *
 * @param {ChildProjectGovernancePlanServeCommandOptions} [options] - Serve options.
 * @returns {Promise<{server: import("node:http").Server, url: string, artifactDir: string}>} Started server handle.
 */
export async function startChildProjectGovernancePlanServeCommand(options = {}) {
  const host = String(options.host || defaultHost);
  const port = normalizePort(options.port ?? defaultPort);
  const artifactDir = normalizeArtifactDir(options.artifactDir);
  const logger = options.logger ?? console;
  const app = createChildProjectGovernancePlanServeApp({
    artifactDir,
    principalResolver: options.principalResolver,
  });

  await new Promise((resolve, reject) => {
    app.server.once("error", reject);
    app.server.listen(port, host, resolve);
  });

  const address = app.server.address();
  const resolvedPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${host}:${resolvedPort}`;
  logger.log(`Child Project Governance Plan read-only API listening on ${url}`);
  logger.log("Use x-threat-forge-authenticated: true and x-threat-forge-role: registered_user headers for bootstrap access.");
  logger.log(`Artifact directory: ${normalizeProjectPath(path.relative(defaultRootDir, artifactDir))}`);

  return Object.freeze({ server: app.server, url, artifactDir });
}

/**
 * Performs a JSON request for serve self-tests.
 *
 * @param {string} url - Absolute URL.
 * @param {{method?: string, authenticated?: boolean}} [options] - Request options.
 * @returns {Promise<{statusCode: number, payload: Record<string, unknown>}>} Status and parsed payload.
 */
function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const request = http.request({
      hostname: requestUrl.hostname,
      port: requestUrl.port,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        "x-threat-forge-authenticated": String(options.authenticated ?? true),
        "x-threat-forge-role": "registered_user",
      },
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve({ statusCode: response.statusCode ?? 0, payload: body ? JSON.parse(body) : {} });
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
 * Writes deterministic self-test gate plan artifacts.
 *
 * @param {string} artifactDir - Temporary artifact directory.
 * @returns {void}
 */
function writeSelfTestArtifacts(artifactDir) {
  fs.mkdirSync(artifactDir, { recursive: true });
  const artifacts = [
    {
      schema_version: 1,
      artifact_type: "child_project_governance_gate_plan",
      generated_by: "self-test",
      implements_requirements: ["MR-0003REQ-0059", "MR-0003REQ-0060"],
      registry_directory: "docs/reference/project-model/registers/child-project-governance",
      plan: {
        profile: "platform_self_governance",
        target_scope: "platform_self",
        result: "pass",
        summary: { planned: 1, pass: 0, fail: 0, warning: 0, not_applicable: 0, unsupported: 0 },
        gates_evaluated: 1,
        capability_states: { child_project_management: "declared" },
        gates: [{ id: "child_governance_gate_plan_artifacts", status: "planned", evidence: ["self-test artifact"] }],
      },
    },
    {
      schema_version: 1,
      artifact_type: "child_project_governance_gate_plan",
      generated_by: "self-test",
      implements_requirements: ["MR-0003REQ-0059", "MR-0003REQ-0060"],
      registry_directory: "docs/reference/project-model/registers/child-project-governance",
      plan: {
        profile: "demo_child_project_governance",
        target_scope: "demo_child_project",
        result: "pass",
        summary: { planned: 1, pass: 0, fail: 0, warning: 0, not_applicable: 0, unsupported: 0 },
        gates_evaluated: 1,
        capability_states: { project_model: "declared" },
        gates: [{ id: "child_project_demo_workspace_reset", status: "planned", evidence: ["self-test artifact"] }],
      },
    },
  ];

  for (const artifact of artifacts) {
    const fileName = buildArtifactFileName(artifact.plan.profile, artifact.plan.target_scope);
    fs.writeFileSync(path.join(artifactDir, fileName), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  }
}

/**
 * Runs a bounded local HTTP smoke test without touching default artifacts.
 *
 * @param {Pick<Console, "log"|"error">} [logger] - Logger.
 * @returns {Promise<void>} Completion promise.
 */
export async function runChildProjectGovernancePlanServeSelfTest(logger = console) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tf-child-project-governance-plan-serve-"));
  const artifactDir = path.join(tempRoot, "gate-plans");
  const app = createChildProjectGovernancePlanServeApp({ artifactDir });
  try {
    writeSelfTestArtifacts(artifactDir);
    await new Promise((resolve, reject) => {
      app.server.once("error", reject);
      app.server.listen(0, defaultHost, resolve);
    });

    const address = app.server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : 0;
    const baseUrl = `http://${defaultHost}:${resolvedPort}`;
    const listResponse = await requestJson(`${baseUrl}/api/child-project-governance/gate-plans`);
    const detailResponse = await requestJson(`${baseUrl}/api/child-project-governance/gate-plans/platform_self_governance/platform_self`);
    const forbiddenResponse = await requestJson(`${baseUrl}/api/child-project-governance/gate-plans`, { authenticated: false });
    const writeResponse = await requestJson(`${baseUrl}/api/child-project-governance/gate-plans`, { method: "POST" });

    if (listResponse.statusCode !== 200 || !Array.isArray(listResponse.payload.items) || listResponse.payload.items.length !== 2) {
      throw new Error("Serve self-test expected two listed gate plan artifacts.");
    }
    if (detailResponse.statusCode !== 200 || detailResponse.payload?.artifact?.plan?.profile !== "platform_self_governance") {
      throw new Error("Serve self-test expected platform_self_governance detail artifact.");
    }
    if (forbiddenResponse.statusCode !== 403) {
      throw new Error("Serve self-test expected unauthenticated requests to be forbidden.");
    }
    if (writeResponse.statusCode !== 405) {
      throw new Error("Serve self-test expected non-GET requests to be rejected as read-only.");
    }

    logger.log("Child Project Governance Plan API serve self-test passed.");
    logger.log(`Artifact directory: ${normalizeProjectPath(path.relative(defaultRootDir, artifactDir))}`);
    logger.log("Endpoint: GET /api/child-project-governance/gate-plans");
    logger.log("Endpoint: GET /api/child-project-governance/gate-plans/platform_self_governance/platform_self");
    logger.log("Implemented requirement: MR-0003REQ-0014");
    logger.log("Implemented requirement: MR-0003REQ-0015");
    logger.log("Implemented requirement: MR-0003REQ-0059");
    logger.log("Implemented requirement: MR-0003REQ-0060");
  } finally {
    await new Promise((resolve) => app.server.close(resolve));
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
export function isChildProjectGovernancePlanServeCliEntrypoint(moduleUrl = import.meta.url, entrypointPath = process.argv[1]) {
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
export async function runChildProjectGovernancePlanServeCli(argv = process.argv.slice(2), env = process.env, logger = console) {
  try {
    const options = parseChildProjectGovernancePlanServeOptions(argv, env);
    if (options.selfTest) {
      await runChildProjectGovernancePlanServeSelfTest(logger);
      return;
    }
    await startChildProjectGovernancePlanServeCommand({ ...options, logger });
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (isChildProjectGovernancePlanServeCliEntrypoint()) {
  await runChildProjectGovernancePlanServeCli();
}
