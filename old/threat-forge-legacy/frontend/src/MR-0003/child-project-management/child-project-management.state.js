/**
 * @file Frontend state helpers for child project management read-only views.
 *
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0025
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * These helpers derive search/filter results and summary counts from normalized
 * child project operational-state read models. They do not read SQLite, inspect
 * repositories, fetch API data, run validators, mutate child-project records or
 * make access-control decisions.
 *
 * Side effects: none. All helpers are deterministic and return derived values.
 */

const knownOperationalStatuses = Object.freeze(["pass", "fail", "warning", "skipped", "reserved", "unknown"]);

/**
 * Return the latest overall status for a child project operational-state item.
 *
 * @param {Record<string, unknown>} state - Operational-state item.
 * @returns {string} Latest status or unknown.
 */
export function getChildProjectOverallStatus(state) {
  return String(state?.latest_check_run?.overall_status ?? "unknown");
}

/**
 * Derive a searchable text envelope for a child project operational-state item.
 *
 * @param {Record<string, unknown>} state - Operational-state item.
 * @returns {string} Lower-cased searchable string.
 */
function getSearchText(state) {
  const project = state?.child_project ?? {};
  const repository = project.repository ?? {};
  const projectModel = project.project_model ?? {};
  const latestCheckRun = state?.latest_check_run ?? {};

  return [
    project.id,
    project.name,
    repository.kind,
    repository.url,
    repository.local_path,
    repository.default_branch,
    projectModel.governance_profile,
    projectModel.root,
    latestCheckRun.repository_head,
    latestCheckRun.branch,
    latestCheckRun.overall_status,
  ].map((value) => String(value ?? "").toLowerCase()).join(" ");
}

/**
 * Filter child project operational states for the read-only UI.
 *
 * @param {Array<Record<string, unknown>>} items - Operational-state items.
 * @param {{q?: string, status?: string}} state - UI state.
 * @returns {Array<Record<string, unknown>>} Filtered items.
 */
export function filterChildProjectOperationalStates(items, state = {}) {
  const search = String(state.q ?? "").trim().toLowerCase();
  const status = String(state.status ?? "").trim();

  return (items ?? []).filter((item) => {
    if (search && !getSearchText(item).includes(search)) return false;
    if (status && getChildProjectOverallStatus(item) !== status) return false;
    return true;
  });
}

/**
 * Count child projects by latest overall check status.
 *
 * @param {Array<Record<string, unknown>>} items - Operational-state items.
 * @returns {Record<string, number>} Counts by status.
 */
export function countChildProjectsByStatus(items) {
  const counts = Object.fromEntries(knownOperationalStatuses.map((status) => [status, 0]));

  for (const item of items ?? []) {
    const status = getChildProjectOverallStatus(item);
    counts[status] = (counts[status] ?? 0) + 1;
  }

  return counts;
}

/**
 * Build select-field options for child project status filters.
 *
 * @param {Array<Record<string, unknown>>} items - Operational-state items.
 * @returns {Array<{value: string, label: string, count: number}>} Status options.
 */
export function buildChildProjectStatusFilterOptions(items) {
  const counts = countChildProjectsByStatus(items);

  return knownOperationalStatuses
    .filter((status) => counts[status] > 0 || status === "unknown")
    .map((status) => ({
      value: status,
      label: status.replaceAll("_", " "),
      count: counts[status] ?? 0,
    }));
}
