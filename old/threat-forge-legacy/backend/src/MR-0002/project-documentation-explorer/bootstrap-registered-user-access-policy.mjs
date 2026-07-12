import { projectDocumentationExplorerCapabilities } from "./project-documentation-explorer.contract.mjs";

/**
 * @file Bootstrap registered-user access policy for read-only documentation explorer routes.
 *
 * @implementsRequirement MR-0002REQ-0021
 * @implementsRequirement MR-0002REQ-0034
 * @implementsRequirement MR-0007REQ-0005
 * @implementsRequirement MR-0007REQ-0006
 * @implementsRequirement MR-0002REQ-0054
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0002/ADR-0007
 * @derivedFromDecision MR-0007/ADR-0002
 * @derivedFromDecision MR-0002/ADR-0021
 * @macroRequirement MR-0002
 * @macroRequirement MR-0007
 *
 * The first Governance Console documentation pages are read-only and accessible
 * only through an explicit capability boundary. The bootstrap policy grants the
 * minimal Project Documentation Explorer read capabilities to authenticated
 * users with the initial `registered_user` role while keeping the contract
 * replaceable by future dynamic RBAC policy evaluation.
 *
 * Side effects: none. This module performs in-memory policy evaluation only. It
 * does not implement login, sessions, cookies, persistence, route guards, admin
 * RBAC screens, workspace membership storage, or frontend role checks.
 */

/** @type {readonly string[]} */
const registeredUserCapabilities = Object.freeze([
  projectDocumentationExplorerCapabilities.read,
  projectDocumentationExplorerCapabilities.filter,
  projectDocumentationExplorerCapabilities.viewDetail,
]);

/**
 * Builds the bootstrap read-only access-policy boundary.
 *
 * @returns {{ evaluate(input: {principal?: Record<string, unknown>, requiredCapability: string}): Record<string, unknown> }} Policy evaluator.
 */
export function createBootstrapRegisteredUserAccessPolicy() {
  return Object.freeze({
    evaluate({ principal = {}, requiredCapability }) {
      const authenticated = Boolean(principal.authenticated);
      const role = String(principal.role ?? "");
      const capabilities = authenticated && role === "registered_user" ? [...registeredUserCapabilities] : [];

      return {
        authenticated,
        role: role || undefined,
        allowed: capabilities.includes(requiredCapability),
        required_capability: requiredCapability,
        capabilities,
      };
    },
  });
}
