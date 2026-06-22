import {
  acceptanceStateSchema,
  documentationDetailViewModelSchema,
  documentationExplorerViewModelSchema,
  documentationFiltersViewModelSchema,
  documentationQuerySchema,
  implementationStateSchema,
  projectDocumentationExplorerCapabilities,
} from "./project-documentation-explorer.contract.mjs";

/**
 * @file Read service for the Project Documentation Explorer filtered view-model.
 *
 * @implementsRequirement MR-0002REQ-0028
 * @implementsRequirement MR-0002REQ-0030
 * @implementsRequirement MR-0002REQ-0031
 * @implementsRequirement MR-0002REQ-0033
 * @implementsRequirement MR-0002REQ-0034
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @implementsRequirement MR-0002REQ-0037
 * @derivedFromDecision MR-0002/ADR-0007
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @macroRequirement MR-0002
 *
 * This service normalizes governed documentation, ADR, requirement, macro
 * requirement, taxonomy and graph records into frontend-safe read-only view-models.
 * It derives filter facets and high-level implementation/acceptance states from
 * governed registry fields and graph `implemented_by` relations, rather than
 * forcing the frontend to parse project-model sources or hardcode allowed values.
 *
 * Side effects: reads source snapshots through ProjectModelSourcePort only. It
 * does not read the filesystem directly, mutate project-model files, expose HTTP
 * routes, implement authentication sessions, perform Git operations, or implement
 * Base Analysis runtime/storage.
 */

const acceptedStatuses = new Set(["accepted", "approved", "active"]);
const notAcceptedStatuses = new Set(["proposed", "draft", "rejected", "deprecated", "superseded"]);

/**
 * Converts path separators to stable forward slashes.
 *
 * @param {string|null|undefined} value - Path-like value.
 * @returns {string} Normalized path string.
 */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Splits request query values into stable arrays.
 *
 * @param {unknown} value - Query value, array or comma-separated string.
 * @returns {string[]} Normalized non-empty values.
 */
function toValueArray(value) {
  if (Array.isArray(value)) return value.flatMap((entry) => toValueArray(entry));
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Normalizes incoming filter parameters before Zod validation.
 *
 * @param {Record<string, unknown>} [query] - Raw query object.
 * @returns {Record<string, unknown>} Normalized query.
 */
export function normalizeDocumentationQuery(query = {}) {
  return documentationQuerySchema.parse({
    mr: toValueArray(query.mr),
    kind: toValueArray(query.kind ?? query.type),
    status: toValueArray(query.status),
    requirement_type: toValueArray(query.requirement_type),
    implementation_state: toValueArray(query.implementation_state),
    acceptance_state: toValueArray(query.acceptance_state),
    q: String(query.q ?? "").trim(),
  });
}

/**
 * Derives a normalized acceptance state from current governed status fields.
 *
 * @param {string|null|undefined} status - Raw lifecycle status.
 * @returns {import("zod").infer<typeof acceptanceStateSchema>} Acceptance state.
 */
function deriveAcceptanceState(status) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (acceptedStatuses.has(normalized)) return "accepted";
  if (notAcceptedStatuses.has(normalized)) return "not_accepted";
  return "unknown";
}

/**
 * Derives a requirement implementation state from graph relations.
 *
 * @param {string} itemKind - Normalized entity kind.
 * @param {string} entityId - Governed entity id.
 * @param {Map<string, Set<string>>} implementedBy - Requirement to implementation artifact map.
 * @returns {import("zod").infer<typeof implementationStateSchema>} Implementation state.
 */
function deriveImplementationState(itemKind, entityId, implementedBy) {
  if (itemKind !== "requirement") return "not_applicable";
  const implementations = implementedBy.get(entityId) ?? new Set();
  return implementations.size > 0 ? "implemented" : "not_implemented";
}

/**
 * Builds a requirement id to implementation artifact map from graph relations.
 *
 * @param {Array<Record<string, unknown>>} graphRelations - SPO graph relations.
 * @returns {Map<string, Set<string>>} Requirement implementation map.
 */
