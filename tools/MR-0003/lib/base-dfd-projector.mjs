import {
  BASE_DFD_ELEMENT_KINDS,
  BASE_DFD_NODE_ROLES,
  BASE_DFD_UNPROJECTED_REASONS,
  createBaseDfdElementId,
  createEmptyBaseDfdProjection,
} from "../contracts/base-dfd-projection.contract.mjs";

/**
 * @file Deterministic Base DFD projector.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0006
 * @implementsRequirement MR-0003ADR-0001REQ-0006GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Projects an already validated canonical Base Analysis Element inventory into
 * a deterministic, renderer-neutral Base DFD semantic model.
 *
 * The projector does not read or write files, parse free-text meaning, validate
 * the complete BAE registry contract, calculate layout or render diagrams.
 */

const ACTIVE_LIFECYCLE_STATE = "active";

const BASE_TYPES = Object.freeze({
  ACTOR: "actor",
  COMPONENT: "component",
  DATA_RESOURCE: "data_resource",
  BOUNDARY: "boundary",
  DATA_FLOW: "data_flow",
});

const RELATION_PREDICATES = Object.freeze({
  SOURCE_ENDPOINT: "has_source_endpoint",
  TARGET_ENDPOINT: "has_target_endpoint",
  CROSSES_BOUNDARY: "crosses_boundary",
});

/**
 * Returns normalized text.
 *
 * @param {unknown} value - Candidate text.
 * @returns {string} Normalized text.
 */
function text(value) {
  return String(value ?? "").trim();
}

/**
 * Determines whether a value is a plain record.
 *
 * @param {unknown} value - Candidate value.
 * @returns {boolean} True for a non-array object.
 */
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Compares canonical identities deterministically.
 *
 * @param {unknown} left - First value.
 * @param {unknown} right - Second value.
 * @returns {number} Locale-independent deterministic ordering result.
 */
function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Produces a sorted collection without duplicate values.
 *
 * @param {unknown[]} values - Candidate values.
 * @returns {string[]} Stable unique values.
 */
function stableUnique(values) {
  return [...new Set(values.map(text).filter(Boolean))].sort(compare);
}

/**
 * Requires a canonical record identity.
 *
 * @param {Record<string, unknown>} record - Canonical record.
 * @param {string} label - Diagnostic label.
 * @returns {string} Canonical identity.
 */
function requireRecordId(record, label) {
  const id = text(record?.id);

  if (!id) {
    throw new Error(`${label} must declare a non-empty id.`);
  }

  return id;
}

/**
 * Indexes canonical records by identity.
 *
 * @param {unknown[]} records - Candidate record collection.
 * @param {string} label - Diagnostic label.
 * @returns {Map<string, Record<string, unknown>>} Identity index.
 */
function indexRecords(records, label) {
  if (!Array.isArray(records)) {
    throw new Error(`${label} must be a list.`);
  }

  const index = new Map();

  for (const entry of records) {
    if (!isRecord(entry)) {
      throw new Error(`Every ${label} entry must be a mapping.`);
    }

    const id = requireRecordId(entry, `${label} entry`);

    if (index.has(id)) {
      throw new Error(`${label} contains duplicate identity ${id}.`);
    }

    index.set(id, entry);
  }

  return index;
}

/**
 * Creates one canonical projected node record.
 *
 * @param {Record<string, unknown>} element - Contributing BAE.
 * @param {string} role - Controlled DFD node role.
 * @param {string[]} contributingBaeIds - Contributing BAE identities.
 * @param {string[]} contributingRelationIds - Contributing relation identities.
 * @returns {Record<string, unknown>} Projected node.
 */
function createNode(
  element,
  role,
  contributingBaeIds = [text(element.id)],
  contributingRelationIds = [],
) {
  return {
    id: createBaseDfdElementId(
      BASE_DFD_ELEMENT_KINDS.NODE,
      text(element.id),
    ),
    role,
    title: text(element.title),
    contributing_bae_ids: stableUnique(contributingBaeIds),
    contributing_relation_ids: stableUnique(contributingRelationIds),
  };
}

/**
 * Creates one canonical projected boundary record.
 *
 * @param {Record<string, unknown>} element - Contributing Boundary BAE.
 * @returns {Record<string, unknown>} Projected boundary.
 */
function createBoundary(element) {
  return {
    id: createBaseDfdElementId(
      BASE_DFD_ELEMENT_KINDS.BOUNDARY,
      text(element.id),
    ),
    title: text(element.title),
    contributing_bae_ids: [text(element.id)],
    contributing_relation_ids: [],
  };
}

/**
 * Returns relations emitted by one BAE for a controlled predicate.
 *
 * @param {Record<string, unknown>[]} relations - Canonical relations.
 * @param {string} sourceBaeId - Relation source BAE identity.
 * @param {string} predicate - Controlled relation predicate.
 * @returns {Record<string, unknown>[]} Stable matching relations.
 */
function findRelations(relations, sourceBaeId, predicate) {
  return relations
    .filter(
      (relation) =>
        text(relation.source_bae_id) === sourceBaeId &&
        text(relation.predicate) === predicate,
    )
    .sort((left, right) => compare(left.id, right.id));
}

