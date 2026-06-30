import { createServer } from "node:http";

import { isProjectDocumentationExplorerError } from "../../MR-0002/project-documentation-explorer/project-documentation-explorer.errors.mjs";

import {
  ChildProjectManagementInvalidRequestError,
  ChildProjectManagementNotFoundError,
  isChildProjectManagementError,
} from "./child-project-management.errors.mjs";

/**
 * @file Native Node.js HTTP transport for child project management read-only API.
 *
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @implementsRequirement MR-0003REQ-0068
 * @implementsRequirement MR-0003REQ-0069
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * This module maps native Node.js HTTP requests to the already-composed child
 * project management controller and route descriptors. It keeps the HTTP
 * transport read-only and receives dependencies instead of instantiating SQLite,
 * validators, repository adapters or UI code directly.
 *
 * Side effects: creates an in-memory request handler and, when requested, a
 * native Node.js HTTP server object. It does not call `listen`, write SQLite by
 * itself, mutate child repositories, generate skeletons, run Project Model
 * validators, perform Git operations, or implement dynamic RBAC persistence.
 */

/**
 * @typedef {(input: {principal?: Record<string, unknown>, childProjectId?: string, entityId?: string, query?: Record<string, unknown>}) => Promise<Record<string, unknown>>} ChildProjectManagementRouteHandler
 * @typedef {Record<string, unknown> & {method: string, path: string, handler: ChildProjectManagementRouteHandler}} ChildProjectManagementRouteDescriptor
 * @typedef {{route: ChildProjectManagementRouteDescriptor, regex: RegExp, parameterNames: string[]}} CompiledChildProjectManagementRoute
 * @typedef {{listChildProjects: ChildProjectManagementRouteHandler, getChildProject: ChildProjectManagementRouteHandler, listChildProjectDocumentation: ChildProjectManagementRouteHandler, getChildProjectDocumentationEntity: ChildProjectManagementRouteHandler}} ChildProjectManagementController
 */

const jsonContentType = "application/json; charset=utf-8";
const corsHeaders = Object.freeze({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "accept, content-type, x-threat-forge-authenticated, x-threat-forge-role",
  "access-control-max-age": "300",
});

