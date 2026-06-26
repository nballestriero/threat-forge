/**
 * @file Source port contract for read-only Project Documentation Explorer data access.
 *
 * @implementsRequirement MR-0002REQ-0007
 * @implementsRequirement MR-0002REQ-0011
 * @implementsRequirement MR-0002REQ-0028
 * @implementsRequirement MR-0002REQ-0030
 * @implementsRequirement MR-0002REQ-0031
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @implementsRequirement MR-0002REQ-0037
 * @implementsRequirement MR-0002REQ-0054
 * @derivedFromDecision MR-0002/ADR-0002
 * @derivedFromDecision MR-0002/ADR-0003
 * @derivedFromDecision MR-0002/ADR-0007
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0021
 * @macroRequirement MR-0002
 *
 * The Project Model source port isolates the read service from concrete YAML,
 * Markdown, graph, registry, filesystem and future database adapters. Backend
 * services consume this port and return normalized view-models; controllers and
 * React components must not instantiate or read concrete source adapters directly.
 *
 * Side effects: none. This module only declares the expected source-port shape
 * and a fail-closed null implementation for composition validation. It does not
 * read project files, mutate repository data, create HTTP routes, implement auth,
 * or perform Base Analysis storage.
 */

/**
 * @typedef {object} ProjectModelSourceSnapshot
 * @property {Array<Record<string, unknown>>} macroRequirements Macro-requirement registry records.
 * @property {Array<Record<string, unknown>>} requirements Requirement registry records enriched with macro scope.
 * @property {Array<Record<string, unknown>>} decisions ADR registry records enriched with macro scope.
 * @property {Array<Record<string, unknown>>} taxonomies Taxonomy groups and values.
 * @property {Array<Record<string, unknown>>} graphNodes Project-model graph nodes.
 * @property {Array<Record<string, unknown>>} graphRelations Project-model SPO relations.
 */

/**
 * @typedef {object} ProjectModelSourcePort
 * @property {() => Promise<ProjectModelSourceSnapshot>} loadSnapshot Loads a read-only project-model source snapshot.
 * @property {(projectPath: string) => Promise<string|null>} loadBodyContent Loads governed Markdown body content by repository-relative body path.
 */

/**
 * Creates a fail-closed source port for tests and incomplete composition roots.
 *
 * @returns {ProjectModelSourcePort} Source port that rejects every read call.
 */
export function createUnsupportedProjectModelSourcePort() {
  return Object.freeze({
    async loadSnapshot() {
      throw new Error("ProjectModelSourcePort is not configured.");
    },
    async loadBodyContent() {
      throw new Error("ProjectModelSourcePort is not configured.");
    },
  });
}