function buildImplementedByIndex(graphRelations) {
  const index = new Map();
  for (const relation of graphRelations) {
    if (relation?.predicate !== "implemented_by") continue;
    const requirementId = String(relation.subject ?? "");
    const artifactId = String(relation.object ?? "");
    if (!requirementId || !artifactId) continue;
    if (!index.has(requirementId)) index.set(requirementId, new Set());
    index.get(requirementId).add(artifactId);
  }
  return index;
}

/**
 * Creates a source reference when a path exists.
 *
 * @param {string} kind - Source kind.
 * @param {string|null|undefined} sourcePath - Repository-relative source path.
 * @returns {Array<Record<string, string>>} Source reference array.
 */
function sourceReference(kind, sourcePath) {
  const normalized = normalizeProjectPath(sourcePath);
  return normalized ? [{ kind, path: normalized }] : [];
}

/**
 * Normalizes source snapshot records into documentation explorer items.
 *
 * @param {Record<string, unknown>} snapshot - Source snapshot.
 * @returns {Array<Record<string, unknown>>} Normalized documentation items.
 */
function buildDocumentationItems(snapshot) {
  const implementedBy = buildImplementedByIndex(snapshot.graphRelations ?? []);

  const macroItems = (snapshot.macroRequirements ?? []).map((entry) => {
    const id = String(entry.id ?? "");
    return {
      id,
      kind: "macro_requirement",
      title: String(entry.name ?? entry.title ?? id),
      macro_requirement_id: id,
      status: String(entry.status ?? "unknown"),
      implementation_state: "not_applicable",
      acceptance_state: deriveAcceptanceState(entry.status),
      related_requirement_ids: [],
      related_adr_ids: [],
      source_references: [
        ...sourceReference("registry", entry.source_path),
        ...sourceReference("body", entry.body_path),
      ],
    };
  });

  const requirementItems = (snapshot.requirements ?? []).map((entry) => {
    const id = String(entry.id ?? "");
    const macroRequirementId = String(entry.macro_requirement_id ?? "");
    const relatedAdrId = entry.derived_from_decision_id ? `${macroRequirementId}/${entry.derived_from_decision_id}` : "";
    return {
      id,
      kind: "requirement",
      title: String(entry.title ?? id),
      macro_requirement_id: macroRequirementId,
      status: String(entry.status ?? "unknown"),
      requirement_type: String(entry.type ?? "unknown"),
      priority: String(entry.priority ?? "unknown"),
      implementation_state: deriveImplementationState("requirement", id, implementedBy),
      acceptance_state: deriveAcceptanceState(entry.status),
      related_requirement_ids: entry.parent_requirement_id ? [String(entry.parent_requirement_id)] : [],
      related_adr_ids: relatedAdrId ? [relatedAdrId] : [],
      source_references: [
        ...sourceReference("registry", entry.source_path),
        ...sourceReference("body", entry.body_path),
      ],
    };
  });

  const decisionItems = (snapshot.decisions ?? []).map((entry) => {
    const id = String(entry.id ?? "");
    return {
      id,
      local_id: String(entry.local_id ?? ""),
      kind: "adr",
      title: String(entry.title ?? id),
      macro_requirement_id: String(entry.macro_requirement_id ?? ""),
      status: String(entry.status ?? "unknown"),
      decision_type: String(entry.decision_type ?? "unknown"),
      implementation_state: "not_applicable",
      acceptance_state: deriveAcceptanceState(entry.status),
      related_requirement_ids: [],
      related_adr_ids: [],
      source_references: [
        ...sourceReference("registry", entry.source_path),
        ...sourceReference("body", entry.body_path),
      ],
    };
  });

  const taxonomyItems = (snapshot.taxonomies ?? []).map((entry) => ({
    id: String(entry.id ?? ""),
    kind: "taxonomy",
    title: String(entry.title ?? entry.id ?? "taxonomy"),
    status: "active",
    implementation_state: "not_applicable",
    acceptance_state: "accepted",
    related_requirement_ids: [],
    related_adr_ids: [],
    source_references: sourceReference("taxonomy", entry.source_path),
  }));

  return [...macroItems, ...requirementItems, ...decisionItems, ...taxonomyItems].filter((item) => item.id);
}

