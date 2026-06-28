import {
  acceptanceStateSchema,
  documentationDetailViewModelSchema,
  documentationExplorerViewModelSchema,
  documentationFiltersViewModelSchema,
  documentationQuerySchema,
  implementationStateSchema,
  projectDocumentationExplorerCapabilities,
} from "./project-documentation-explorer.contract.mjs";
import {
  ProjectDocumentationExplorerInvalidRequestError,
  ProjectDocumentationExplorerNotFoundError,
} from "./project-documentation-explorer.errors.mjs";

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
 * @implementsRequirement MR-0002REQ-0050
 * @implementsRequirement MR-0002REQ-0054
 * @implementsRequirement MR-0002REQ-0055
 * @implementsRequirement MR-0002REQ-0056
 * @derivedFromDecision MR-0002/ADR-0007
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0017
 * @derivedFromDecision MR-0002/ADR-0021
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

/**
 * @typedef {{mr: string[], kind: string[], status: string[], requirement_type: string[], implementation_state: string[], acceptance_state: string[], q: string}} DocumentationQuery
 * @typedef {{kind: string, path?: string, id?: string}} SourceReference
 * @typedef {Record<string, unknown> & {id: string, local_id?: string, kind: string, title: string, macro_requirement_id?: string, status?: string, requirement_type?: string, decision_type?: string, priority?: string, taxonomy_group_id?: string, taxonomy_value_count?: number, implementation_state: string, acceptance_state: string, related_requirement_ids: string[], related_adr_ids: string[], source_references: SourceReference[]}} DocumentationItem
 * @typedef {{format: "markdown", path: string, content_markdown: string, available: boolean, missing_reason?: string}} DocumentationBodyViewModel
 * @typedef {import("./project-model-source.port.mjs").ProjectModelSourcePort} ProjectModelSourcePort
 * @typedef {import("./project-model-source.port.mjs").ProjectModelSourceSnapshot} ProjectModelSourceSnapshot
 */

const acceptedStatuses = new Set(["accepted", "approved", "active"]);
const notAcceptedStatuses = new Set(["proposed", "draft", "rejected", "deprecated", "superseded"]);

/**
 * Converts path separators to stable forward slashes.
 *
 * @param {unknown} value - Path-like value.
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
 * @returns {DocumentationQuery} Normalized query.
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
 * @param {unknown} status - Raw lifecycle status.
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
  /** @type {Map<string, Set<string>>} */
  const index = new Map();
  for (const relation of graphRelations) {
    if (relation?.predicate !== "implemented_by") continue;
    const requirementId = String(relation.subject ?? "");
    const artifactId = String(relation.object ?? "");
    if (!requirementId || !artifactId) continue;
    if (!index.has(requirementId)) index.set(requirementId, new Set());
    const bucket = index.get(requirementId);
    if (bucket) bucket.add(artifactId);
  }
  return index;
}

/**
 * Creates a source reference when a path exists.
 *
 * @param {string} kind - Source kind.
 * @param {unknown} sourcePath - Repository-relative source path.
 * @returns {SourceReference[]} Source reference array.
 */
function sourceReference(kind, sourcePath) {
  const normalized = normalizeProjectPath(sourcePath);
  return normalized ? [{ kind, path: normalized }] : [];
}


/**
 * Creates a safe string array from unknown values.
 *
 * @param {unknown} value - Candidate scalar or array.
 * @returns {string[]} Normalized strings.
 */
function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
}

/**
 * Builds a readable label from a governed id when no explicit label exists.
 *
 * @param {unknown} value - Governed id or label value.
 * @returns {string} Human-readable fallback label.
 */
