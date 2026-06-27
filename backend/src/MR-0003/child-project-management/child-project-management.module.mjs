import { createSqliteChildProjectStore } from "./adapters/sqlite-child-project-store.adapter.mjs";
import { createBootstrapChildProjectManagementAccessPolicy } from "./bootstrap-child-project-management-access-policy.mjs";
import { createChildProjectManagementController } from "./child-project-management.controller.mjs";
import { createChildProjectManagementRoutes } from "./child-project-management.routes.mjs";
import { createChildProjectManagementService } from "./child-project-management.service.mjs";

/**
 * @file Composition root for the MR-0003 child project management backend slice.
 *
 * @implementsRequirement MR-0003REQ-0014
 * @implementsRequirement MR-0003REQ-0015
 * @implementsRequirement MR-0003REQ-0024
 * @implementsRequirement MR-0003REQ-0025
 * @implementsRequirement MR-0003REQ-0026
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * This module composes the child project management storage port, initial SQLite
 * adapter, service, bootstrap capability policy, controller and read-only route
 * descriptors. Concrete storage stays inside the adapter and controllers depend
 * only on the service/policy boundary.
 *
 * Side effects: creates the configured child project store adapter, which may
 * open or create a SQLite database through the adapter boundary. It does not
 * start an HTTP server, mutate child project documentation, run validators,
 * clone repositories, generate skeletons, perform commit/push operations,
 * implement frontend UI, or implement final RBAC persistence.
 */

/**
 * @typedef {import("./ports/child-project-store.port.mjs").ChildProjectStorePort} ChildProjectStorePort
 * @typedef {{evaluate(input: {principal?: Record<string, unknown>, requiredCapability: string}): Record<string, unknown>}} ChildProjectManagementAccessPolicy
 * @typedef {{storePort?: ChildProjectStorePort, accessPolicy?: ChildProjectManagementAccessPolicy, databasePath?: string}} ChildProjectManagementModuleOptions
 * @typedef {ReturnType<typeof createChildProjectManagementService>} ChildProjectManagementService
 * @typedef {ReturnType<typeof createChildProjectManagementController>} ChildProjectManagementController
 * @typedef {ReturnType<typeof createChildProjectManagementRoutes>} ChildProjectManagementRoutes
 * @typedef {{storePort: ChildProjectStorePort, service: ChildProjectManagementService, accessPolicy: ChildProjectManagementAccessPolicy, controller: ChildProjectManagementController, routes: ChildProjectManagementRoutes}} ChildProjectManagementModule
 */

/**
 * Builds the child project management backend module.
 *
 * @param {ChildProjectManagementModuleOptions} [options] - Module options.
 * @returns {ChildProjectManagementModule} Composed module.
 */
export function createChildProjectManagementModule(options = {}) {
  const storePort = options.storePort ?? createSqliteChildProjectStore({ databasePath: options.databasePath });
  const accessPolicy = options.accessPolicy ?? createBootstrapChildProjectManagementAccessPolicy();
  const service = createChildProjectManagementService({
    storePort,
    resolveCapabilities(principal) {
      if (principal && typeof principal === "object" && Array.isArray(principal.capabilities)) {
        return principal.capabilities;
      }
      return [];
    },
  });
  const controller = createChildProjectManagementController({ service, accessPolicy });
  const routes = createChildProjectManagementRoutes(controller);

  return Object.freeze({
    storePort,
    service,
    accessPolicy,
    controller,
    routes,
  });
}
