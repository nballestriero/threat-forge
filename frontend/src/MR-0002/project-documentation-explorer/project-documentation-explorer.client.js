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
 * @implementsRequirement MR-0002REQ-0049
 * @implementsRequirement MR-0002REQ-0069
 * @implementsRequirement MR-0002REQ-0070
 * @derivedFromDecision MR-0002/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0003
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0015
 * @derivedFromDecision MR-0002/ADR-0016
 * @derivedFromDecision MR-0002/ADR-0029
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
/** @typedef {{selected_source: string, effective_source: string, fallback: boolean, label: string, message: string, failure_message?: string}} DocumentationDataSourceState */
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
 * Converts a caught value to a concise data-source diagnostic.
 *
 * @param {unknown} error - Caught load error.
 * @returns {string} Human-readable diagnostic.
 */
function describeError(error) {
  return error instanceof Error ? error.message : String(error ?? "Unknown Project Documentation Explorer load failure.");
}

/**
 * Creates a stable data-source state record for UI display.
 *
 * @param {DocumentationDataSourceState} state - State to freeze.
 * @returns {DocumentationDataSourceState} Frozen state.
 */
function createDataSourceState(state) {
  return Object.freeze({ ...state });
}

/**
 * Adds explicit data-source state to a normalized read model without mutating it.
 *
 * @param {Record<string, unknown>} payload - Read model payload.
 * @param {DocumentationDataSourceState} dataSource - Data-source state.
 * @returns {Record<string, unknown>} Payload with source state.
 */
