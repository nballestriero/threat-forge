/**
 * @file Project Documentation Explorer frontend client-port adapters.
 *
 * @implementsRequirement MR-0002REQ-0002
 * @implementsRequirement MR-0002REQ-0007
 * @implementsRequirement MR-0002REQ-0012
 * @implementsRequirement MR-0002REQ-0026
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @implementsRequirement MR-0002REQ-0037
 * @implementsRequirement MR-0002REQ-0048
 * @derivedFromDecision MR-0002/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0003
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0015
 * @macroRequirement MR-0002
 *
 * This module defines the frontend client boundary used by React components. The
 * page-facing port can be backed by the generated static snapshot or by the
 * governed Project Documentation Explorer HTTP API. The page receives normalized
 * collection, filter and detail view-models through the same boundary and does
 * not parse YAML, Markdown, graph registries, Git state or filesystem paths.
 *
 * Side effects: fetches JSON data from the browser when methods are called. It
 * does not mutate repository files, write documentation records or implement
 * mutation operations.
 */

/** @typedef {{id: string, label: string, values: Array<{value: string, label?: string, count?: number}>}} DocumentationFilter */
/** @typedef {{id: string, kind: string, title: string, macro_requirement_id?: string, status?: string, implementation_state?: string, acceptance_state?: string}} DocumentationItem */
/** @typedef {{list: {access?: {capabilities?: string[]}, summary: Record<string, unknown>, filters: DocumentationFilter[], items: DocumentationItem[]}, details_by_id: Record<string, Record<string, unknown>>}} DocumentationSnapshot */

export const PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES = Object.freeze({
  snapshot: "snapshot",
  http: "http",
});

const DEFAULT_BOOTSTRAP_HEADERS = Object.freeze({
  "x-threat-forge-authenticated": "true",
  "x-threat-forge-role": "registered_user",
});

/**
 * Append normalized query parameters to a read-only Project Documentation
 * Explorer HTTP URL.
 *
 * @param {string} url - Base endpoint URL.
 * @param {Record<string, unknown>} query - Query values.
 * @returns {string} URL with encoded query parameters.
 */
function appendQuery(url, query = {}) {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue == null || rawValue === "") continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value == null || value === "") continue;
      params.append(key, String(value));
    }
  }

  const queryString = params.toString();
  if (!queryString) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
}

/**
 * Join a configured frontend data-source base URL with an API pathname.
 *
 * @param {string} baseUrl - Optional API base URL.
 * @param {string} pathname - Governed API pathname.
 * @returns {string} Joined URL.
 */
function joinApiUrl(baseUrl, pathname) {
  const normalizedBase = String(baseUrl ?? "").trim().replace(/\/$/u, "");
  return `${normalizedBase}${pathname}`;
}

/**
 * Fetch a JSON read model through the selected browser transport.
 *
 * @param {{fetchImpl: Function, url: string, headers?: Record<string, string>}} options - Fetch options.
 * @returns {Promise<Record<string, unknown>>} Parsed JSON response.
 */
async function fetchJson({ fetchImpl, url, headers = {} }) {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load Project Documentation Explorer data from ${url}: HTTP ${response.status}.`);
  }

  return response.json();
}

/**
 * Load and validate the generated snapshot envelope.
 *
 * @param {{snapshotUrl: string, fetchImpl: Function}} options - Snapshot load options.
 * @returns {Promise<DocumentationSnapshot>} Normalized snapshot envelope.
 */
async function loadSnapshot({ snapshotUrl, fetchImpl }) {
  const response = await fetchImpl(snapshotUrl, { method: "GET", headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Unable to load Project Documentation Explorer snapshot from ${snapshotUrl}. Run npm run frontend:project-documentation-explorer:snapshot first.`);
  }
  const snapshot = await response.json();
  if (!snapshot?.list || !snapshot?.details_by_id) {
    throw new Error("Invalid Project Documentation Explorer snapshot: missing list/details_by_id.");
  }
  return snapshot;
}