function toDisplayLabel(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown";
  return raw
    .replaceAll("_", " ")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

/**
 * Normalizes a taxonomy value registry record for UI-safe explanations.
 *
 * @param {Record<string, unknown>} value - Raw taxonomy value record.
 * @returns {Record<string, unknown>} Normalized taxonomy value explanation.
 */
function normalizeTaxonomyValueExplanation(value) {
  const id = String(value.id ?? "").trim();
  const label = String(value.label ?? value.name ?? toDisplayLabel(id)).trim();
  const explanation = {
    id,
    label: label || id,
  };

  const description = String(value.description ?? "").trim();
  if (description) explanation.description = description;

  const valueFunction = String(value.function ?? "").trim();
  if (valueFunction) explanation.function = valueFunction;

  if (value.ui && typeof value.ui === "object" && !Array.isArray(value.ui)) explanation.ui = value.ui;
  if (value.security_analysis && typeof value.security_analysis === "object" && !Array.isArray(value.security_analysis)) {
    explanation.security_analysis = value.security_analysis;
  }

  return explanation;
}

/**
 * Builds a taxonomy group index by taxonomy id.
 *
 * @param {Array<Record<string, unknown>>} taxonomies - Snapshot taxonomy groups.
 * @returns {Map<string, Record<string, unknown>>} Taxonomy group map.
 */
function buildTaxonomyIndex(taxonomies) {
  const index = new Map();
  for (const taxonomy of taxonomies ?? []) {
    const id = String(taxonomy.id ?? "").trim();
    if (id) index.set(id, taxonomy);
  }
  return index;
}

/**
 * Builds a taxonomy detail view-model for taxonomy documentation entities.
 *
 * @param {DocumentationItem} item - Selected documentation item.
 * @param {Map<string, Record<string, unknown>>} taxonomyIndex - Taxonomy group index.
 * @returns {Record<string, unknown>|null} Taxonomy detail payload or null.
 */
function buildTaxonomyDetail(item, taxonomyIndex) {
  if (item.kind !== "taxonomy") return null;
  const taxonomyId = String(item.taxonomy_group_id ?? item.id ?? "").trim();
  const taxonomy = taxonomyIndex.get(taxonomyId);
  if (!taxonomy) return null;

  const values = Array.isArray(taxonomy.values)
    ? taxonomy.values
        .filter((value) => value && typeof value === "object" && !Array.isArray(value))
        .map((value) => normalizeTaxonomyValueExplanation(/** @type {Record<string, unknown>} */ (value)))
        .filter((value) => value.id)
    : [];

  return {
    id: taxonomyId,
    title: String(taxonomy.title ?? toDisplayLabel(taxonomyId)),
    source_path: normalizeProjectPath(taxonomy.source_path),
    value_count: values.length,
    values,
  };
}

/**
 * Normalizes source snapshot records into documentation explorer items.
 *
 * @param {ProjectModelSourceSnapshot} snapshot - Source snapshot.
 * @returns {DocumentationItem[]} Normalized documentation items.
 */
function buildDocumentationItems(snapshot) {
  const implementedBy = buildImplementedByIndex(snapshot.graphRelations ?? []);

  const macroItems = (snapshot.macroRequirements ?? []).map((entry) => {
    const id = String(entry.id ?? "");
    return ({
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
    });
  });

  const requirementItems = (snapshot.requirements ?? []).map((entry) => {
    const id = String(entry.id ?? "");
    const macroRequirementId = String(entry.macro_requirement_id ?? "");
    const relatedAdrId = entry.derived_from_decision_id ? `${macroRequirementId}/${entry.derived_from_decision_id}` : "";
    return ({
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
    });
  });

  const decisionItems = (snapshot.decisions ?? []).map((entry) => {
    const id = String(entry.id ?? "");
    return ({
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
    });
  });

  const taxonomyItems = (snapshot.taxonomies ?? []).map((entry) => ({
    id: String(entry.id ?? ""),
    kind: "taxonomy",
    title: String(entry.title ?? entry.id ?? "taxonomy"),
    taxonomy_group_id: String(entry.id ?? ""),
    taxonomy_value_count: Array.isArray(entry.values) ? entry.values.length : 0,
    status: "active",
    implementation_state: "not_applicable",
    acceptance_state: "accepted",
    related_requirement_ids: [],
    related_adr_ids: [],
    source_references: sourceReference("taxonomy", entry.source_path),
  }));

  return /** @type {DocumentationItem[]} */ (/** @type {unknown} */ ([...macroItems, ...requirementItems, ...decisionItems, ...taxonomyItems].filter((item) => item.id)));
}

/**
 * Tests whether an item matches the normalized query.
 *
 * @param {DocumentationItem} item - Documentation item.
 * @param {DocumentationQuery} query - Normalized query.
 * @returns {boolean} True when the item matches.
 */
function matchesQuery(item, query) {
  /** @type {Array<[string[], unknown]>} */
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
  return [
    item.id,
    item.title,
    item.status,
    item.requirement_type,
    item.decision_type,
    item.macro_requirement_id,
    item.taxonomy_group_id,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .some((value) => value.includes(textQuery));
}

/**
 * Builds counts for each entity kind.
 *
 * @param {DocumentationItem[]} items - Documentation items.
 * @returns {Record<string, number>} Counts by kind.
 */
function countByKind(items) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const item of items) {
    const kind = String(item.kind ?? "unknown");
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  return counts;
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
 * @param {DocumentationItem[]} items - Documentation items.
 * @param {DocumentationQuery} query - Normalized query.
 * @returns {Array<Record<string, unknown>>} Filter facets.
 */
function buildFilterFacets(items, query) {
  /** @type {Record<"mr"|"kind"|"status"|"requirement_type"|"implementation_state"|"acceptance_state", Map<string, number>>} */
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
 * @param {DocumentationItem} item - Documentation item.
 * @returns {string} Repository-relative body path, or an empty string.
 */
function getBodyPath(item) {
  const reference = item.source_references.find((candidate) => candidate.kind === "body" && candidate.path);
  return normalizeProjectPath(reference?.path);
}

/**
 * Loads the governed Markdown body through the source port when a body path exists.
 *
 * @param {DocumentationItem} item - Documentation item.
 * @param {ProjectModelSourcePort} sourcePort - Source port.
 * @returns {Promise<DocumentationBodyViewModel|null>} Body view-model.
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
 * @param {{sourcePort: ProjectModelSourcePort}} input - Service dependencies.
 * @returns {{getDocumentation(input?: {query?: Record<string, unknown>, access?: Record<string, unknown>}): Promise<Record<string, unknown>>, getFilters(input?: {query?: Record<string, unknown>, access?: Record<string, unknown>}): Promise<Record<string, unknown>>, getDetail(input?: {id?: string, access?: Record<string, unknown>}): Promise<Record<string, unknown>>}} Service API.
 */
export function createProjectDocumentationExplorerService({ sourcePort }) {
  if (!sourcePort || typeof sourcePort.loadSnapshot !== "function") {
    throw new TypeError("ProjectDocumentationExplorerService requires a ProjectModelSourcePort.");
  }

  /**
   * Builds the collection view-model before schema validation.
   *
   * @param {{query?: Record<string, unknown>, access?: Record<string, unknown>}} [input] - Collection input.
   * @returns {Promise<Record<string, unknown>>} Unvalidated collection view-model.
   */
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
      const normalizedId = String(id ?? "").trim();
      if (!normalizedId) {
        throw new ProjectDocumentationExplorerInvalidRequestError("Project documentation entity id is required.");
      }

      const snapshot = await sourcePort.loadSnapshot();
      const items = buildDocumentationItems(snapshot);
      const item = items.find((candidate) => candidate.id === normalizedId || candidate.local_id === normalizedId);
      if (!item) throw new ProjectDocumentationExplorerNotFoundError(`Project documentation entity not found: ${normalizedId}`);

      const incoming = snapshot.graphRelations.filter((relation) => relation.object === normalizedId);
      const outgoing = snapshot.graphRelations.filter((relation) => relation.subject === normalizedId);
      const taxonomyIndex = buildTaxonomyIndex(snapshot.taxonomies ?? []);

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
        taxonomy: buildTaxonomyDetail(item, taxonomyIndex),
      });
    },
  });
}
