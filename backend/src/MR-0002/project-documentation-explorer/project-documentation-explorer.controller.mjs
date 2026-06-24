import { projectDocumentationExplorerCapabilities } from "./project-documentation-explorer.contract.mjs";
import { ProjectDocumentationExplorerAccessDeniedError } from "./project-documentation-explorer.errors.mjs";

/**
 * @file Controller boundary for Project Documentation Explorer read-only operations.
 *
 * @implementsRequirement MR-0002REQ-0028
 * @implementsRequirement MR-0002REQ-0030
 * @implementsRequirement MR-0002REQ-0031
 * @implementsRequirement MR-0002REQ-0034
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @implementsRequirement MR-0002REQ-0037
 * @implementsRequirement MR-0002REQ-0050
 * @derivedFromDecision MR-0002/ADR-0007
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0017
 * @macroRequirement MR-0002
 *
 * The controller coordinates capability checks and read-service calls for the
 * first Project Documentation Explorer endpoints. It receives already-composed
 * dependencies and never instantiates concrete filesystem adapters, preserving
 * the Controller → Service → Port → Adapter boundary required by MR-0002.
 *
 * Side effects: none beyond calling the injected read service and access policy.
 * It does not create an HTTP server, read source files directly, mutate project
 * model data, implement frontend route guards, or implement Base Analysis.
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
    throw new ProjectDocumentationExplorerAccessDeniedError(capability);
  }
}

/**
 * Creates the Project Documentation Explorer controller.
 *
 * @param {{service: Record<string, Function>, accessPolicy: {evaluate(input: Record<string, unknown>): Record<string, unknown>}}} dependencies - Controller dependencies.
 * @returns {Record<string, Function>} Controller methods.
 */
export function createProjectDocumentationExplorerController({ service, accessPolicy }) {
  if (!service || !accessPolicy) {
    throw new TypeError("ProjectDocumentationExplorerController requires service and accessPolicy dependencies.");
  }

  function evaluate(principal, requiredCapability) {
    return accessPolicy.evaluate({ principal, requiredCapability });
  }

  return Object.freeze({
    async listDocumentation({ principal = {}, query = {} } = {}) {
      const access = evaluate(principal, projectDocumentationExplorerCapabilities.read);
      assertAllowed(access);
      return service.getDocumentation({ query, access });
    },

    async listDocumentationFilters({ principal = {}, query = {} } = {}) {
      const access = evaluate(principal, projectDocumentationExplorerCapabilities.filter);
      assertAllowed(access);
      return service.getFilters({ query, access });
    },

    async getDocumentationEntity({ principal = {}, id } = {}) {
      const access = evaluate(principal, projectDocumentationExplorerCapabilities.viewDetail);
      assertAllowed(access);
      return service.getDetail({ id, access });
    },
  });
}
