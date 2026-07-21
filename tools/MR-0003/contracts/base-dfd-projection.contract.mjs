/**
 * @file Base DFD semantic projection contract.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0006GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Defines the renderer-neutral structure, controlled values and deterministic
 * identities shared by the Base DFD projector and validator.
 *
 * The contract contains no BAE parsing, methodology-specific interpretation,
 * diagram layout or rendering behavior.
 */

export const BASE_DFD_PROJECTION_CONTRACT_ID =
  "base-dfd-semantic-projection-contract";

export const BASE_DFD_PROJECTION_SCHEMA_VERSION = 1;

export const BASE_DFD_COLLECTION_NAMES = Object.freeze([
  "nodes",
  "flows",
  "boundaries",
  "unprojected_baes",
]);

export const BASE_DFD_REQUIRED_TOP_LEVEL_MEMBERS = Object.freeze([
  "schema_version",
  "projection_id",
  "source",
  ...BASE_DFD_COLLECTION_NAMES,
]);

export const BASE_DFD_ELEMENT_KINDS = Object.freeze({
  NODE: "node",
  FLOW: "flow",
  BOUNDARY: "boundary",
});

export const BASE_DFD_NODE_ROLES = Object.freeze({
  EXTERNAL_ENTITY: "external_entity",
  PROCESS: "process",
  DATA_STORE: "data_store",
});

export const BASE_DFD_UNPROJECTED_REASONS = Object.freeze({
  NO_DETERMINISTIC_DFD_ROLE: "no_deterministic_dfd_role",
});

export const BASE_DFD_ELEMENT_ID_PREFIXES = Object.freeze({
  [BASE_DFD_ELEMENT_KINDS.NODE]: "DFD-NODE-",
  [BASE_DFD_ELEMENT_KINDS.FLOW]: "DFD-FLOW-",
  [BASE_DFD_ELEMENT_KINDS.BOUNDARY]: "DFD-BOUNDARY-",
});

export const BASE_DFD_REQUIRED_RECORD_MEMBERS = Object.freeze({
  source: Object.freeze([
    "registry_id",
    "registry_path",
  ]),
  node: Object.freeze([
    "id",
    "role",
    "title",
    "contributing_bae_ids",
    "contributing_relation_ids",
  ]),
  flow: Object.freeze([
    "id",
    "title",
    "source_node_id",
    "target_node_id",
    "crossed_boundary_ids",
    "contributing_bae_ids",
    "contributing_relation_ids",
  ]),
  boundary: Object.freeze([
    "id",
    "title",
    "contributing_bae_ids",
    "contributing_relation_ids",
  ]),
  unprojected_bae: Object.freeze([
    "bae_id",
    "title",
    "reason",
  ]),
});

export const BASE_DFD_FORBIDDEN_RENDERER_MEMBERS = Object.freeze([
  "x",
  "y",
  "width",
  "height",
  "position",
  "coordinates",
  "layout",
  "style",
  "styles",
  "color",
  "fill",
  "stroke",
  "class",
  "className",
  "html",
  "svg",
]);

/**
 * Requires one non-empty single-line string.
 *
 * @param {unknown} value - Candidate value.
 * @param {string} label - Diagnostic label.
 * @returns {string} Normalized string.
 */
function requireSingleLine(value, label) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  if (/\r|\n/u.test(normalized)) {
    throw new Error(`${label} must be a single-line string.`);
  }

  return normalized;
}

/**
 * Creates the stable identity of one Base DFD projection.
 *
 * The identity is derived exclusively from the canonical source registry
 * identity and therefore remains independent from renderer or file location.
 *
 * @param {string} registryId - Canonical BAE registry identity.
 * @returns {string} Stable projection identity.
 */
export function createBaseDfdProjectionId(registryId) {
  return `BASE-DFD-${requireSingleLine(registryId, "registryId")}`;
}

/**
 * Creates the stable identity of one projected DFD element.
 *
 * @param {"node"|"flow"|"boundary"} kind - Controlled projected element kind.
 * @param {string} baeId - Canonical contributing BAE identity.
 * @returns {string} Stable projected element identity.
 */
export function createBaseDfdElementId(kind, baeId) {
  const prefix = BASE_DFD_ELEMENT_ID_PREFIXES[kind];

  if (!prefix) {
    throw new Error(
      `Unsupported Base DFD element kind: ${String(kind ?? "")}.`,
    );
  }

  return `${prefix}${requireSingleLine(baeId, "baeId")}`;
}

/**
 * Creates an empty renderer-neutral Base DFD semantic projection.
 *
 * The returned collections are intentionally mutable so the deterministic
 * projector can populate and sort them before validation.
 *
 * @param {{registryId: string, registryPath: string}} source
 *   Canonical BAE registry source.
 * @returns {{
 *   schema_version: number,
 *   projection_id: string,
 *   source: {registry_id: string, registry_path: string},
 *   nodes: object[],
 *   flows: object[],
 *   boundaries: object[],
 *   unprojected_baes: object[]
 * }} Empty semantic projection.
 */
export function createEmptyBaseDfdProjection(source) {
  const registryId = requireSingleLine(source?.registryId, "source.registryId");
  const registryPath = requireSingleLine(
    source?.registryPath,
    "source.registryPath",
  );

  return {
    schema_version: BASE_DFD_PROJECTION_SCHEMA_VERSION,
    projection_id: createBaseDfdProjectionId(registryId),
    source: {
      registry_id: registryId,
      registry_path: registryPath,
    },
    nodes: [],
    flows: [],
    boundaries: [],
    unprojected_baes: [],
  };
}

export const BASE_DFD_PROJECTION_CONTRACT = Object.freeze({
  id: BASE_DFD_PROJECTION_CONTRACT_ID,
  schema_version: BASE_DFD_PROJECTION_SCHEMA_VERSION,
  required_top_level_members: BASE_DFD_REQUIRED_TOP_LEVEL_MEMBERS,
  collection_names: BASE_DFD_COLLECTION_NAMES,
  element_kinds: BASE_DFD_ELEMENT_KINDS,
  node_roles: BASE_DFD_NODE_ROLES,
  unprojected_reasons: BASE_DFD_UNPROJECTED_REASONS,
  element_id_prefixes: BASE_DFD_ELEMENT_ID_PREFIXES,
  required_record_members: BASE_DFD_REQUIRED_RECORD_MEMBERS,
  forbidden_renderer_members: BASE_DFD_FORBIDDEN_RENDERER_MEMBERS,
});