const knownDocumentationQueryKeys = Object.freeze([
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
 * Converts URL search parameters to the child documentation query shape.
 *
 * @param {URLSearchParams} searchParams - Request search parameters.
 * @returns {Record<string, string|string[]>} Controller query object.
 */
function extractDocumentationQuery(searchParams) {
  /** @type {Record<string, string|string[]>} */
  const query = {};
  for (const key of knownDocumentationQueryKeys) {
    const values = searchParams.getAll(key).filter((value) => String(value ?? "").trim());
    if (values.length === 1) query[key] = values[0];
    if (values.length > 1) query[key] = values;
  }
  return query;
}

/**
 * Builds a conservative principal from request headers for bootstrap use.
 *
 * @param {import("node:http").IncomingMessage} request - HTTP request.
 * @returns {Record<string, unknown>} Principal object.
 */
export function resolveChildProjectManagementHeaderPrincipal(request) {
  const authenticated = String(request.headers["x-threat-forge-authenticated"] ?? "").toLowerCase() === "true";
  const role = String(request.headers["x-threat-forge-role"] ?? "").trim();
  return {
    authenticated,
    role: role || undefined,
  };
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
 * @param {ChildProjectManagementRouteDescriptor} route - Route descriptor.
 * @returns {CompiledChildProjectManagementRoute} Compiled matcher.
 */
function compileRoute(route) {
  /** @type {string[]} */
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
 * @param {ReadonlyArray<CompiledChildProjectManagementRoute>} compiledRoutes - Compiled route descriptors.
 * @param {string} method - Request method.
 * @param {string} pathname - Request pathname.
 * @returns {{route: ChildProjectManagementRouteDescriptor, params: Record<string, string>}|null} Match result.
 */
function matchRoute(compiledRoutes, method, pathname) {
  for (const candidate of compiledRoutes) {
    const match = candidate.regex.exec(pathname);
    if (!match) continue;
    if (String(candidate.route.method ?? "").toUpperCase() !== method.toUpperCase()) return null;

    /** @type {Record<string, string>} */
    const params = {};
    candidate.parameterNames.forEach((name, index) => {
      try {
        params[name] = decodeURIComponent(match[index + 1]);
      } catch (error) {
        if (error instanceof URIError) {
          throw new ChildProjectManagementInvalidRequestError(`Invalid route parameter encoding for ${name}.`);
        }
        throw error;
      }
    });
    return { route: candidate.route, params };
  }
  return null;
}

/**
 * Checks whether a path is known with a different HTTP method.
 *
 * @param {ReadonlyArray<CompiledChildProjectManagementRoute>} compiledRoutes - Compiled route descriptors.
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
  if (isChildProjectManagementError(error) || isProjectDocumentationExplorerError(error)) {
    return {
      statusCode: error.statusCode,
      payload: { error: error.code, message: error.publicMessage },
    };
  }

  return {
    statusCode: 500,
    payload: { error: "internal_error", message: "Child project management request failed." },
  };
}

/**
 * Creates a native Node.js HTTP request handler for child project management.
 *
 * @param {{controller: ChildProjectManagementController, routes: ReadonlyArray<ChildProjectManagementRouteDescriptor>, principalResolver?: (request: import("node:http").IncomingMessage) => Record<string, unknown>}} dependencies - Handler dependencies.
 * @returns {(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) => Promise<void>} HTTP handler.
 */
export function createChildProjectManagementHttpHandler({
  controller,
  routes,
  principalResolver = resolveChildProjectManagementHeaderPrincipal,
}) {
  if (!controller || !Array.isArray(routes)) {
    throw new TypeError("Child project management HTTP handler requires controller and routes dependencies.");
  }

  const compiledRoutes = routes.map(compileRoute);

  return async function childProjectManagementHttpHandler(request, response) {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const method = String(request.method ?? "GET").toUpperCase();
    const pathname = requestUrl.pathname;

    if (method === "OPTIONS" && hasKnownPath(compiledRoutes, pathname)) {
      writePreflight(response);
      return;
    }

    if (method !== "GET" && hasKnownPath(compiledRoutes, pathname)) {
      writeJson(response, 405, { error: "method_not_allowed", message: "Child project management HTTP API is read-only." });
      return;
    }

    try {
      const match = matchRoute(compiledRoutes, method, pathname);
      if (!match) {
        const mapped = mapError(new ChildProjectManagementNotFoundError(`Route not found: ${method} ${pathname}`));
        writeJson(response, mapped.statusCode, mapped.payload);
        return;
      }

      const principal = principalResolver(request);
      const query = extractDocumentationQuery(requestUrl.searchParams);
      let payload;
      if (match.route.handler === controller.listChildProjects) {
        payload = await controller.listChildProjects({ principal });
      } else if (match.route.handler === controller.getChildProject) {
        payload = await controller.getChildProject({ principal, childProjectId: match.params.id });
      } else if (match.route.handler === controller.listChildProjectDocumentation) {
        payload = await controller.listChildProjectDocumentation({ principal, childProjectId: match.params.id, query });
      } else if (match.route.handler === controller.getChildProjectDocumentationEntity) {
        payload = await controller.getChildProjectDocumentationEntity({
          principal,
          childProjectId: match.params.id,
          entityId: match.params.entityId,
        });
      } else {
        payload = await match.route.handler({ principal, childProjectId: match.params.id, entityId: match.params.entityId, query });
      }

      writeJson(response, 200, payload);
    } catch (error) {
      const mapped = mapError(error);
      writeJson(response, mapped.statusCode, mapped.payload);
    }
  };
}

/**
 * Creates a native Node.js HTTP server for child project management.
 *
 * @param {{controller: ChildProjectManagementController, routes: ReadonlyArray<ChildProjectManagementRouteDescriptor>, principalResolver?: (request: import("node:http").IncomingMessage) => Record<string, unknown>}} dependencies - Server dependencies.
 * @returns {import("node:http").Server} HTTP server.
 */
export function createChildProjectManagementHttpServer(dependencies) {
  return createServer(createChildProjectManagementHttpHandler(dependencies));
}
