/**
 * @file Frontend state helpers for child project governance gate plan views.
 *
 * @implementsRequirement MR-0003REQ-0059
 * @implementsRequirement MR-0003REQ-0060
 * @implementsRequirement MR-0003REQ-0061
 * @implementsRequirement MR-0003REQ-0062
 * @implementsRequirement MR-0003REQ-0063
 * @derivedFromDecision MR-0003/ADR-0011
 * @macroRequirement MR-0003
 *
 * These helpers derive stable list/detail summaries from generated governance
 * gate plan artifacts and optional study-oriented explanation view models.
 * They are intentionally pure: callers provide already loaded JSON read models,
 * and the helpers filter, count and normalize display values without reading
 * files, fetching APIs, executing gates or mutating project state.
 *
 * Side effects: none.
 */

const knownGateStatuses = Object.freeze(["planned", "pass", "fail", "warning", "not_applicable", "unsupported", "unknown"]);

/**
 * Convert a status id to a readable label.
 *
 * @param {unknown} value - Status value.
 * @returns {string} Display label.
 */
export function formatGovernancePlanLabel(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

/**
 * Build a stable key for a gate plan summary item.
 *
 * @param {Record<string, unknown>} item - Gate plan summary item.
 * @returns {string} Stable key.
 */
export function getGatePlanKey(item) {
  return `${String(item?.profile ?? "")}/${String(item?.target_scope ?? "")}`;
}

/**
 * Return the item result status.
 *
 * @param {Record<string, unknown>} item - Gate plan summary item.
 * @returns {string} Result status.
 */
export function getGatePlanResult(item) {
  return String(item?.result ?? "unknown");
}

/**
 * Build lower-cased search text for one gate plan summary.
 *
 * @param {Record<string, unknown>} item - Gate plan summary item.
 * @returns {string} Search envelope.
 */
function getPlanSearchText(item) {
  return [
    item?.profile,
    item?.target_scope,
    item?.result,
    item?.artifact_path,
  ].map((value) => String(value ?? "").toLowerCase()).join(" ");
}

/**
 * Filter plan summary items for the read-only UI.
 *
 * @param {Array<Record<string, unknown>>} items - Gate plan summaries.
 * @param {{q?: string, result?: string}} state - UI filter state.
 * @returns {Array<Record<string, unknown>>} Filtered items.
 */
export function filterGatePlanSummaries(items, state = {}) {
  const search = String(state.q ?? "").trim().toLowerCase();
  const result = String(state.result ?? "").trim();

  return (items ?? []).filter((item) => {
    if (search && !getPlanSearchText(item).includes(search)) return false;
    if (result && getGatePlanResult(item) !== result) return false;
    return true;
  });
}

/**
 * Count gate plan summary items by result.
 *
 * @param {Array<Record<string, unknown>>} items - Gate plan summaries.
 * @returns {Record<string, number>} Counts by result status.
 */
export function countGatePlansByResult(items) {
  const counts = Object.fromEntries(knownGateStatuses.map((status) => [status, 0]));
  for (const item of items ?? []) {
    const status = getGatePlanResult(item);
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

/**
 * Build result filter options from plan summaries.
 *
 * @param {Array<Record<string, unknown>>} items - Gate plan summaries.
 * @returns {Array<{value: string, label: string, count: number}>} Result options.
 */
export function buildGatePlanResultFilterOptions(items) {
  const counts = countGatePlansByResult(items);
  return knownGateStatuses
    .filter((status) => counts[status] > 0 || status === "unknown")
    .map((status) => ({
      value: status,
      label: formatGovernancePlanLabel(status),
      count: counts[status] ?? 0,
    }));
}

/**
 * Build status filter options from a detailed plan's gates.
 *
 * @param {Array<Record<string, unknown>>} gates - Gate detail rows.
 * @returns {Array<{value: string, label: string, count: number}>} Gate status options.
 */
export function buildGateStatusFilterOptions(gates) {
  const counts = Object.fromEntries(knownGateStatuses.map((status) => [status, 0]));
  for (const gate of gates ?? []) {
    const status = String(gate?.status ?? "unknown");
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return knownGateStatuses
    .filter((status) => counts[status] > 0 || status === "unknown")
    .map((status) => ({
      value: status,
      label: formatGovernancePlanLabel(status),
      count: counts[status] ?? 0,
    }));
}

/**
 * Return a stable array for optional array-like values.
 *
 * @param {unknown} value - Candidate array.
 * @returns {unknown[]} Stable array.
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Return searchable text for one gate explanation view model.
 *
 * @param {Record<string, unknown>|undefined} explanation - Gate explanation.
 * @returns {string[]} Search values.
 */
function getGateExplanationSearchValues(explanation) {
  if (!explanation) return [];
  return [
    explanation.what_it_checks,
    explanation.why_selected,
    explanation.contributes_to_threat_analysis_readiness,
    explanation.status?.label,
    explanation.status?.description,
    explanation.status?.concept,
    explanation.applicability_class?.label,
    explanation.applicability_class?.description,
    explanation.applicability_class?.concept,
    ...(asArray(explanation.required_capabilities).flatMap((capability) => [
      capability.id,
      capability.label,
      capability.description,
      capability.concept,
      capability.why_it_matters,
      capability.state?.id,
      capability.state?.label,
      capability.state?.description,
    ])),
    ...(asArray(explanation.validation_surfaces).flatMap((surface) => [
      surface.id,
      surface.label,
      surface.description,
      surface.concept,
      surface.why_it_matters,
      surface.evidence_kind,
      surface.command,
    ])),
  ];
}

/**
 * Filter detailed gate rows for the read-only UI.
 *
 * @param {Array<Record<string, unknown>>} gates - Gate detail rows.
 * @param {{q?: string, status?: string}} state - UI filter state.
 * @param {Record<string, Record<string, unknown>>} gateExplanationsById - Optional explanation lookup.
 * @returns {Array<Record<string, unknown>>} Filtered gates.
 */
export function filterGovernanceGateRows(gates, state = {}, gateExplanationsById = {}) {
  const search = String(state.q ?? "").trim().toLowerCase();
  const status = String(state.status ?? "").trim();

  return (gates ?? []).filter((gate) => {
    const gateExplanation = gateExplanationsById[String(gate?.id ?? "")];
    const searchText = [
      gate?.id,
      gate?.label,
      gate?.applicability_class,
      gate?.status,
      gate?.severity,
      gate?.reason,
      ...(Array.isArray(gate?.required_capabilities) ? gate.required_capabilities : []),
      ...(Array.isArray(gate?.validation_surfaces) ? gate.validation_surfaces : []),
      ...(Array.isArray(gate?.evidence) ? gate.evidence : []),
      ...getGateExplanationSearchValues(gateExplanation),
    ].map((value) => String(value ?? "").toLowerCase()).join(" ");

    if (search && !searchText.includes(search)) return false;
    if (status && String(gate?.status ?? "unknown") !== status) return false;
    return true;
  });
}

/**
 * Normalize the summary object from a detailed plan.
 *
 * @param {Record<string, unknown>} summary - Raw plan summary.
 * @returns {Array<{status: string, count: number}>} Ordered summary rows.
 */
export function normalizePlanSummary(summary = {}) {
  return knownGateStatuses
    .map((status) => ({ status, count: Number(summary?.[status] ?? 0) }))
    .filter((row) => row.count > 0 || row.status === "unknown");
}
