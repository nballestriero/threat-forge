/**
 * @file Frontend client-port adapters for child project management read-only data.
 *
 * @implementsRequirement MR-0003REQ-0012
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * The client exposes a small read-only browser port for the Child Projects page.
 * It can use either a governed HTTP API or an explicit static preview model so
 * the Governance Console remains buildable without starting backend services.
 * It does not read SQLite directly, inspect child-project repositories, parse
 * Project Model registries, run validators, generate skeletons or mutate state.
 *
 * Side effects: HTTP mode performs browser GET requests through the injected
 * fetch function. Static mode has no side effects.
 */

export const CHILD_PROJECT_MANAGEMENT_DATA_SOURCES = Object.freeze({
  static: "static",
  http: "http",
});

const DEFAULT_BOOTSTRAP_HEADERS = Object.freeze({
  "x-threat-forge-authenticated": "true",
  "x-threat-forge-role": "registered_user",
});

const READ_CAPABILITIES = Object.freeze([
  "child_projects.list",
  "child_projects.read",
  "child_projects.view_operational_state",
]);

/**
 * Join a configured frontend API base URL with a governed API pathname.
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
 * Fetch and parse a JSON read model through the selected browser transport.
 *
 * @param {{fetchImpl: Function, url: string, headers?: Record<string, string>}} options - Fetch options.
 * @returns {Promise<Record<string, unknown>>} Parsed JSON payload.
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
    throw new Error(`Unable to load Child Projects data from ${url}: HTTP ${response.status}.`);
  }

  return response.json();
}

/**
 * Create a UI data-source state object.
 *
 * @param {Record<string, unknown>} state - Data-source state values.
 * @returns {Readonly<Record<string, unknown>>} Frozen data-source state.
 */
function createDataSourceState(state) {
  return Object.freeze({ ...state });
}

/**
 * Add explicit data-source state to a normalized payload.
 *
 * @param {Record<string, unknown>} payload - Read model payload.
 * @param {Record<string, unknown>} dataSource - Data-source state.
 * @returns {Record<string, unknown>} Payload with data-source state.
 */
function withDataSourceState(payload, dataSource) {
  return {
    ...(payload ?? {}),
    data_source: dataSource,
  };
}

/**
 * Create a static preview client for Child Projects.
 *
 * @param {{items?: Array<Record<string, unknown>>, capabilities?: string[]}} [options] - Static payload options.
 * @returns {{describeDataSource(): Record<string, unknown>, listChildProjects(): Promise<Record<string, unknown>>, getChildProject(id: string): Promise<Record<string, unknown>>}} Client port.
 */
export function createStaticChildProjectManagementClient({
  items = [],
  capabilities = READ_CAPABILITIES,
} = {}) {
  const dataSource = createDataSourceState({
    selected_source: CHILD_PROJECT_MANAGEMENT_DATA_SOURCES.static,
    effective_source: CHILD_PROJECT_MANAGEMENT_DATA_SOURCES.static,
    fallback: false,
    label: "Static preview",
    message: "Using an empty static Child Projects preview. Select HTTP mode to read the governed backend API.",
  });

  const normalizedItems = Array.isArray(items) ? items : [];

  return Object.freeze({
    describeDataSource() {
      return dataSource;
    },

    async listChildProjects() {
      return withDataSourceState({
        capabilities,
        items: normalizedItems,
      }, dataSource);
    },

    async getChildProject(id) {
      const state = normalizedItems.find((item) => item?.child_project?.id === id);
      if (!state) throw new Error(`Unknown child project: ${id}`);
      return withDataSourceState(state, dataSource);
    },
  });
}

/**
 * Create a governed HTTP client for Child Projects.
 *
 * @param {{baseUrl?: string, headers?: Record<string, string>, fetchImpl?: Function}} [options] - HTTP client options.
 * @returns {{describeDataSource(): Record<string, unknown>, listChildProjects(): Promise<Record<string, unknown>>, getChildProject(id: string): Promise<Record<string, unknown>>}} Client port.
 */
export function createHttpChildProjectManagementClient({
  baseUrl = "",
  headers = DEFAULT_BOOTSTRAP_HEADERS,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Child Projects HTTP client requires fetch.");

  const dataSource = createDataSourceState({
    selected_source: CHILD_PROJECT_MANAGEMENT_DATA_SOURCES.http,
    effective_source: CHILD_PROJECT_MANAGEMENT_DATA_SOURCES.http,
    fallback: false,
    label: "Live HTTP",
    message: "Using the governed Child Projects read-only HTTP API.",
  });

  return Object.freeze({
    describeDataSource() {
      return dataSource;
    },

    async listChildProjects() {
      const url = joinApiUrl(baseUrl, "/api/child-projects");
      return withDataSourceState(await fetchJson({ fetchImpl, url, headers }), dataSource);
    },

    async getChildProject(id) {
      const normalizedId = String(id ?? "").trim();
      if (!normalizedId) throw new Error("Child project id is required.");
      const url = joinApiUrl(baseUrl, `/api/child-projects/${encodeURIComponent(normalizedId)}`);
      return withDataSourceState(await fetchJson({ fetchImpl, url, headers }), dataSource);
    },
  });
}

/**
 * Create the configured Child Projects frontend client.
 *
 * @param {{source?: string, httpBaseUrl?: string, fetchImpl?: Function}} [options] - Data-source options.
 * @returns {{describeDataSource(): Record<string, unknown>, listChildProjects(): Promise<Record<string, unknown>>, getChildProject(id: string): Promise<Record<string, unknown>>}} Client port.
 */
export function createChildProjectManagementClient({
  source = CHILD_PROJECT_MANAGEMENT_DATA_SOURCES.static,
  httpBaseUrl = "",
  fetchImpl = globalThis.fetch,
} = {}) {
  const normalizedSource = String(source ?? CHILD_PROJECT_MANAGEMENT_DATA_SOURCES.static).trim() || CHILD_PROJECT_MANAGEMENT_DATA_SOURCES.static;

  if (normalizedSource === CHILD_PROJECT_MANAGEMENT_DATA_SOURCES.http) {
    return createHttpChildProjectManagementClient({ baseUrl: httpBaseUrl, fetchImpl });
  }

  if (normalizedSource === CHILD_PROJECT_MANAGEMENT_DATA_SOURCES.static) {
    return createStaticChildProjectManagementClient();
  }

  throw new Error(`Unsupported Child Projects frontend data source: ${normalizedSource}.`);
}