/**
 * Requires exactly one canonical endpoint relation.
 *
 * @param {Record<string, unknown>[]} relations - Matching relations.
 * @param {string} flowId - Data Flow BAE identity.
 * @param {string} predicate - Required endpoint predicate.
 * @returns {Record<string, unknown>} Unique endpoint relation.
 */
function requireSingleEndpointRelation(relations, flowId, predicate) {
  if (relations.length !== 1) {
    throw new Error(
      `Active Data Flow ${flowId} must have exactly one ${predicate} relation.`,
    );
  }

  return relations[0];
}

/**
 * Determines the DFD role of a canonical endpoint BAE.
 *
 * @param {Record<string, unknown>} element - Active endpoint BAE.
 * @returns {string} Controlled DFD node role.
 */
function endpointNodeRole(element) {
  switch (text(element.base_type)) {
    case BASE_TYPES.ACTOR:
      return BASE_DFD_NODE_ROLES.EXTERNAL_ENTITY;

    case BASE_TYPES.COMPONENT:
      return BASE_DFD_NODE_ROLES.PROCESS;

    case BASE_TYPES.DATA_RESOURCE:
      return BASE_DFD_NODE_ROLES.DATA_STORE;

    default:
      throw new Error(
        `BAE ${text(element.id)} cannot be projected as a DFD endpoint node.`,
      );
  }
}

/**
 * Projects an already validated canonical BAE inventory into a Base DFD.
 *
 * Only active BAEs contribute. Actor and Component BAEs always become nodes;
 * Boundary BAEs always become explicit boundaries; Data Resource BAEs become
 * data stores only when referenced by an active Data Flow endpoint relation;
 * other active Data Resource BAEs remain explicitly unprojected.
 *
 * @param {{
 *   inventory: {
 *     registry_id: string,
 *     elements: Record<string, unknown>[],
 *     relations: Record<string, unknown>[]
 *   },
 *   registryPath: string
 * }} input - Canonical inventory and its repository-relative source path.
 * @returns {Record<string, unknown>} Renderer-neutral Base DFD projection.
 */
