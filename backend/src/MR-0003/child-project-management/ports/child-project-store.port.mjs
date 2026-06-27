/**
 * @file Port contract for child project management storage adapters.
 *
 * @implementsRequirement MR-0003REQ-0023
 * @implementsRequirement MR-0003REQ-0026
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * This module defines the storage methods that child project management services
 * may depend on. The port isolates the domain and future controllers from the
 * initial SQLite adapter so later database implementations can replace SQLite
 * without changing service or UI contracts. Child project canonical documents,
 * registries, ADR, requirements and graphs remain in each child repository's
 * standard Project Model; this port persists only platform operational state.
 *
 * Side effects: none. This module only exports method names and validation
 * helpers for adapter objects. It does not open SQLite connections, allocate
 * files, execute migrations, read child repositories, run validators, mutate Git,
 * expose HTTP routes, generate skeletons, or implement authorization checks.
 */

/**
 * @typedef {Record<string, unknown> & {id: string, name: string}} ChildProjectRecord
 * @typedef {Record<string, unknown> & {id: string, child_project_id: string, overall_status: string}} ChildProjectCheckRun
 * @typedef {Record<string, unknown> & {child_project: ChildProjectRecord, latest_check_run?: ChildProjectCheckRun|null}} ChildProjectOperationalState
 *
 * @typedef {object} ChildProjectStorePort
 * @property {(principal?: unknown) => Promise<ChildProjectRecord[]>} listChildProjects
 * @property {(childProjectId: string, principal?: unknown) => Promise<ChildProjectRecord|null>} getChildProject
 * @property {(childProject: ChildProjectRecord, principal?: unknown) => Promise<ChildProjectRecord>} saveChildProject
 * @property {(checkRun: ChildProjectCheckRun, principal?: unknown) => Promise<ChildProjectCheckRun>} saveChildProjectCheckRun
 * @property {(principal?: unknown) => Promise<ChildProjectOperationalState[]>} listChildProjectOperationalStates
 */

export const requiredChildProjectStorePortMethods = Object.freeze([
  "listChildProjects",
  "getChildProject",
  "saveChildProject",
  "saveChildProjectCheckRun",
  "listChildProjectOperationalStates",
]);

/**
 * Checks whether a value is callable.
 *
 * @param {unknown} value - Candidate function.
 * @returns {value is Function} True when the value is callable.
 */
function isFunction(value) {
  return typeof value === "function";
}

/**
 * Returns the missing required storage-port method names for an adapter object.
 *
 * @param {unknown} candidate - Candidate child project store adapter.
 * @returns {string[]} Missing method names.
 */
export function getMissingChildProjectStorePortMethods(candidate) {
  if (!candidate || typeof candidate !== "object") return [...requiredChildProjectStorePortMethods];
  return requiredChildProjectStorePortMethods.filter((methodName) => !isFunction(candidate[methodName]));
}

/**
 * Asserts that a candidate object implements ChildProjectStorePort.
 *
 * @param {unknown} candidate - Candidate child project store adapter.
 * @returns {ChildProjectStorePort} The same adapter typed as a storage port.
 * @throws {TypeError} When required port methods are missing.
 */
export function assertChildProjectStorePort(candidate) {
  const missingMethods = getMissingChildProjectStorePortMethods(candidate);
  if (missingMethods.length > 0) {
    throw new TypeError(`ChildProjectStorePort is missing required methods: ${missingMethods.join(", ")}`);
  }
  return /** @type {ChildProjectStorePort} */ (candidate);
}
