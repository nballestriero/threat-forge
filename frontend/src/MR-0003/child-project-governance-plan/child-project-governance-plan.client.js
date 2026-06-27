/**
 * @file Frontend client port for read-only child project governance gate plans.
 *
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0059
 * @implementsRequirement MR-0003REQ-0060
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0011
 * @macroRequirement MR-0003
 *
 * The client reads the governed Child Project Governance Plan HTTP API or an
 * explicit static preview payload through a small frontend port. It keeps the
 * browser decoupled from generated artifact paths, registries, filesystem
 * traversal, SQLite state and gate execution. Feature components receive
 * normalized JSON view models and remain read-only.
 *
 * Side effects: HTTP mode performs browser GET requests through the injected
 * fetch implementation. Static mode has no side effects.
 */

export const CHILD_PROJECT_GOVERNANCE_PLAN_DATA_SOURCES = Object.freeze({
  static: "static",
  http: "http",
});

const DEFAULT_BOOTSTRAP_HEADERS = Object.freeze({
  "x-threat-forge-authenticated": "true",
  "x-threat-forge-role": "registered_user",
});

const READ_CAPABILITIES = Object.freeze([
  "child_project_governance_plan.read",
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
    throw new Error(`Unable to load Child Project Governance Plan data from ${url}: HTTP ${response.status}.`);
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
    capabilities: payload?.capabilities ?? READ_CAPABILITIES,
    data_source: dataSource,
  };
}

/**
 * Create a static preview client for gate plan UI composition.
 *
 * @param {{items?: Array<Record<string, unknown>>, details?: Record<string, Record<string, unknown>>, capabilities?: string[]}} [options] - Static payload options.
 * @returns {{describeDataSource(): Record<string, unknown>, listGatePlans(): Promise<Record<string, unknown>>, getGatePlan(profile: string, targetScope: string): Promise<Record<string, unknown>>}} Client port.
 */
export function createStaticChildProjectGovernancePlanClient({
  items = [],
  details = {},
  capabilities = READ_CAPABILITIES,
} = {}) {
  const dataSource = createDataSourceState({
    selected_source: CHILD_PROJECT_GOVERNANCE_PLAN_DATA_SOURCES.static,
    effective_source: CHILD_PROJECT_GOVERNANCE_PLAN_DATA_SOURCES.static,
    fallback: false,
    label: "Static preview",
    message: "Using an empty static governance plan preview. Select HTTP mode to read generated gate-plan artifacts.",
  });

  const normalizedItems = Array.isArray(items) ? items : [];

  return Object.freeze({
    describeDataSource() {
      return dataSource;
    },

    async listGatePlans() {
      return withDataSourceState({
        capabilities,
        artifact_directory: "artifacts/child-project-governance/gate-plans",
        items: normalizedItems,
      }, dataSource);
    },

    async getGatePlan(profile, targetScope) {
      const key = `${profile}/${targetScope}`;
      const detail = details[key];
      if (!detail) throw new Error(`Unknown child project governance gate plan: ${key}`);
      return withDataSourceState(detail, dataSource);
    },
  });
}

/**
 * Create a governed HTTP client for Child Project Governance Plan artifacts.
 *
 * @param {{baseUrl?: string, headers?: Record<string, string>, fetchImpl?: Function}} [options] - HTTP client options.
 * @returns {{describeDataSource(): Record<string, unknown>, listGatePlans(): Promise<Record<string, unknown>>, getGatePlan(profile: string, targetScope: string): Promise<Record<string, unknown>>}} Client port.
 */
export function createHttpChildProjectGovernancePlanClient({
  baseUrl = "",
  headers = DEFAULT_BOOTSTRAP_HEADERS,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Child Project Governance Plan HTTP client requires fetch.");

  const dataSource = createDataSourceState({
    selected_source: CHILD_PROJECT_GOVERNANCE_PLAN_DATA_SOURCES.http,
    effective_source: CHILD_PROJECT_GOVERNANCE_PLAN_DATA_SOURCES.http,
    fallback: false,
    label: "Live HTTP",
    message: "Using the governed Child Project Governance Plan read-only HTTP API.",
  });

  return Object.freeze({
    describeDataSource() {
      return dataSource;
    },

    async listGatePlans() {
      const url = joinApiUrl(baseUrl, "/api/child-project-governance/gate-plans");
      return withDataSourceState(await fetchJson({ fetchImpl, url, headers }), dataSource);
    },

    async getGatePlan(profile, targetScope) {
      const normalizedProfile = String(profile ?? "").trim();
      const normalizedTargetScope = String(targetScope ?? "").trim();
      if (!normalizedProfile || !normalizedTargetScope) {
        throw new Error("Governance profile and target scope are required.");
      }
      const url = joinApiUrl(
        baseUrl,
        `/api/child-project-governance/gate-plans/${encodeURIComponent(normalizedProfile)}/${encodeURIComponent(normalizedTargetScope)}`,
      );
      return withDataSourceState(await fetchJson({ fetchImpl, url, headers }), dataSource);
    },
  });
}

/**
 * Create the configured Child Project Governance Plan frontend client.
 *
 * @param {{source?: string, httpBaseUrl?: string, fetchImpl?: Function}} [options] - Data-source options.
 * @returns {{describeDataSource(): Record<string, unknown>, listGatePlans(): Promise<Record<string, unknown>>, getGatePlan(profile: string, targetScope: string): Promise<Record<string, unknown>>}} Client port.
 */
export function createChildProjectGovernancePlanClient({
  source = CHILD_PROJECT_GOVERNANCE_PLAN_DATA_SOURCES.static,
  httpBaseUrl = "",
  fetchImpl = globalThis.fetch,
} = {}) {
  const normalizedSource = String(source ?? CHILD_PROJECT_GOVERNANCE_PLAN_DATA_SOURCES.static).trim() || CHILD_PROJECT_GOVERNANCE_PLAN_DATA_SOURCES.static;

  if (normalizedSource === CHILD_PROJECT_GOVERNANCE_PLAN_DATA_SOURCES.http) {
    return createHttpChildProjectGovernancePlanClient({ baseUrl: httpBaseUrl, fetchImpl });
  }

  if (normalizedSource === CHILD_PROJECT_GOVERNANCE_PLAN_DATA_SOURCES.static) {
    return createStaticChildProjectGovernancePlanClient();
  }

  throw new Error(`Unsupported Child Project Governance Plan frontend data source: ${normalizedSource}.`);
}
