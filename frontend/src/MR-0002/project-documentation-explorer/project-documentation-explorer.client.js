/**
 * @file Project Documentation Explorer frontend client-port adapter.
 *
 * @implementsRequirement MR-0002REQ-0002
 * @implementsRequirement MR-0002REQ-0007
 * @implementsRequirement MR-0002REQ-0012
 * @implementsRequirement MR-0002REQ-0026
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @implementsRequirement MR-0002REQ-0037
 * @derivedFromDecision MR-0002/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0003
 * @derivedFromDecision MR-0002/ADR-0006
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @macroRequirement MR-0002
 *
 * This module defines the frontend client boundary used by React components. The
 * first adapter reads a generated backend view-model snapshot for local UI
 * validation. It does not parse YAML, Markdown, graph registries, Git state or
 * filesystem paths; the snapshot is produced by the governed backend explorer
 * module and has the same normalized shape expected from a future HTTP adapter.
 *
 * Side effects: fetches a static JSON asset from the browser when methods are
 * called. It does not mutate repository files or implement write operations.
 */

/** @typedef {{id: string, label: string, values: Array<{value: string, label?: string, count?: number}>}} DocumentationFilter */
/** @typedef {{id: string, kind: string, title: string, macro_requirement_id?: string, status?: string, implementation_state?: string, acceptance_state?: string}} DocumentationItem */
/** @typedef {{list: {access?: {capabilities?: string[]}, summary: Record<string, unknown>, filters: DocumentationFilter[], items: DocumentationItem[]}, details_by_id: Record<string, Record<string, unknown>>}} DocumentationSnapshot */

/**
 * Load and validate the generated snapshot envelope.
 *
 * @param {string} snapshotUrl - URL served by the local frontend preview server.
 * @returns {Promise<DocumentationSnapshot>} Normalized snapshot envelope.
 */
async function loadSnapshot(snapshotUrl) {
  const response = await fetch(snapshotUrl, { headers: { Accept: "application/json" } });
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
 * @param {{snapshotUrl: string}} options - Client options.
 * @returns {{loadDocumentation: Function, loadDocumentationEntity: Function}} Frontend client port.
 */
export function createStaticProjectDocumentationExplorerClient({ snapshotUrl }) {
  let snapshotPromise;

  return Object.freeze({
    async loadDocumentation() {
      snapshotPromise ??= loadSnapshot(snapshotUrl);
      const snapshot = await snapshotPromise;
      return snapshot.list;
    },

    async loadDocumentationEntity(id) {
      snapshotPromise ??= loadSnapshot(snapshotUrl);
      const snapshot = await snapshotPromise;
      const detail = snapshot.details_by_id[id];
      if (!detail) throw new Error(`Unknown documentation entity: ${id}`);
      return detail;
    },
  });
}
