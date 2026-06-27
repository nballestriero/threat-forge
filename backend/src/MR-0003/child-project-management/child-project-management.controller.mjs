import {
  childProjectIdSchema,
  childProjectManagementCapabilities,
} from "./child-project-management.contract.mjs";
import {
  ChildProjectManagementAccessDeniedError,
  ChildProjectManagementInvalidRequestError,
  ChildProjectManagementNotFoundError,
} from "./child-project-management.errors.mjs";

/**
 * @file Controller boundary for child project management read-only operations.
 *
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * The controller coordinates capability checks and service calls for the first
 * read-only child project management API. It receives already-composed
 * dependencies and never instantiates SQLite, validators, repository adapters or
 * UI code, preserving the Controller → Service → Port → Adapter boundary.
 *
 * Side effects: none beyond calling the injected service and access policy. It
 * does not create an HTTP server, run SQL, mutate child project Project Model
 * sources, run child project checks, generate skeletons, clone repositories, or
 * perform commit/push operations.
 */

/**
 * @typedef {{listOperationalStates(input?: {principal?: unknown}): Promise<Record<string, unknown>>, getOperationalState(input: {childProjectId: string, principal?: unknown}): Promise<Record<string, unknown>|null>}} ChildProjectManagementService
 * @typedef {{evaluate(input: {principal?: Record<string, unknown>, requiredCapability: string}): Record<string, unknown>}} ChildProjectManagementAccessPolicy
 * @typedef {{principal?: Record<string, unknown>}} ChildProjectManagementListInput
 * @typedef {{principal?: Record<string, unknown>, childProjectId?: string}} ChildProjectManagementDetailInput
 */

/**
 * Asserts that a policy decision allows the requested capability.
 *
 * @param {Record<string, unknown>} access - Access decision.
 * @returns {void}
 */
function assertAllowed(access) {
  if (!access?.allowed) {
    const capability = String(access?.required_capability ?? "unknown");
    throw new ChildProjectManagementAccessDeniedError(capability);
  }
}

/**
 * Parses and validates an API child project id.
 *
 * @param {unknown} childProjectId - Candidate child project id.
 * @returns {string} Parsed id.
 */
function parseChildProjectId(childProjectId) {
  const normalizedId = String(childProjectId ?? "").trim();
  const result = childProjectIdSchema.safeParse(normalizedId);
  if (!result.success) {
    throw new ChildProjectManagementInvalidRequestError("A valid child project id is required.");
  }
  return result.data;
}

/**
 * Creates the child project management controller.
 *
 * @param {{service: ChildProjectManagementService, accessPolicy: ChildProjectManagementAccessPolicy}} dependencies - Controller dependencies.
 * @returns {{listChildProjects(input?: ChildProjectManagementListInput): Promise<Record<string, unknown>>, getChildProject(input?: ChildProjectManagementDetailInput): Promise<Record<string, unknown>>}} Controller methods.
 */
export function createChildProjectManagementController({ service, accessPolicy }) {
  if (!service || !accessPolicy) {
    throw new TypeError("ChildProjectManagementController requires service and accessPolicy dependencies.");
  }

  /**
   * @param {Record<string, unknown>} principal - Request principal.
   * @param {string} requiredCapability - Required capability.
   * @returns {Record<string, unknown>} Access decision.
   */
  function evaluate(principal, requiredCapability) {
    return accessPolicy.evaluate({ principal, requiredCapability });
  }

  return Object.freeze({
    /**
     * @param {ChildProjectManagementListInput} [input] - List request.
     * @returns {Promise<Record<string, unknown>>} Operational-state collection read model.
     */
    async listChildProjects({ principal = {} } = {}) {
      const access = evaluate(principal, childProjectManagementCapabilities.list);
      assertAllowed(access);
      return service.listOperationalStates({ principal: access });
    },

    /**
     * @param {ChildProjectManagementDetailInput} [input] - Detail request.
     * @returns {Promise<Record<string, unknown>>} One child project operational-state read model.
     */
    async getChildProject({ principal = {}, childProjectId } = {}) {
      const parsedId = parseChildProjectId(childProjectId);
      const access = evaluate(principal, childProjectManagementCapabilities.viewOperationalState);
      assertAllowed(access);
      const state = await service.getOperationalState({ childProjectId: parsedId, principal: access });
      if (!state) {
        throw new ChildProjectManagementNotFoundError(`Child project not found: ${parsedId}`);
      }
      return state;
    },
  });
}
