/**
 * @file Source-port decorator for Project Documentation Explorer snapshot caching.
 *
 * @implementsRequirement MR-0002REQ-0052
 * @derivedFromDecision MR-0002/ADR-0019
 * @macroRequirement MR-0002
 *
 * This module provides an optional in-memory cache around
 * ProjectModelSourcePort.loadSnapshot. The cache is intentionally scoped to the
 * composed source-port instance, which means each composition root/server
 * process/rootDir receives an isolated cache. A TTL value of zero or lower keeps
 * caching disabled and forwards every snapshot load to the wrapped source port.
 *
 * Side effects: stores an in-memory snapshot reference inside the decorator when
 * a positive TTL is configured. It does not mutate governed project-model
 * sources, create HTTP endpoints, watch files, read mtimes, serve stale data on
 * reload failure, implement frontend query caching, or introduce external
 * dependencies.
 */

/**
 * @typedef {import("./project-model-source.port.mjs").ProjectModelSourcePort} ProjectModelSourcePort
 */

/**
 * Normalizes cache TTL configuration.
 *
 * @param {number|string|undefined|null} value - TTL-like value in milliseconds.
 * @returns {number} Non-negative integer TTL in milliseconds.
 */
export function normalizeProjectDocumentationExplorerSnapshotCacheTtlMs(value) {
  const ttlMs = Number.parseInt(String(value ?? 0), 10);
  if (!Number.isInteger(ttlMs) || ttlMs < 0) {
    throw new Error(`Invalid Project Documentation Explorer snapshot cache TTL: ${value}.`);
  }
  return ttlMs;
}

/**
 * Creates an optional TTL-based snapshot cache around a source port.
 *
 * @param {ProjectModelSourcePort} sourcePort - Source port to decorate.
 * @param {{ttlMs?: number|string|null, now?: () => number}} [options] - Cache options.
 * @returns {ProjectModelSourcePort} Decorated source port.
 */
export function createProjectDocumentationExplorerSnapshotCacheSourcePort(sourcePort, options = {}) {
  const ttlMs = normalizeProjectDocumentationExplorerSnapshotCacheTtlMs(options.ttlMs);
  const now = options.now ?? Date.now;
  let cachedSnapshot = null;
  let expiresAtMs = 0;

  return Object.freeze({
    async loadSnapshot() {
      const currentTimeMs = now();
      if (ttlMs > 0 && cachedSnapshot && currentTimeMs < expiresAtMs) {
        return cachedSnapshot;
      }

      const snapshot = await sourcePort.loadSnapshot();
      if (ttlMs > 0) {
        cachedSnapshot = snapshot;
        expiresAtMs = currentTimeMs + ttlMs;
      }
      return snapshot;
    },

    async loadBodyContent(projectPath) {
      return sourcePort.loadBodyContent(projectPath);
    },
  });
}