export function projectBaseDfd(input) {
  if (!isRecord(input?.inventory)) {
    throw new Error("A canonical BAE inventory mapping is required.");
  }

  const inventory = input.inventory;
  const registryId = text(inventory.registry_id);
  const registryPath = text(input.registryPath);

  if (!registryId) {
    throw new Error("The canonical BAE inventory must declare registry_id.");
  }

  const elements = Array.isArray(inventory.elements)
    ? inventory.elements
    : [];
  const relations = Array.isArray(inventory.relations)
    ? inventory.relations
    : [];

  const elementsById = indexRecords(elements, "BAE elements");
  indexRecords(relations, "BAE relations");

  const activeElements = elements
    .filter(
      (element) =>
        isRecord(element) &&
        text(element.lifecycle_state) === ACTIVE_LIFECYCLE_STATE,
    )
    .sort((left, right) => compare(left.id, right.id));

  const activeElementsById = new Map(
    activeElements.map((element) => [text(element.id), element]),
  );

  const activeFlows = activeElements.filter(
    (element) => text(element.base_type) === BASE_TYPES.DATA_FLOW,
  );

  const dataResourceContributions = new Map();

  for (const flow of activeFlows) {
    const flowId = text(flow.id);

    for (const predicate of [
      RELATION_PREDICATES.SOURCE_ENDPOINT,
      RELATION_PREDICATES.TARGET_ENDPOINT,
    ]) {
      const endpointRelations = findRelations(relations, flowId, predicate);
      const endpointRelation = requireSingleEndpointRelation(
        endpointRelations,
        flowId,
        predicate,
      );
      const endpointId = text(endpointRelation.target_bae_id);
      const endpoint = activeElementsById.get(endpointId);

      if (!endpoint) {
        throw new Error(
          `Active Data Flow ${flowId} references inactive or unknown endpoint ${endpointId}.`,
        );
      }

      if (text(endpoint.base_type) === BASE_TYPES.DATA_RESOURCE) {
        const contribution =
          dataResourceContributions.get(endpointId) ?? {
            baeIds: new Set([endpointId]),
            relationIds: new Set(),
          };

        contribution.baeIds.add(flowId);
        contribution.relationIds.add(text(endpointRelation.id));
        dataResourceContributions.set(endpointId, contribution);
      }
    }
  }

  const projection = createEmptyBaseDfdProjection({
    registryId,
    registryPath,
  });

  for (const element of activeElements) {
    const elementId = text(element.id);
    const baseType = text(element.base_type);

    switch (baseType) {
      case BASE_TYPES.ACTOR:
        projection.nodes.push(
          createNode(
            element,
            BASE_DFD_NODE_ROLES.EXTERNAL_ENTITY,
          ),
        );
        break;

      case BASE_TYPES.COMPONENT:
        projection.nodes.push(
          createNode(
            element,
            BASE_DFD_NODE_ROLES.PROCESS,
          ),
        );
        break;

      case BASE_TYPES.DATA_RESOURCE: {
        const contribution = dataResourceContributions.get(elementId);

        if (contribution) {
          projection.nodes.push(
            createNode(
              element,
              endpointNodeRole(element),
              [...contribution.baeIds],
              [...contribution.relationIds],
            ),
          );
        } else {
          projection.unprojected_baes.push({
            bae_id: elementId,
            title: text(element.title),
            reason:
              BASE_DFD_UNPROJECTED_REASONS.NO_DETERMINISTIC_DFD_ROLE,
          });
        }
        break;
      }

      case BASE_TYPES.BOUNDARY:
        projection.boundaries.push(createBoundary(element));
        break;

      case BASE_TYPES.DATA_FLOW:
        break;

      default:
        throw new Error(
          `Active BAE ${elementId} has unsupported base_type ${baseType}.`,
        );
    }
  }

  const projectedNodeIds = new Set(
    projection.nodes.map((node) => text(node.id)),
  );
  const projectedBoundaryIds = new Set(
    projection.boundaries.map((boundary) => text(boundary.id)),
  );

  for (const flow of activeFlows) {
    const flowId = text(flow.id);

    const sourceRelation = requireSingleEndpointRelation(
      findRelations(
        relations,
        flowId,
        RELATION_PREDICATES.SOURCE_ENDPOINT,
      ),
      flowId,
      RELATION_PREDICATES.SOURCE_ENDPOINT,
    );

    const targetRelation = requireSingleEndpointRelation(
      findRelations(
        relations,
        flowId,
        RELATION_PREDICATES.TARGET_ENDPOINT,
      ),
      flowId,
      RELATION_PREDICATES.TARGET_ENDPOINT,
    );

    const crossedBoundaryRelations = findRelations(
      relations,
      flowId,
      RELATION_PREDICATES.CROSSES_BOUNDARY,
    );

    const sourceBaeId = text(sourceRelation.target_bae_id);
    const targetBaeId = text(targetRelation.target_bae_id);

    const sourceElement = activeElementsById.get(sourceBaeId);
    const targetElement = activeElementsById.get(targetBaeId);

    if (!sourceElement || !targetElement) {
      throw new Error(
        `Active Data Flow ${flowId} has an inactive or unresolved endpoint.`,
      );
    }

    endpointNodeRole(sourceElement);
    endpointNodeRole(targetElement);

    const sourceNodeId = createBaseDfdElementId(
      BASE_DFD_ELEMENT_KINDS.NODE,
      sourceBaeId,
    );
    const targetNodeId = createBaseDfdElementId(
      BASE_DFD_ELEMENT_KINDS.NODE,
      targetBaeId,
    );

    if (
      !projectedNodeIds.has(sourceNodeId) ||
      !projectedNodeIds.has(targetNodeId)
    ) {
      throw new Error(
        `Active Data Flow ${flowId} endpoint nodes were not projected.`,
      );
    }

    const crossedBoundaryIds = [];
    const contributingBoundaryBaeIds = [];
    const contributingRelationIds = [
      text(sourceRelation.id),
      text(targetRelation.id),
    ];

    for (const relation of crossedBoundaryRelations) {
      const boundaryBaeId = text(relation.target_bae_id);
      const boundaryElement = activeElementsById.get(boundaryBaeId);

      if (
        !boundaryElement ||
        text(boundaryElement.base_type) !== BASE_TYPES.BOUNDARY
      ) {
        throw new Error(
          `Active Data Flow ${flowId} references inactive or invalid Boundary ${boundaryBaeId}.`,
        );
      }

      const boundaryId = createBaseDfdElementId(
        BASE_DFD_ELEMENT_KINDS.BOUNDARY,
        boundaryBaeId,
      );

      if (!projectedBoundaryIds.has(boundaryId)) {
        throw new Error(
          `Active Data Flow ${flowId} crossed Boundary ${boundaryBaeId} was not projected.`,
        );
      }

      crossedBoundaryIds.push(boundaryId);
      contributingBoundaryBaeIds.push(boundaryBaeId);
      contributingRelationIds.push(text(relation.id));
    }

    projection.flows.push({
      id: createBaseDfdElementId(
        BASE_DFD_ELEMENT_KINDS.FLOW,
        flowId,
      ),
      title: text(flow.title),
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      crossed_boundary_ids: stableUnique(crossedBoundaryIds),
      contributing_bae_ids: stableUnique([
        flowId,
        sourceBaeId,
        targetBaeId,
        ...contributingBoundaryBaeIds,
      ]),
      contributing_relation_ids: stableUnique(
        contributingRelationIds,
      ),
    });
  }

  projection.nodes.sort((left, right) => compare(left.id, right.id));
  projection.flows.sort((left, right) => compare(left.id, right.id));
  projection.boundaries.sort((left, right) =>
    compare(left.id, right.id),
  );
  projection.unprojected_baes.sort((left, right) =>
    compare(left.bae_id, right.bae_id),
  );

  return projection;
}