import { createBootstrapRegisteredUserAccessPolicy } from "./bootstrap-registered-user-access-policy.mjs";
import { createFilesystemProjectModelSourceAdapter } from "./filesystem-project-model-source.adapter.mjs";
import { createProjectDocumentationExplorerController } from "./project-documentation-explorer.controller.mjs";
import { createProjectDocumentationExplorerRoutes } from "./project-documentation-explorer.routes.mjs";
import { createProjectDocumentationExplorerService } from "./project-documentation-explorer.service.mjs";

/**
 * @file Composition root for the MR-0002 Project Documentation Explorer backend slice.
 *
 * @implementsRequirement MR-0002REQ-0011
 * @implementsRequirement MR-0002REQ-0028
 * @implementsRequirement MR-0002REQ-0030
 * @implementsRequirement MR-0002REQ-0031
 * @implementsRequirement MR-0002REQ-0034
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @implementsRequirement MR-0002REQ-0037
 * @derivedFromDecision MR-0002/ADR-0003
 * @derivedFromDecision MR-0002/ADR-0007
 * @derivedFromDecision MR-0002/ADR-0008
 * @derivedFromDecision MR-0002/ADR-0009
 * @macroRequirement MR-0002
 *
 * This module is the feature-local composition root for the first read-only
 * Project Documentation Explorer backend slice. It wires the replaceable source
 * adapter, read service, bootstrap capability policy, controller and route
 * descriptors without allowing controllers to instantiate concrete adapters.
 *
 * Side effects: creates in-memory objects only. It does not start an HTTP server,
 * register global routes, mutate repository files, perform Git operations,
 * implement React pages, or implement Base Analysis runtime/storage.
 */

/**
 * Builds the Project Documentation Explorer backend module.
 *
 * @param {{rootDir?: string, sourcePort?: Record<string, Function>, accessPolicy?: Record<string, Function>}} [options] - Module options.
 * @returns {{sourcePort: Record<string, Function>, service: Record<string, Function>, accessPolicy: Record<string, Function>, controller: Record<string, Function>, routes: Array<Record<string, unknown>>}} Composed module.
 */
export function createProjectDocumentationExplorerModule(options = {}) {
  const sourcePort = options.sourcePort ?? createFilesystemProjectModelSourceAdapter({ rootDir: options.rootDir });
  const service = createProjectDocumentationExplorerService({ sourcePort });
  const accessPolicy = options.accessPolicy ?? createBootstrapRegisteredUserAccessPolicy();
  const controller = createProjectDocumentationExplorerController({ service, accessPolicy });
  const routes = createProjectDocumentationExplorerRoutes(controller);

  return Object.freeze({
    sourcePort,
    service,
    accessPolicy,
    controller,
    routes,
  });
}
