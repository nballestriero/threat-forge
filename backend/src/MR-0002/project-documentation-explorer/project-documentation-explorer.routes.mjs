import {
  documentationRouteDescriptorSchema,
  projectDocumentationExplorerCapabilities,
} from "./project-documentation-explorer.contract.mjs";

/**
 * @file Route descriptors for Project Documentation Explorer read-only endpoints.
 *
 * @implementsRequirement MR-0002REQ-0028
 * @implementsRequirement MR-0002REQ-0030
 * @implementsRequirement MR-0002REQ-0031
 * @implementsRequirement MR-0002REQ-0034
 * @implementsRequirement MR-0002REQ-0035
 * @implementsRequirement MR-0002REQ-0036
 * @derivedFromDecision MR-0002/ADR-0007
 * @derivedFromDecision MR-0002/ADR-0008
 * @macroRequirement MR-0002
 *
 * These route descriptors define the first read-only API surface without binding
 * the feature to a concrete HTTP framework. A future server adapter can map the
 * descriptors to Express, Fastify, native Node, OpenAPI handlers or another
 * transport while preserving required capabilities and controller ownership.
 *
 * Side effects: none. This module does not register routes globally, start a
 * server, create middleware, read project files, perform authorization itself,
 * or implement frontend routing.
 */

/**
 * Creates route descriptors bound to the provided controller methods.
 *
 * @param {Record<string, Function>} controller - Project Documentation Explorer controller.
 * @returns {Array<Record<string, unknown>>} Validated route descriptors.
 */
export function createProjectDocumentationExplorerRoutes(controller) {
  const descriptors = [
    {
      method: "GET",
      path: "/api/project-model/documentation",
      required_capability: projectDocumentationExplorerCapabilities.read,
      description: "Lists governed documentation entities with backend-derived filter facets.",
      handler: controller.listDocumentation,
    },
    {
      method: "GET",
      path: "/api/project-model/documentation/filters",
      required_capability: projectDocumentationExplorerCapabilities.filter,
      description: "Lists possible Project Documentation Explorer filters derived from governed source data.",
      handler: controller.listDocumentationFilters,
    },
    {
      method: "GET",
      path: "/api/project-model/documentation/entities/:id",
      required_capability: projectDocumentationExplorerCapabilities.viewDetail,
      description: "Returns a read-only governed documentation entity detail view-model.",
      handler: controller.getDocumentationEntity,
    },
  ];

  for (const descriptor of descriptors) {
    documentationRouteDescriptorSchema.parse(descriptor);
  }

  return Object.freeze(descriptors);
}
