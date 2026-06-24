import { createServer } from "node:http";

/**
 * @file Native Node.js HTTP transport for the Project Documentation Explorer read-only API.
 *
 * @implementsRequirement MR-0002REQ-0046
 * @implementsRequirement MR-0002REQ-0049
 * @derivedFromDecision MR-0002/ADR-0013
 * @derivedFromDecision MR-0002/ADR-0016
 * @macroRequirement MR-0002
 *
 * This module maps native Node.js HTTP requests to the already-composed
 * Project Documentation Explorer controller and route descriptors. It preserves
 * the Controller → Service → Port → Adapter boundary by receiving controller,
 * routes and principal resolution as dependencies; it never instantiates
 * filesystem, YAML, Markdown, graph, registry or Git adapters directly.
 *
 * Side effects: creates an in-memory request handler and, when requested, a
 * native Node.js HTTP server object. It does not call `listen`, mutate governed
 * project-model sources, persist data, perform Git operations, implement dynamic
 * RBAC, or introduce Base Analysis runtime behavior.
 */

const jsonContentType = "application/json; charset=utf-8";
const corsHeaders = Object.freeze({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "accept, content-type, x-threat-forge-authenticated, x-threat-forge-role",
  "access-control-max-age": "300",
});
const knownQueryKeys = new Set([
  "mr",
  "kind",
  "type",
  "status",
  "requirement_type",
  "implementation_state",
  "acceptance_state",
  "q",
]);

/**
 * Builds a conservative principal from request headers for bootstrap use.
 *
 * @param {import("node:http").IncomingMessage} request - HTTP request.
 * @returns {Record<string, unknown>} Principal object.
 */
export function resolveHeaderPrincipal(request) {
  const authenticated = String(request.headers["x-threat-forge-authenticated"] ?? "").toLowerCase() === "true";
  const role = String(request.headers["x-threat-forge-role"] ?? "").trim();
  return {
    authenticated,
    role: role || undefined,
  };
}

/**
 * Converts URL search parameters to the controller query shape.
 *
 * @param {URLSearchParams} searchParams - Request search parameters.
 * @returns {Record<string, string|string[]>} Controller query object.
 */
export function extractDocumentationQuery(searchParams) {
  const query = {};
  for (const key of knownQueryKeys) {
    const values = searchParams.getAll(key).filter((value) => String(value ?? "").trim());
    if (values.length === 1) query[key] = values[0];
    if (values.length > 1) query[key] = values;
  }
  return query;
}

/**
 * Escapes a string for safe use inside a regular expression.
 *
 * @param {string} value - Text to escape.
 * @returns {string} Escaped regular expression fragment.
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Compiles a route descriptor path into a matcher.
 *
 * @param {Record<string, unknown>} route - Route descriptor.
 * @returns {{route: Record<string, unknown>, regex: RegExp, parameterNames: string[]}} Compiled matcher.
 */
function compileRoute(route) {
  const parameterNames = [];
  const pattern = String(route.path ?? "")
    .split("/")
    .map((part) => {
      if (part.startsWith(":")) {
        parameterNames.push(part.slice(1));
        return "([^/]+)";
      }
      return escapeRegex(part);
    })
    .join("/");

  return {
    route,
    regex: new RegExp(`^${pattern}$`, "u"),
    parameterNames,
  };
}

/**
 * Matches a request against route descriptors.
 *
 * @param {Array<Record<string, unknown>>} compiledRoutes - Compiled route descriptors.
 * @param {string} method - Request method.
 * @param {string} pathname - Request pathname.
 * @returns {{route: Record<string, unknown>, params: Record<string, string>}|null} Match result.
 */
function matchRoute(compiledRoutes, method, pathname) {
  for (const candidate of compiledRoutes) {
    const match = candidate.regex.exec(pathname);
    if (!match) continue;
    if (String(candidate.route.method ?? "").toUpperCase() !== method.toUpperCase()) return null;

    const params = {};
    candidate.parameterNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1]);
    });
    return { route: candidate.route, params };
  }
  return null;
}

