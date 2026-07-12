/**
 * @file Project Documentation Explorer frontend state helpers.
 *
 * @implementsRequirement MR-0002REQ-0008
 * @implementsRequirement MR-0002REQ-0026
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @derivedFromDecision MR-0002/ADR-0002
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0008
 * @macroRequirement MR-0002
 *
 * State helpers operate only on normalized frontend view-model records. They do
 * not read project-model source files or derive raw graph semantics. The `mr`
 * filter is mapped to `macro_requirement_id` because that is the normalized
 * collection field emitted by the backend contract.
 *
 * Side effects: none. All functions are deterministic and return derived values.
 */
const filterFieldById = Object.freeze({
  mr: "macro_requirement_id",
  kind: "kind",
  status: "status",
  requirement_type: "requirement_type",
  implementation_state: "implementation_state",
  acceptance_state: "acceptance_state",
});

/**
 * Apply frontend view-state filters to normalized documentation items.
 *
 * @param {Array<Record<string, unknown>>} items - Normalized documentation items.
 * @param {{q?: string, filters?: Record<string, string>}} state - UI state.
 * @returns {Array<Record<string, unknown>>} Filtered items.
 */
export function filterDocumentationItems(items, state) {
  const search = String(state.q ?? "").trim().toLowerCase();
  const filters = state.filters ?? {};

  return items.filter((item) => {
    const searchable = [item.id, item.title, item.macro_requirement_id, item.status, item.requirement_type, item.implementation_state, item.acceptance_state]
      .map((value) => String(value ?? "").toLowerCase())
      .join(" ");

    if (search && !searchable.includes(search)) return false;

    return Object.entries(filters).every(([key, value]) => {
      const field = filterFieldById[key] ?? key;
      return !value || String(item[field] ?? "") === value;
    });
  });
}

/**
 * Count items by entity kind for the current filtered view.
 *
 * @param {Array<Record<string, unknown>>} items - Filtered items.
 * @returns {Record<string, number>} Counts by kind.
 */
export function countItemsByKind(items) {
  return items.reduce((counts, item) => {
    const key = String(item.kind ?? "unknown");
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
