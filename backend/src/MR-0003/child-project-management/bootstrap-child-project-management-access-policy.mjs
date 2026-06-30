import { childProjectManagementCapabilities } from "./child-project-management.contract.mjs";

/**
 * @file Bootstrap registered-user access policy for child project management read-only routes.
 *
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @implementsRequirement MR-0003REQ-0068
 * @implementsRequirement MR-0003REQ-0069
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * The first child project management API surface is read-only and accessible
 * only through an explicit capability boundary. The bootstrap policy grants
 * minimal list/read/status capabilities to authenticated `registered_user`
 * callers while keeping the contract replaceable by future dynamic RBAC.
 *
 * Side effects: none. This module performs in-memory policy evaluation only. It
 * does not implement login, sessions, cookies, database-backed RBAC, route
 * guards, child project creation, repository validation, or Git operations.
 */

/** @type {readonly string[]} */
const registeredUserCapabilities = Object.freeze([
  childProjectManagementCapabilities.list,
  childProjectManagementCapabilities.read,
  childProjectManagementCapabilities.viewOperationalState,
  childProjectManagementCapabilities.viewDocumentation,
]);

/**
 * Builds the bootstrap read-only child project management access-policy boundary.
 *
 * @returns {{ evaluate(input: {principal?: Record<string, unknown>, requiredCapability: string}): Record<string, unknown> }} Policy evaluator.
 */
export function createBootstrapChildProjectManagementAccessPolicy() {
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