/**
 * Tests whether an item matches the normalized query.
 *
 * @param {Record<string, unknown>} item - Documentation item.
 * @param {Record<string, unknown>} query - Normalized query.
 * @returns {boolean} True when the item matches.
 */
function matchesQuery(item, query) {
  const filters = [
    [query.mr, item.macro_requirement_id],
    [query.kind, item.kind],
    [query.status, item.status],
    [query.requirement_type, item.requirement_type],
    [query.implementation_state, item.implementation_state],
    [query.acceptance_state, item.acceptance_state],
  ];

  for (const [values, itemValue] of filters) {
    if (values.length > 0 && !values.includes(String(itemValue ?? ""))) return false;
  }

  const textQuery = String(query.q ?? "").toLowerCase();
  if (!textQuery) return true;
  return [item.id, item.title, item.status, item.requirement_type, item.decision_type, item.macro_requirement_id]
    .map((value) => String(value ?? "").toLowerCase())
    .some((value) => value.includes(textQuery));
}

/**
 * Builds counts for each entity kind.
 *
 * @param {Array<Record<string, unknown>>} items - Documentation items.
 * @returns {Record<string, number>} Counts by kind.
 */
function countByKind(items) {
  return items.reduce((accumulator, item) => {
    const kind = String(item.kind ?? "unknown");
    accumulator[kind] = (accumulator[kind] ?? 0) + 1;
    return accumulator;
  }, {});
}

/**
 * Adds a counted value to a facet accumulator.
 *
 * @param {Map<string, number>} map - Value-count map.
 * @param {unknown} value - Candidate value.
 * @returns {void}
 */
function addFacetValue(map, value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

/**
 * Builds a sorted filter facet from current item values.
 *
 * @param {object} input - Facet input.
 * @param {string} input.id - Facet id.
 * @param {string} input.label - Facet label.
 * @param {string} input.source - Facet source.
 * @param {Map<string, number>} input.values - Value counts.
 * @param {Array<string>} input.selectedValues - Selected values.
 * @returns {Record<string, unknown>} Filter facet.
 */
function buildFacet({ id, label, source, values, selectedValues }) {
  const selected = new Set(selectedValues);
  return {
    id,
    label,
    source,
    values: [...values.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, count]) => ({
        value,
        label: value,
        count,
        selected: selected.has(value),
      })),
  };
}

/**
 * Builds filter facets from available items rather than hardcoded frontend values.
 *
 * @param {Array<Record<string, unknown>>} items - Documentation items.
 * @param {Record<string, unknown>} query - Normalized query.
 * @returns {Array<Record<string, unknown>>} Filter facets.
 */
function buildFilterFacets(items, query) {
  const facets = {
    mr: new Map(),
    kind: new Map(),
    status: new Map(),
    requirement_type: new Map(),
    implementation_state: new Map(),
    acceptance_state: new Map(),
  };

  for (const item of items) {
    addFacetValue(facets.mr, item.macro_requirement_id);
    addFacetValue(facets.kind, item.kind);
    addFacetValue(facets.status, item.status);
    addFacetValue(facets.requirement_type, item.requirement_type);
    addFacetValue(facets.implementation_state, item.implementation_state);
    addFacetValue(facets.acceptance_state, item.acceptance_state);
  }

  return [
    buildFacet({ id: "mr", label: "Macro requirement", source: "registry", values: facets.mr, selectedValues: query.mr }),
    buildFacet({ id: "kind", label: "Entity kind", source: "registry", values: facets.kind, selectedValues: query.kind }),
    buildFacet({ id: "status", label: "Status", source: "registry", values: facets.status, selectedValues: query.status }),
    buildFacet({
      id: "requirement_type",
      label: "Requirement type",
      source: "registry",
      values: facets.requirement_type,
      selectedValues: query.requirement_type,
    }),
    buildFacet({
      id: "implementation_state",
      label: "Implementation state",
      source: "graph",
      values: facets.implementation_state,
      selectedValues: query.implementation_state,
    }),
    buildFacet({
      id: "acceptance_state",
      label: "Acceptance state",
      source: "derived",
      values: facets.acceptance_state,
      selectedValues: query.acceptance_state,
    }),
  ];
}