function withDataSourceState(payload, dataSource) {
  return {
    ...(payload ?? {}),
    data_source: dataSource,
  };
}

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
  const snapshotDataSource = createDataSourceState({
    selected_source: PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.snapshot,
    effective_source: PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.snapshot,
    fallback: false,
    label: "Generated snapshot",
    message: "Using the generated Project Documentation Explorer snapshot.",
  });
  const readSnapshot = () => {
    snapshotPromise ??= loadSnapshot({ snapshotUrl, fetchImpl });
    return snapshotPromise;
  };

  return Object.freeze({
    describeDataSource() {
      return snapshotDataSource;
    },

    async loadDocumentation() {
      const snapshot = await readSnapshot();
      return withDataSourceState(snapshot.list, snapshotDataSource);
    },

    async loadDocumentationFilters() {
      const snapshot = await readSnapshot();
      return withDataSourceState({
        access: snapshot.list.access,
        query: snapshot.list.query ?? {},
        filters: snapshot.list.filters ?? [],
      }, snapshotDataSource);
    },

    async loadDocumentationEntity(id) {
      const snapshot = await readSnapshot();
      const detail = snapshot.details_by_id[id];
      if (!detail) throw new Error(`Unknown documentation entity: ${id}`);
      return withDataSourceState(detail, snapshotDataSource);
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
  snapshotFallback = true,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Project Documentation Explorer HTTP client requires fetch.");

  const httpDataSource = createDataSourceState({
    selected_source: PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.http,
    effective_source: PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.http,
    fallback: false,
    label: "Live HTTP",
    message: "Using the governed Project Documentation Explorer HTTP API.",
  });

  return Object.freeze({
    describeDataSource() {
      return httpDataSource;
    },

    async loadDocumentation(query = {}) {
      const url = appendQuery(joinApiUrl(baseUrl, "/api/project-model/documentation"), query);
      return withDataSourceState(await fetchJson({ fetchImpl, url, headers }), httpDataSource);
    },

    async loadDocumentationFilters(query = {}) {
      const url = appendQuery(joinApiUrl(baseUrl, "/api/project-model/documentation/filters"), query);
      return withDataSourceState(await fetchJson({ fetchImpl, url, headers }), httpDataSource);
    },

    async loadDocumentationEntity(id) {
      if (!id) throw new Error("Project Documentation Explorer entity id is required.");
      const url = joinApiUrl(baseUrl, `/api/project-model/documentation/entities/${encodeURIComponent(id)}`);
      return withDataSourceState(await fetchJson({ fetchImpl, url, headers }), httpDataSource);
    },
  });
}


/**
 * Create a client that fails closed when a child-project documentation source is not configured.
 *
 * @param {{label?: string, message?: string, failureMessage?: string}} [options] - Unavailable source options.
 * @returns {{describeDataSource: Function, loadDocumentation: Function, loadDocumentationFilters: Function, loadDocumentationEntity: Function}} Frontend client port.
 */
export function createUnavailableProjectDocumentationExplorerClient({
  label = "Child Project Documentation unavailable",
  message = "No child Project Documentation Explorer HTTP source is configured for the selected child project.",
  failureMessage = "Configure VITE_CHILD_PROJECT_DOCUMENTATION_EXPLORER_HTTP_BASE_URL for a child Project Documentation Explorer API before opening child project documents.",
} = {}) {
  const dataSource = createDataSourceState({
    selected_source: "child-http",
    effective_source: "unavailable",
    fallback: false,
    label,
    message,
    failure_message: failureMessage,
  });

  /**
   * Create a child-project documentation source error without falling back to platform documents.
   *
   * @returns {Error} Fail-closed source error.
   */
  function createUnavailableError() {
    return new Error(`${message} ${failureMessage}`);
  }

  return Object.freeze({
    describeDataSource() {
      return dataSource;
    },

    loadDocumentation() {
      return Promise.reject(createUnavailableError());
    },

    loadDocumentationFilters() {
      return Promise.reject(createUnavailableError());
    },

    loadDocumentationEntity() {
      return Promise.reject(createUnavailableError());
    },
  });
}

/**
 * Create a live HTTP client with an explicit generated-snapshot fallback.
 *
 * @param {{httpBaseUrl?: string, snapshotUrl: string, headers?: Record<string, string>, fetchImpl?: Function, snapshotFallback?: boolean}} options - Client options.
 * @returns {{describeDataSource: Function, loadDocumentation: Function, loadDocumentationFilters: Function, loadDocumentationEntity: Function}} Frontend client port.
 */
export function createLiveProjectDocumentationExplorerClient({
  httpBaseUrl = "",
  snapshotUrl,
  headers = DEFAULT_BOOTSTRAP_HEADERS,
  fetchImpl = globalThis.fetch,
  snapshotFallback = true,
}) {
  const httpClient = createHttpProjectDocumentationExplorerClient({ baseUrl: httpBaseUrl, headers, fetchImpl });
  const snapshotClient = createStaticProjectDocumentationExplorerClient({ snapshotUrl, fetchImpl });
  let lastDataSource = httpClient.describeDataSource();

  /**
   * Executes a live read and optionally falls back to the generated snapshot.
   *
   * @param {() => Promise<Record<string, unknown>>} liveRead - Live HTTP read.
   * @param {() => Promise<Record<string, unknown>>} snapshotRead - Snapshot read.
   * @returns {Promise<Record<string, unknown>>} Read model with data-source state.
   */
  async function readWithFallback(liveRead, snapshotRead) {
    try {
      const payload = await liveRead();
      lastDataSource = payload.data_source ?? httpClient.describeDataSource();
      return payload;
    } catch (error) {
      if (!snapshotFallback) throw error;

      try {
        const snapshotPayload = await snapshotRead();
        const fallbackDataSource = createDataSourceState({
          selected_source: PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.http,
          effective_source: PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.snapshot,
          fallback: true,
          label: "Live HTTP unavailable · snapshot fallback",
          message: "Live HTTP failed, so the UI is showing the generated read-only snapshot.",
          failure_message: describeError(error),
        });
        lastDataSource = fallbackDataSource;
        return withDataSourceState(snapshotPayload, fallbackDataSource);
      } catch (fallbackError) {
        throw new Error(`${describeError(error)} Snapshot fallback also failed: ${describeError(fallbackError)}`);
      }
    }
  }

  return Object.freeze({
    describeDataSource() {
      return lastDataSource;
    },

    loadDocumentation(query = {}) {
      return readWithFallback(
        () => httpClient.loadDocumentation(query),
        () => snapshotClient.loadDocumentation(query),
      );
    },

    loadDocumentationFilters(query = {}) {
      return readWithFallback(
        () => httpClient.loadDocumentationFilters(query),
        () => snapshotClient.loadDocumentationFilters(query),
      );
    },

    loadDocumentationEntity(id) {
      return readWithFallback(
        () => httpClient.loadDocumentationEntity(id),
        () => snapshotClient.loadDocumentationEntity(id),
      );
    },
  });
}

/**
 * Create the page-facing Project Documentation Explorer client boundary.
 *
 * @param {{source?: string, snapshotUrl?: string, httpBaseUrl?: string, headers?: Record<string, string>, fetchImpl?: Function, snapshotFallback?: boolean}} options - Boundary options.
 * @returns {{loadDocumentation: Function, loadDocumentationFilters: Function, loadDocumentationEntity: Function}} Frontend client port.
 */
export function createProjectDocumentationExplorerClient({
  source = PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.snapshot,
  snapshotUrl = "/project-documentation-explorer.snapshot.json",
  httpBaseUrl = "",
  headers = DEFAULT_BOOTSTRAP_HEADERS,
  fetchImpl = globalThis.fetch,
  snapshotFallback = true,
} = {}) {
  const normalizedSource = String(source || PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.snapshot).toLowerCase();

  if (normalizedSource === PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.http) {
    return createLiveProjectDocumentationExplorerClient({ httpBaseUrl, snapshotUrl, headers, fetchImpl, snapshotFallback });
  }

  if (normalizedSource !== PROJECT_DOCUMENTATION_EXPLORER_DATA_SOURCES.snapshot) {
    throw new Error(`Unsupported Project Documentation Explorer data source: ${source}`);
  }

  return createStaticProjectDocumentationExplorerClient({ snapshotUrl, fetchImpl });
}
