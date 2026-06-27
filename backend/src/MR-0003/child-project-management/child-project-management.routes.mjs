import {
  childProjectManagementCapabilities,
  childProjectManagementRouteDescriptorSchema,
} from "./child-project-management.contract.mjs";

/**
 * @file Route descriptors for child project management read-only endpoints.
 *
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * These descriptors define the first read-only child project management API
 * surface without binding the feature to a concrete HTTP framework. A transport
 * adapter maps the descriptors to native Node HTTP while controllers remain
 * independent from SQLite and repository operations.
 *
 * Side effects: none. This module does not register global routes, start a
 * server, open SQLite, run validators, perform authorization, mutate child
 * repositories, or implement frontend routing.
 */

/**
 * @typedef {(input: {principal?: Record<string, unknown>, childProjectId?: string}) => Promise<Record<string, unknown>>} ChildProjectManagementRouteHandler
 * @typedef {{listChildProjects: ChildProjectManagementRouteHandler, getChildProject: ChildProjectManagementRouteHandler}} ChildProjectManagementController
 * @typedef {Record<string, unknown> & {method: string, path: string, required_capability: string, description: string, handler: ChildProjectManagementRouteHandler}} ChildProjectManagementRouteDescriptor
 */

/**
 * Creates route descriptors bound to the provided controller methods.
 *
 * @param {ChildProjectManagementController} controller - Child project management controller.
 * @returns {ReadonlyArray<ChildProjectManagementRouteDescriptor>} Validated route descriptors.
 */
export function createChildProjectManagementRoutes(controller) {
  /** @type {ChildProjectManagementRouteDescriptor[]} */
  const descriptors = [
    {
      method: "GET",
      path: "/api/child-projects",
      required_capability: childProjectManagementCapabilities.list,
      description: "Lists managed child projects with their latest operational lifecycle status.",
      handler: controller.listChildProjects,
    },
    {
      method: "GET",
      path: "/api/child-projects/:id",
      required_capability: childProjectManagementCapabilities.viewOperationalState,
      description: "Returns one managed child project's operational lifecycle status.",
      handler: controller.getChildProject,
    },
  ];

  for (const descriptor of descriptors) {
    childProjectManagementRouteDescriptorSchema.parse(descriptor);
  }

  return Object.freeze(descriptors);
}