/**
 * Create a static snapshot-backed frontend client.
 *
 * @param {{snapshotUrl: string, fetchImpl?: Function}} options - Client options.
 * @returns {{loadDocumentation: Function, loadDocumentationFilters: Function, loadDocumentationEntity: Function}} Frontend client port.
 */
export function createStaticProjectDocumentationExplorerClient({
  snapshotUrl,
  fetchImpl = globalThis.fetch,
}) {
  if (!snapshotUrl) throw new Error("Project Documentation Explorer snapshotUrl is required.");
  if (typeof fetchImpl !== "function") throw new Error("Project Documentation Explorer static client requires fetch.");

  let snapshotPromise;
  const readSnapshot = () => {
    snapshotPromise ??= loadSnapshot({ snapshotUrl, fetchImpl });
    return snapshotPromise;
  };

  return Object.freeze({
    async loadDocumentation() {
      const snapshot = await readSnapshot();
      return snapshot.list;
    },

    async loadDocumentationFilters() {
      const snapshot = await readSnapshot();
      return {
        access: snapshot.list.access,
        query: snapshot.list.query ?? {},
        filters: snapshot.list.filters ?? [],
      };
    },

    async loadDocumentationEntity(id) {
      const snapshot = await readSnapshot();
      const detail = snapshot.details_by_id[id];
      if (!detail) throw new Error(`Unknown documentation entity: ${id}`);
      return detail;
    },
  });
}

/**
 * Create a governed HTTP-backed frontend client.
 *
 * @param {{baseUrl?: string, headers?: Record<string, string>, fetchImpl?: Function}} options - Client options.
 * @returns {{loadDocumentation: Function, loadDocumentationFilters: Function, loadDocumentationEntity: Function}} Frontend client port.
 */
export function createHttpProjectDocumentationExplorerClient({
  baseUrl = "",
  headers = DEFAULT_BOOTSTRAP_HEADERS,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Project Documentation Explorer HTTP client requires fetch.");

  return Object.freeze({
    async loadDocumentation(query = {}) {
      const url = appendQuery(joinApiUrl(baseUrl, "/api/project-model/documentation"), query);
      return fetchJson({ fetchImpl, url, headers });
    },

    async loadDocumentationFilters(query = {}) {
      const url = appendQuery(joinApiUrl(baseUrl, "/api/project-model/documentation/filters"), query);
      return fetchJson({ fetchImpl, url, headers });
    },

    async loadDocumentationEntity(id) {
      if (!id) throw new Error("Project Documentation Explorer entity id is required.");
      const url = joinApiUrl(baseUrl, `/api/project-model/documentation/entities/${encodeURIComponent(id)}`);
      return fetchJson({ fetchImpl, url, headers });
    },
  });
}

/**
 * Create the page-facing Project Documentation Explorer client boundary.
 *
 * @param {{source?: string, snapshotUrl?: string, httpBaseUrl?: string, headers?: Record<string, string>, fetchImpl?: Function}} options - Boundary options.
 * @returns {{loadDocumentation: Function, loadDocumentationFilters: Function, loadDocumentationEntity: Function}} Frontend client port.
 */
export function createProjectDocumentationExplorerClient({
  source = PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.snapshot,
  snapshotUrl = "/project-documentation-explorer.snapshot.json",
  httpBaseUrl = "",
  headers = DEFAULT_BOOTSTRAP_HEADERS,
  fetchImpl = globalThis.fetch,
} = {}) {
  const normalizedSource = String(source || PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.snapshot).toLowerCase();

  if (normalizedSource === PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.http) {
    return createHttpProjectDocumentationExplorerClient({ baseUrl: httpBaseUrl, headers, fetchImpl });
  }

  if (normalizedSource !== PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.snapshot) {
    throw new Error(`Unsupported Project Documentation Explorer data source: ${source}`);
  }

  return createStaticProjectDocumentationExplorerClient({ snapshotUrl, fetchImpl });
}
