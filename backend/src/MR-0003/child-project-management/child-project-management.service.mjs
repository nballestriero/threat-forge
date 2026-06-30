import {
  childProjectManagementCapabilities,
  parseChildProjectCheckRun,
  parseChildProjectOperationalState,
  parseChildProjectOperationalStateList,
  parseChildProjectRecord,
} from "./child-project-management.contract.mjs";
import { resolveChildProjectDocumentationSource } from "./child-project-documentation-source.resolver.mjs";
import { assertChildProjectStorePort } from "./ports/child-project-store.port.mjs";

/**
 * @file Child project management service read model.
 *
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @implementsRequirement MR-0003REQ-0066
 * @implementsRequirement MR-0003REQ-0067
 * @derivedFromDecision MR-0003/ADR-0005
 * @derivedFromDecision MR-0003/ADR-0014
 * @macroRequirement MR-0003
 *
 * This service coordinates child project management operations through the
 * replaceable ChildProjectStorePort and returns backend/UI-safe operational
 * read models. It preserves the selected Controller → Service → Port → Adapter
 * boundary: callers depend on this service, the service depends on the port,
 * and SQLite remains hidden inside the adapter. Canonical child project ADR,
 * Requirement, macro-requirement, body, taxonomy and graph records remain in
 * each child repository's standard Project Model.
 *
 * Side effects: delegates reads and writes to the configured store port. This
 * module does not open SQLite databases, run SQL, read child repositories, run
 * Project Model validators, clone repositories, generate skeletons, mutate Git,
 * expose HTTP routes, render UI, or implement final RBAC policy persistence.
 */

/**
 * @typedef {import("./ports/child-project-store.port.mjs").ChildProjectStorePort} ChildProjectStorePort
 * @typedef {import("./ports/child-project-store.port.mjs").ChildProjectRecord} ChildProjectRecord
 * @typedef {import("./ports/child-project-store.port.mjs").ChildProjectCheckRun} ChildProjectCheckRun
 * @typedef {import("./ports/child-project-store.port.mjs").ChildProjectOperationalState} ChildProjectOperationalState
 *
 * @typedef {object} ChildProjectManagementServiceOptions
 * @property {ChildProjectStorePort} storePort Replaceable child-project management store.
 * @property {(principal?: unknown) => string[]} [resolveCapabilities] Optional capability resolver.
 * @property {string} [repositoryRoot] Repository root used for resolving registered local child paths.
 * @property {(input: {childProject: ChildProjectRecord}) => Record<string, unknown>} [resolveDocumentationSource] Optional documentation-source resolver.
 */

const readModelCapabilities = Object.freeze([
  childProjectManagementCapabilities.list,
  childProjectManagementCapabilities.read,
  childProjectManagementCapabilities.viewOperationalState,
]);

/**
 * Normalizes caller capabilities from an optional principal or resolver.
 *
 * @param {unknown} principal - Caller principal.
 * @param {(principal?: unknown) => string[]} [resolveCapabilities] - Optional capability resolver.
 * @returns {string[]} Stable capability list for the read model.
 */
function getCapabilities(principal, resolveCapabilities) {
  if (resolveCapabilities) {
    return [...new Set(resolveCapabilities(principal).map((capability) => String(capability)).filter(Boolean))];
  }

  if (principal && typeof principal === "object" && Array.isArray(principal.capabilities)) {
    return [...new Set(principal.capabilities.map((capability) => String(capability)).filter(Boolean))];
  }

  if (principal && typeof principal === "object" && principal.authenticated === true) {
    return [...readModelCapabilities];
  }

  return [];
}

/**
 * Builds a lookup map by child project id.
 *
 * @param {ChildProjectOperationalState[]} states - Operational state records.
 * @returns {Map<string, ChildProjectOperationalState>} State lookup.
 */
function indexOperationalStates(states) {
  return new Map(states.map((state) => [state.child_project.id, state]));
}


/**
 * Adds a derived documentation source descriptor to one child project record.
 *
 * @param {ChildProjectRecord} childProject - Registered child project record.
 * @param {(input: {childProject: ChildProjectRecord}) => Record<string, unknown>} resolver - Documentation source resolver.
 * @returns {ChildProjectRecord} Child project with derived documentation source metadata.
 */
function withDocumentationSource(childProject, resolver) {
  return parseChildProjectRecord({
    ...childProject,
    documentation_source: resolver({ childProject }),
  });
}

/**
 * Adds derived documentation source metadata to an operational state.
 *
 * @param {ChildProjectOperationalState} state - Operational state.
 * @param {(input: {childProject: ChildProjectRecord}) => Record<string, unknown>} resolver - Documentation source resolver.
 * @returns {ChildProjectOperationalState} State with child documentation source metadata.
 */
function withOperationalStateDocumentationSource(state, resolver) {
  return parseChildProjectOperationalState({
    ...state,
    child_project: withDocumentationSource(state.child_project, resolver),
  });
}

/**
 * Creates the child project management service.
 *
 * @param {ChildProjectManagementServiceOptions} options - Service dependencies.
 * @returns {{listOperationalStates(input?: {principal?: unknown}): Promise<Record<string, unknown>>, getOperationalState(input: {childProjectId: string, principal?: unknown}): Promise<Record<string, unknown>|null>, registerChildProject(input: {childProject: Record<string, unknown>, principal?: unknown}): Promise<Record<string, unknown>>, recordCheckRun(input: {checkRun: Record<string, unknown>, principal?: unknown}): Promise<Record<string, unknown>>}} Service API.
 */
export function createChildProjectManagementService({ storePort, resolveCapabilities, repositoryRoot, resolveDocumentationSource } = {}) {
  const store = assertChildProjectStorePort(storePort);
  const documentationSourceResolver = resolveDocumentationSource
    ?? (({ childProject }) => resolveChildProjectDocumentationSource({ childProject, repositoryRoot }));

  return Object.freeze({
    async listOperationalStates({ principal } = {}) {
      const items = await store.listChildProjectOperationalStates(principal);
      return parseChildProjectOperationalStateList({
        capabilities: getCapabilities(principal, resolveCapabilities),
        items: items.map((state) => withOperationalStateDocumentationSource(state, documentationSourceResolver)),
      });
    },

    async getOperationalState({ childProjectId, principal } = {}) {
      const normalizedId = String(childProjectId ?? "").trim();
      if (!normalizedId) throw new TypeError("Child project id is required.");

      const states = await store.listChildProjectOperationalStates(principal);
      const state = indexOperationalStates(states).get(normalizedId) ?? null;
      return state ? withOperationalStateDocumentationSource(state, documentationSourceResolver) : null;
    },

    async registerChildProject({ childProject, principal } = {}) {
      const parsed = parseChildProjectRecord(childProject);
      return withDocumentationSource(await store.saveChildProject(parsed, principal), documentationSourceResolver);
    },

    async recordCheckRun({ checkRun, principal } = {}) {
      const parsed = parseChildProjectCheckRun(checkRun);
      return parseChildProjectCheckRun(await store.saveChildProjectCheckRun(parsed, principal));
    },
  });
}