/**
 * Finds the governed Markdown body source reference for a documentation item.
 *
 * @param {Record<string, unknown>} item - Documentation item.
 * @returns {string} Repository-relative body path, or an empty string.
 */
function getBodyPath(item) {
  const reference = (item.source_references ?? []).find((candidate) => candidate.kind === "body" && candidate.path);
  return normalizeProjectPath(reference?.path);
}

/**
 * Loads the governed Markdown body through the source port when a body path exists.
 *
 * @param {Record<string, unknown>} item - Documentation item.
 * @param {{loadBodyContent?: (projectPath: string) => Promise<string|null>}} sourcePort - Source port.
 * @returns {Promise<Record<string, unknown>|null>} Body view-model.
 */
async function loadBodyViewModel(item, sourcePort) {
  const bodyPath = getBodyPath(item);
  if (!bodyPath) return null;

  if (typeof sourcePort.loadBodyContent !== "function") {
    return {
      format: "markdown",
      path: bodyPath,
      content_markdown: "",
      available: false,
      missing_reason: "source_port_body_loader_not_configured",
    };
  }

  const content = await sourcePort.loadBodyContent(bodyPath);
  if (content === null) {
    return {
      format: "markdown",
      path: bodyPath,
      content_markdown: "",
      available: false,
      missing_reason: "body_file_not_found",
    };
  }

  return {
    format: "markdown",
    path: bodyPath,
    content_markdown: content,
    available: true,
  };
}

/**
 * Creates the read-only documentation explorer service.
 *
 * @param {{sourcePort: {loadSnapshot(): Promise<Record<string, unknown>>}}} input - Service dependencies.
 * @returns {{getDocumentation(input?: {query?: Record<string, unknown>, access?: Record<string, unknown>}): Promise<Record<string, unknown>>, getFilters(input?: {query?: Record<string, unknown>, access?: Record<string, unknown>}): Promise<Record<string, unknown>>, getDetail(input: {id: string, access?: Record<string, unknown>}): Promise<Record<string, unknown>>}} Service API.
 */
export function createProjectDocumentationExplorerService({ sourcePort }) {
  if (!sourcePort || typeof sourcePort.loadSnapshot !== "function") {
    throw new TypeError("ProjectDocumentationExplorerService requires a ProjectModelSourcePort.");
  }

  async function buildModel({ query: rawQuery = {}, access } = {}) {
    const query = normalizeDocumentationQuery(rawQuery);
    const snapshot = await sourcePort.loadSnapshot();
    const items = buildDocumentationItems(snapshot);
    const filteredItems = items.filter((item) => matchesQuery(item, query));

    return {
      access: access ?? {
        authenticated: false,
        allowed: false,
        required_capability: projectDocumentationExplorerCapabilities.read,
        capabilities: [],
      },
      query,
      summary: {
        total_items: items.length,
        filtered_items: filteredItems.length,
        counts_by_kind: countByKind(filteredItems),
      },
      filters: buildFilterFacets(items, query),
      items: filteredItems,
    };
  }

  return Object.freeze({
    async getDocumentation(input = {}) {
      return documentationExplorerViewModelSchema.parse(await buildModel(input));
    },

    async getFilters(input = {}) {
      const model = await buildModel(input);
      return documentationFiltersViewModelSchema.parse({
        access: model.access,
        query: model.query,
        filters: model.filters,
      });
    },

    async getDetail({ id, access } = {}) {
      const snapshot = await sourcePort.loadSnapshot();
      const items = buildDocumentationItems(snapshot);
      const item = items.find((candidate) => candidate.id === id || candidate.local_id === id);
      if (!item) throw new Error(`Project documentation entity not found: ${id}`);

      const incoming = (snapshot.graphRelations ?? []).filter((relation) => relation.object === id);
      const outgoing = (snapshot.graphRelations ?? []).filter((relation) => relation.subject === id);

      return documentationDetailViewModelSchema.parse({
        access: access ?? {
          authenticated: false,
          allowed: false,
          required_capability: projectDocumentationExplorerCapabilities.viewDetail,
          capabilities: [],
        },
        item,
        incoming_relations: incoming,
        outgoing_relations: outgoing,
        body: await loadBodyViewModel(item, sourcePort),
      });
    },
  });
}