/**
 * Checks whether a path is known with a different HTTP method.
 *
 * @param {Array<Record<string, unknown>>} compiledRoutes - Compiled route descriptors.
 * @param {string} pathname - Request pathname.
 * @returns {boolean} True when the path is known.
 */
function hasKnownPath(compiledRoutes, pathname) {
  return compiledRoutes.some((candidate) => candidate.regex.test(pathname));
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
 * Maps internal errors to stable HTTP error payloads.
 *
 * @param {unknown} error - Error raised by controller/service code.
 * @returns {{statusCode: number, payload: Record<string, string>}} HTTP error result.
 */
function mapError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  if (/access denied/iu.test(message)) {
    return { statusCode: 403, payload: { error: "forbidden", message } };
  }
  if (/not found/iu.test(message)) {
    return { statusCode: 404, payload: { error: "not_found", message } };
  }
  return { statusCode: 500, payload: { error: "internal_error", message: "Project Documentation Explorer request failed." } };
}

/**
 * Creates a native Node.js HTTP request handler for Project Documentation Explorer.
 *
 * @param {{controller: Record<string, Function>, routes: Array<Record<string, unknown>>, principalResolver?: (request: import("node:http").IncomingMessage) => Record<string, unknown>}} dependencies - Handler dependencies.
 * @returns {(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) => Promise<void>} HTTP handler.
 */
export function createProjectDocumentationExplorerHttpHandler({ controller, routes, principalResolver = resolveHeaderPrincipal }) {
  if (!controller || !Array.isArray(routes)) {
    throw new TypeError("Project Documentation Explorer HTTP handler requires controller and routes dependencies.");
  }

  const compiledRoutes = routes.map(compileRoute);

  return async function projectDocumentationExplorerHttpHandler(request, response) {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const method = String(request.method ?? "GET").toUpperCase();
    const pathname = requestUrl.pathname;

    if (method === "OPTIONS" && hasKnownPath(compiledRoutes, pathname)) {
      writePreflight(response);
      return;
    }

    if (method !== "GET" && hasKnownPath(compiledRoutes, pathname)) {
      writeJson(response, 405, { error: "method_not_allowed", message: "Project Documentation Explorer HTTP API is read-only." });
      return;
    }

    const match = matchRoute(compiledRoutes, method, pathname);
    if (!match) {
      writeJson(response, 404, { error: "not_found", message: `Route not found: ${method} ${pathname}` });
      return;
    }

    const principal = principalResolver(request);
    const query = extractDocumentationQuery(requestUrl.searchParams);

    try {
      let payload;
      if (match.route.handler === controller.listDocumentation) {
        payload = await controller.listDocumentation({ principal, query });
      } else if (match.route.handler === controller.listDocumentationFilters) {
        payload = await controller.listDocumentationFilters({ principal, query });
      } else if (match.route.handler === controller.getDocumentationEntity) {
        payload = await controller.getDocumentationEntity({ principal, id: match.params.id });
      } else {
        payload = await match.route.handler({ principal, query, id: match.params.id });
      }

      writeJson(response, 200, payload);
    } catch (error) {
      const mapped = mapError(error);
      writeJson(response, mapped.statusCode, mapped.payload);
    }
  };
}

/**
 * Creates a native Node.js HTTP server for the Project Documentation Explorer.
 *
 * @param {{controller: Record<string, Function>, routes: Array<Record<string, unknown>>, principalResolver?: (request: import("node:http").IncomingMessage) => Record<string, unknown>}} dependencies - Server dependencies.
 * @returns {import("node:http").Server} HTTP server.
 */
export function createProjectDocumentationExplorerHttpServer(dependencies) {
  return createServer(createProjectDocumentationExplorerHttpHandler(dependencies));
}
