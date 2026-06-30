import path from "node:path";

import {
  childProjectManagementCapabilities,
  parseChildProjectCheckRun,
  parseChildProjectOperationalState,
  parseChildProjectOperationalStateList,
  parseChildProjectRecord,
} from "./child-project-management.contract.mjs";
import { createFilesystemProjectModelSourceAdapter } from "../../MR-0002/project-documentation-explorer/filesystem-project-model-source.adapter.mjs";
import { createProjectDocumentationExplorerService } from "../../MR-0002/project-documentation-explorer/project-documentation-explorer.service.mjs";
import { ChildProjectManagementDocumentationSourceUnavailableError } from "./child-project-management.errors.mjs";
import { resolveChildProjectDocumentationSource } from "./child-project-documentation-source.resolver.mjs";
import { assertChildProjectStorePort } from "./ports/child-project-store.port.mjs";

/**
 * @file Child project management service read model.
 *
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @implementsRequirement MR-0003REQ-0066
 * @implementsRequirement MR-0003REQ-0067
 * @implementsRequirement MR-0003REQ-0068
 * @implementsRequirement MR-0003REQ-0069
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
 * @property {(input: {childProject: ChildProjectRecord, documentationSource: Record<string, unknown>, rootDir: string}) => {getDocumentation(input?: {query?: Record<string, unknown>, access?: Record<string, unknown>}): Promise<Record<string, unknown>>, getDetail(input?: {id?: string, access?: Record<string, unknown>}): Promise<Record<string, unknown>>}} [projectDocumentationServiceFactory] Optional project-scoped documentation service factory.
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
 * Resolves a child workspace root for an available filesystem documentation source.
 *
 * @param {ChildProjectRecord} childProject - Registered child project record.
 * @param {Record<string, unknown>} documentationSource - Derived documentation source metadata.
 * @param {string|undefined} repositoryRoot - Platform repository root.
 * @returns {string} Absolute child workspace root.
 */
function resolveChildWorkspaceRoot(childProject, documentationSource, repositoryRoot) {
  const sourceType = String(documentationSource.source_type ?? "");
  const sourceStatus = String(documentationSource.status ?? "");
  const localPath = String(childProject.repository?.local_path ?? documentationSource.repository_local_path ?? "").trim();
  if (sourceStatus !== "available" || sourceType !== "filesystem" || !localPath) {
    throw new ChildProjectManagementDocumentationSourceUnavailableError(
      String(documentationSource.message ?? "The child project documentation source is not available."),
    );
  }
  return path.resolve(String(repositoryRoot || process.cwd()), localPath);
}

/**
 * Builds a Project Documentation Explorer service scoped to one child workspace.
 *
 * @param {{rootDir: string}} input - Child workspace root.
 * @returns {{getDocumentation(input?: {query?: Record<string, unknown>, access?: Record<string, unknown>}): Promise<Record<string, unknown>>, getDetail(input?: {id?: string, access?: Record<string, unknown>}): Promise<Record<string, unknown>>}} Project-scoped service.
 */
function createDefaultProjectDocumentationService({ rootDir }) {
  return createProjectDocumentationExplorerService({
    sourcePort: createFilesystemProjectModelSourceAdapter({ rootDir }),
  });
}

/**
 * Creates the child project management service.
 *
 * @param {ChildProjectManagementServiceOptions} options - Service dependencies.
 * @returns {{listOperationalStates(input?: {principal?: unknown}): Promise<Record<string, unknown>>, getOperationalState(input: {childProjectId: string, principal?: unknown}): Promise<Record<string, unknown>|null>, getChildProjectDocumentation(input: {childProjectId: string, query?: Record<string, unknown>, access?: Record<string, unknown>}): Promise<Record<string, unknown>>, getChildProjectDocumentationDetail(input: {childProjectId: string, entityId: string, access?: Record<string, unknown>}): Promise<Record<string, unknown>>, registerChildProject(input: {childProject: Record<string, unknown>, principal?: unknown}): Promise<Record<string, unknown>>, recordCheckRun(input: {checkRun: Record<string, unknown>, principal?: unknown}): Promise<Record<string, unknown>>}} Service API.
 */
export function createChildProjectManagementService({ storePort, resolveCapabilities, repositoryRoot, resolveDocumentationSource, projectDocumentationServiceFactory } = {}) {
  const store = assertChildProjectStorePort(storePort);
  const documentationSourceResolver = resolveDocumentationSource
    ?? (({ childProject }) => resolveChildProjectDocumentationSource({ childProject, repositoryRoot }));
  const documentationServiceFactory = projectDocumentationServiceFactory ?? createDefaultProjectDocumentationService;

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

    async getChildProjectDocumentation({ childProjectId, query = {}, access } = {}) {
      const state = await this.getOperationalState({ childProjectId, principal: access });
      if (!state) return null;

      const childProject = state.child_project;
      const documentationSource = childProject.documentation_source;
      const rootDir = resolveChildWorkspaceRoot(childProject, documentationSource, repositoryRoot);
      const service = documentationServiceFactory({ childProject, documentationSource, rootDir });
      return service.getDocumentation({ query, access });
    },

    async getChildProjectDocumentationDetail({ childProjectId, entityId, access } = {}) {
      const state = await this.getOperationalState({ childProjectId, principal: access });
      if (!state) return null;

      const childProject = state.child_project;
      const documentationSource = childProject.documentation_source;
      const rootDir = resolveChildWorkspaceRoot(childProject, documentationSource, repositoryRoot);
      const service = documentationServiceFactory({ childProject, documentationSource, rootDir });
      return service.getDetail({ id: entityId, access });
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
