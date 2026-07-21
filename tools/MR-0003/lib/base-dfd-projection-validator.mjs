import {
  BASE_DFD_FORBIDDEN_RENDERER_MEMBERS,
  BASE_DFD_NODE_ROLES,
  BASE_DFD_PROJECTION_CONTRACT,
  BASE_DFD_REQUIRED_RECORD_MEMBERS,
  BASE_DFD_REQUIRED_TOP_LEVEL_MEMBERS,
  BASE_DFD_UNPROJECTED_REASONS,
  createBaseDfdElementId,
  createBaseDfdProjectionId,
  BASE_DFD_ELEMENT_KINDS,
} from "../contracts/base-dfd-projection.contract.mjs";

/**
 * @file Base DFD semantic projection validator.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0006GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Validates a renderer-neutral Base DFD semantic projection against an already
 * validated canonical Base Analysis Element inventory.
 *
 * The validator independently reconstructs the expected projection from
 * controlled BAE types and relations. It does not invoke the projector, read or
 * write files, calculate layout or render diagrams.
 */

export const baseDfdProjectionRuleIds = Object.freeze({
  rootRecord: "base-dfd.projection.root-record",
  requiredMember: "base-dfd.projection.required-member",
  unknownMember: "base-dfd.projection.unknown-member",
  sourceDivergence: "base-dfd.projection.source-divergence",
  collectionType: "base-dfd.projection.collection-type",
  recordShape: "base-dfd.projection.record-shape",
  duplicateIdentity: "base-dfd.projection.duplicate-identity",
  identityDivergence: "base-dfd.projection.identity-divergence",
  controlledRole: "base-dfd.projection.controlled-role",
  controlledReason: "base-dfd.projection.controlled-reason",
  traceArray: "base-dfd.projection.trace-array",
  unresolvedTrace: "base-dfd.projection.unresolved-trace",
  inactiveContribution: "base-dfd.projection.inactive-contribution",
  rendererData: "base-dfd.projection.renderer-data",
  deterministicOrder: "base-dfd.projection.deterministic-order",
  nodeDivergence: "base-dfd.projection.node-divergence",
  flowDivergence: "base-dfd.projection.flow-divergence",
  boundaryDivergence: "base-dfd.projection.boundary-divergence",
  unprojectedDivergence: "base-dfd.projection.unprojected-divergence",
  activeCoverage: "base-dfd.projection.active-coverage",
});

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
 * Normalizes textual values.
 *
 * @param {unknown} value - Candidate value.
 * @returns {string} Normalized text.
 */
function text(value) {
  return String(value ?? "").trim();
}

/**
 * Determines whether a value is a mapping.
 *
 * @param {unknown} value - Candidate value.
 * @returns {boolean} True for non-array objects.
 */
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Compares canonical identities deterministically.
 *
 * @param {unknown} left - First value.
 * @param {unknown} right - Second value.
 * @returns {number} Ordering result.
 */
function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Creates one stable validation diagnostic.
 *
 * @param {string} ruleId - Stable rule identifier.
 * @param {string} message - Diagnostic message.
 * @param {string} context - Logical validation context.
 * @returns {{rule_id: string, message: string, context: string}} Diagnostic.
 */
function problem(ruleId, message, context = "") {
  return {
    rule_id: ruleId,
    message,
    context,
  };
}

/**
 * Produces a sorted collection without duplicates.
 *
 * @param {unknown[]} values - Candidate values.
 * @returns {string[]} Stable values.
 */
function stableUnique(values) {
  return [...new Set(values.map(text).filter(Boolean))].sort(compare);
}

/**
 * Compares two JSON-compatible values.
 *
 * @param {unknown} left - First value.
 * @param {unknown} right - Second value.
 * @returns {boolean} True when equal.
 */
function equalValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Validates exact record members.
 *
 * @param {unknown} candidate - Candidate record.
 * @param {string[]} requiredMembers - Required and allowed members.
 * @param {string} context - Diagnostic context.
 * @param {Array<Record<string, string>>} errors - Error accumulator.
 * @returns {boolean} True when the candidate is a mapping.
 */
function validateExactRecordMembers(
  candidate,
  requiredMembers,
  context,
  errors,
) {
  if (!isRecord(candidate)) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.recordShape,
        `${context} must be a mapping.`,
        context,
      ),
    );
    return false;
  }

  const allowed = new Set(requiredMembers);

  for (const member of requiredMembers) {
    if (!Object.hasOwn(candidate, member)) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.requiredMember,
          `${context} is missing required member ${member}.`,
          context,
        ),
      );
    }
  }

  for (const member of Object.keys(candidate)) {
    if (!allowed.has(member)) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.unknownMember,
          `${context} contains unknown member ${member}.`,
          context,
        ),
      );
    }
  }

  return true;
}

/**
 * Rejects renderer and layout members anywhere in the semantic projection.
 *
 * @param {unknown} value - Current value.
 * @param {string} context - Current logical path.
 * @param {Array<Record<string, string>>} errors - Error accumulator.
 * @returns {void}
 */
function detectRendererData(value, context, errors) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      detectRendererData(entry, `${context}[${index}]`, errors),
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const forbidden = new Set(BASE_DFD_FORBIDDEN_RENDERER_MEMBERS);

  for (const [member, child] of Object.entries(value)) {
    if (forbidden.has(member)) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.rendererData,
          `${context} contains forbidden renderer member ${member}.`,
          context,
        ),
      );
    }

    detectRendererData(child, `${context}.${member}`, errors);
  }
}

/**
 * Validates a deterministic trace array.
 *
 * @param {unknown} value - Candidate trace array.
 * @param {string} context - Diagnostic context.
 * @param {Set<string>} knownIds - Known canonical identities.
 * @param {Set<string>|null} activeIds - Active identities when applicable.
 * @param {Array<Record<string, string>>} errors - Error accumulator.
 * @returns {string[]} Normalized trace identities.
 */
function validateTraceArray(
  value,
  context,
  knownIds,
  activeIds,
  errors,
) {
  if (!Array.isArray(value)) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.traceArray,
        `${context} must be a list.`,
        context,
      ),
    );
    return [];
  }

  const normalized = value.map(text);

  if (
    normalized.some((entry) => !entry) ||
    normalized.length !== new Set(normalized).size
  ) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.traceArray,
        `${context} must contain unique non-empty identities.`,
        context,
      ),
    );
  }

  const expectedOrder = [...normalized].sort(compare);

  if (!equalValue(normalized, expectedOrder)) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.deterministicOrder,
        `${context} must use deterministic identity ordering.`,
        context,
      ),
    );
  }

  for (const identity of normalized) {
    if (!knownIds.has(identity)) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.unresolvedTrace,
          `${context} references unknown identity ${identity}.`,
          context,
        ),
      );
      continue;
    }

    if (activeIds && !activeIds.has(identity)) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.inactiveContribution,
          `${context} references inactive identity ${identity}.`,
          context,
        ),
      );
    }
  }

  return normalized;
}

/**
 * Indexes records by one identity field.
 *
 * @param {unknown} collection - Candidate collection.
 * @param {string} identityField - Identity member.
 * @param {string} context - Diagnostic context.
 * @param {Array<Record<string, string>>} errors - Error accumulator.
 * @returns {Map<string, Record<string, unknown>>} Record index.
 */
function indexProjectionRecords(
  collection,
  identityField,
  context,
  errors,
) {
  if (!Array.isArray(collection)) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.collectionType,
        `${context} must be a list.`,
        context,
      ),
    );
    return new Map();
  }

  const index = new Map();

  for (const [position, record] of collection.entries()) {
    const recordContext = `${context}[${position}]`;

    if (!isRecord(record)) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.recordShape,
          `${recordContext} must be a mapping.`,
          recordContext,
        ),
      );
      continue;
    }

    const identity = text(record[identityField]);

    if (!identity) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.identityDivergence,
          `${recordContext} must declare ${identityField}.`,
          recordContext,
        ),
      );
      continue;
    }

    if (index.has(identity)) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.duplicateIdentity,
          `${context} contains duplicate identity ${identity}.`,
          recordContext,
        ),
      );
      continue;
    }

    index.set(identity, record);
  }

  return index;
}

/**
 * Validates collection ordering.
 *
 * @param {unknown} collection - Candidate collection.
 * @param {string} identityField - Ordering member.
 * @param {string} context - Diagnostic context.
 * @param {Array<Record<string, string>>} errors - Error accumulator.
 * @returns {void}
 */
function validateCollectionOrder(
  collection,
  identityField,
  context,
  errors,
) {
  if (!Array.isArray(collection)) {
    return;
  }

  const actual = collection.map((entry) => text(entry?.[identityField]));
  const expected = [...actual].sort(compare);

  if (!equalValue(actual, expected)) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.deterministicOrder,
        `${context} must use deterministic identity ordering.`,
        context,
      ),
    );
  }
}

/**
 * Returns relations emitted by one BAE for one predicate.
 *
 * @param {Record<string, unknown>[]} relations - Canonical relations.
 * @param {string} sourceBaeId - Relation source.
 * @param {string} predicate - Controlled predicate.
 * @returns {Record<string, unknown>[]} Stable relations.
 */
function relationsFor(relations, sourceBaeId, predicate) {
  return relations
    .filter(
      (relation) =>
        text(relation.source_bae_id) === sourceBaeId &&
        text(relation.predicate) === predicate,
    )
    .sort((left, right) => compare(left.id, right.id));
}

/**
 * Returns the controlled DFD node role for an endpoint BAE.
 *
 * @param {Record<string, unknown>} element - Active endpoint BAE.
 * @returns {string} Controlled DFD role.
 */
function endpointRole(element) {
  switch (text(element.base_type)) {
    case BASE_TYPES.ACTOR:
      return BASE_DFD_NODE_ROLES.EXTERNAL_ENTITY;

    case BASE_TYPES.COMPONENT:
      return BASE_DFD_NODE_ROLES.PROCESS;

    case BASE_TYPES.DATA_RESOURCE:
      return BASE_DFD_NODE_ROLES.DATA_STORE;

    default:
      return "";
  }
}

/**
 * Independently reconstructs the expected Base DFD semantic records.
 *
 * @param {Record<string, unknown>} inventory - Canonical BAE inventory.
 * @param {string} registryPath - Canonical source path.
 * @param {Array<Record<string, string>>} errors - Error accumulator.
 * @returns {Record<string, unknown>} Expected projection model.
 */
function buildExpectedProjection(inventory, registryPath, errors) {
  const elements = Array.isArray(inventory?.elements)
    ? inventory.elements.filter(isRecord)
    : [];
  const relations = Array.isArray(inventory?.relations)
    ? inventory.relations.filter(isRecord)
    : [];

  const elementsById = new Map(
    elements.map((element) => [text(element.id), element]),
  );
  const relationsById = new Map(
    relations.map((relation) => [text(relation.id), relation]),
  );

  const activeElements = elements
    .filter(
      (element) =>
        text(element.lifecycle_state) === ACTIVE_LIFECYCLE_STATE,
    )
    .sort((left, right) => compare(left.id, right.id));

  const activeElementsById = new Map(
    activeElements.map((element) => [text(element.id), element]),
  );

  const activeBaeIds = new Set(activeElementsById.keys());
  const dataResourceContributions = new Map();
  const expectedFlows = new Map();

  for (const flow of activeElements.filter(
    (element) => text(element.base_type) === BASE_TYPES.DATA_FLOW,
  )) {
    const flowId = text(flow.id);

    const sourceRelations = relationsFor(
      relations,
      flowId,
      RELATION_PREDICATES.SOURCE_ENDPOINT,
    );
    const targetRelations = relationsFor(
      relations,
      flowId,
      RELATION_PREDICATES.TARGET_ENDPOINT,
    );

    if (sourceRelations.length !== 1 || targetRelations.length !== 1) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.flowDivergence,
          `Active Data Flow ${flowId} must have one source and one target relation.`,
          flowId,
        ),
      );
      continue;
    }

    const sourceRelation = sourceRelations[0];
    const targetRelation = targetRelations[0];
    const sourceBaeId = text(sourceRelation.target_bae_id);
    const targetBaeId = text(targetRelation.target_bae_id);
    const sourceElement = activeElementsById.get(sourceBaeId);
    const targetElement = activeElementsById.get(targetBaeId);

    if (
      !sourceElement ||
      !targetElement ||
      !endpointRole(sourceElement) ||
      !endpointRole(targetElement)
    ) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.flowDivergence,
          `Active Data Flow ${flowId} has an inactive or invalid endpoint.`,
          flowId,
        ),
      );
      continue;
    }

    for (const [endpoint, relation] of [
      [sourceElement, sourceRelation],
      [targetElement, targetRelation],
    ]) {
      if (text(endpoint.base_type) !== BASE_TYPES.DATA_RESOURCE) {
        continue;
      }

      const endpointId = text(endpoint.id);
      const contribution =
        dataResourceContributions.get(endpointId) ?? {
          baeIds: new Set([endpointId]),
          relationIds: new Set(),
        };

      contribution.baeIds.add(flowId);
      contribution.relationIds.add(text(relation.id));
      dataResourceContributions.set(endpointId, contribution);
    }

    const crossedRelations = relationsFor(
      relations,
      flowId,
      RELATION_PREDICATES.CROSSES_BOUNDARY,
    );

    const crossedBoundaryIds = [];
    const boundaryBaeIds = [];
    const relationIds = [
      text(sourceRelation.id),
      text(targetRelation.id),
    ];

    for (const relation of crossedRelations) {
      const boundaryBaeId = text(relation.target_bae_id);
      const boundary = activeElementsById.get(boundaryBaeId);

      if (
        !boundary ||
        text(boundary.base_type) !== BASE_TYPES.BOUNDARY
      ) {
        errors.push(
          problem(
            baseDfdProjectionRuleIds.boundaryDivergence,
            `Active Data Flow ${flowId} references invalid Boundary ${boundaryBaeId}.`,
            flowId,
          ),
        );
        continue;
      }

      crossedBoundaryIds.push(
        createBaseDfdElementId(
          BASE_DFD_ELEMENT_KINDS.BOUNDARY,
          boundaryBaeId,
        ),
      );
      boundaryBaeIds.push(boundaryBaeId);
      relationIds.push(text(relation.id));
    }

    const flowProjectionId = createBaseDfdElementId(
      BASE_DFD_ELEMENT_KINDS.FLOW,
      flowId,
    );

    expectedFlows.set(flowProjectionId, {
      id: flowProjectionId,
      title: text(flow.title),
      source_node_id: createBaseDfdElementId(
        BASE_DFD_ELEMENT_KINDS.NODE,
        sourceBaeId,
      ),
      target_node_id: createBaseDfdElementId(
        BASE_DFD_ELEMENT_KINDS.NODE,
        targetBaeId,
      ),
      crossed_boundary_ids: stableUnique(crossedBoundaryIds),
      contributing_bae_ids: stableUnique([
        flowId,
        sourceBaeId,
        targetBaeId,
        ...boundaryBaeIds,
      ]),
      contributing_relation_ids: stableUnique(relationIds),
    });
  }

  const expectedNodes = new Map();
  const expectedBoundaries = new Map();
  const expectedUnprojected = new Map();

  for (const element of activeElements) {
    const baeId = text(element.id);
    const baseType = text(element.base_type);

    if (
      baseType === BASE_TYPES.ACTOR ||
      baseType === BASE_TYPES.COMPONENT
    ) {
      const nodeId = createBaseDfdElementId(
        BASE_DFD_ELEMENT_KINDS.NODE,
        baeId,
      );

      expectedNodes.set(nodeId, {
        id: nodeId,
        role: endpointRole(element),
        title: text(element.title),
        contributing_bae_ids: [baeId],
        contributing_relation_ids: [],
      });
      continue;
    }

    if (baseType === BASE_TYPES.DATA_RESOURCE) {
      const contribution = dataResourceContributions.get(baeId);

      if (contribution) {
        const nodeId = createBaseDfdElementId(
          BASE_DFD_ELEMENT_KINDS.NODE,
          baeId,
        );

        expectedNodes.set(nodeId, {
          id: nodeId,
          role: BASE_DFD_NODE_ROLES.DATA_STORE,
          title: text(element.title),
          contributing_bae_ids: stableUnique([
            ...contribution.baeIds,
          ]),
          contributing_relation_ids: stableUnique([
            ...contribution.relationIds,
          ]),
        });
      } else {
        expectedUnprojected.set(baeId, {
          bae_id: baeId,
          title: text(element.title),
          reason:
            BASE_DFD_UNPROJECTED_REASONS.NO_DETERMINISTIC_DFD_ROLE,
        });
      }
      continue;
    }

    if (baseType === BASE_TYPES.BOUNDARY) {
      const boundaryId = createBaseDfdElementId(
        BASE_DFD_ELEMENT_KINDS.BOUNDARY,
        baeId,
      );

      expectedBoundaries.set(boundaryId, {
        id: boundaryId,
        title: text(element.title),
        contributing_bae_ids: [baeId],
        contributing_relation_ids: [],
      });
    }
  }

  return {
    source: {
      registry_id: text(inventory.registry_id),
      registry_path: registryPath,
    },
    projection_id: createBaseDfdProjectionId(
      text(inventory.registry_id),
    ),
    nodes: expectedNodes,
    flows: expectedFlows,
    boundaries: expectedBoundaries,
    unprojected: expectedUnprojected,
    elementsById,
    relationsById,
    activeBaeIds,
  };
}

/**
 * Compares actual and expected projection records.
 *
 * @param {Map<string, Record<string, unknown>>} actual - Actual records.
 * @param {Map<string, Record<string, unknown>>} expected - Expected records.
 * @param {string} ruleId - Divergence rule.
 * @param {string} context - Collection context.
 * @param {Array<Record<string, string>>} errors - Error accumulator.
 * @returns {void}
 */
function compareExpectedRecords(
  actual,
  expected,
  ruleId,
  context,
  errors,
) {
  for (const [identity, expectedRecord] of expected.entries()) {
    const actualRecord = actual.get(identity);

    if (!actualRecord) {
      errors.push(
        problem(
          ruleId,
          `${context} is missing expected identity ${identity}.`,
          context,
        ),
      );
      continue;
    }

    if (!equalValue(actualRecord, expectedRecord)) {
      errors.push(
        problem(
          ruleId,
          `${identity} differs from the deterministic expected record.`,
          identity,
        ),
      );
    }
  }

  for (const identity of actual.keys()) {
    if (!expected.has(identity)) {
      errors.push(
        problem(
          ruleId,
          `${context} contains unexpected identity ${identity}.`,
          identity,
        ),
      );
    }
  }
}

/**
 * Validates one Base DFD semantic projection.
 *
 * @param {{
 *   inventory: Record<string, unknown>,
 *   registryPath: string,
 *   projection: Record<string, unknown>
 * }} input - Canonical inventory and candidate projection.
 * @returns {{
 *   valid: boolean,
 *   errors: Array<Record<string, string>>,
 *   warnings: Array<Record<string, string>>,
 *   node_count: number,
 *   flow_count: number,
 *   boundary_count: number,
 *   unprojected_count: number
 * }} Validation result.
 */
export function validateBaseDfdProjection(input) {
  const errors = [];
  const warnings = [];

  if (!isRecord(input?.inventory)) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.sourceDivergence,
        "A canonical BAE inventory mapping is required.",
        "inventory",
      ),
    );
  }

  if (!isRecord(input?.projection)) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.rootRecord,
        "Base DFD projection must be a mapping.",
        "projection",
      ),
    );

    return {
      valid: false,
      errors,
      warnings,
      node_count: 0,
      flow_count: 0,
      boundary_count: 0,
      unprojected_count: 0,
    };
  }

  const inventory = isRecord(input.inventory) ? input.inventory : {};
  const projection = input.projection;
  const registryPath = text(input.registryPath);

  validateExactRecordMembers(
    projection,
    BASE_DFD_REQUIRED_TOP_LEVEL_MEMBERS,
    "projection",
    errors,
  );

  detectRendererData(projection, "projection", errors);

  const expected = buildExpectedProjection(
    inventory,
    registryPath,
    errors,
  );

  if (
    projection.schema_version !==
    BASE_DFD_PROJECTION_CONTRACT.schema_version
  ) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.identityDivergence,
        `projection.schema_version must equal ${BASE_DFD_PROJECTION_CONTRACT.schema_version}.`,
        "projection.schema_version",
      ),
    );
  }

  if (text(projection.projection_id) !== expected.projection_id) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.identityDivergence,
        "projection_id differs from the canonical source-derived identity.",
        "projection.projection_id",
      ),
    );
  }

  if (
    validateExactRecordMembers(
      projection.source,
      BASE_DFD_REQUIRED_RECORD_MEMBERS.source,
      "projection.source",
      errors,
    ) &&
    !equalValue(projection.source, expected.source)
  ) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.sourceDivergence,
        "projection.source differs from the canonical BAE registry source.",
        "projection.source",
      ),
    );
  }

  validateCollectionOrder(
    projection.nodes,
    "id",
    "projection.nodes",
    errors,
  );
  validateCollectionOrder(
    projection.flows,
    "id",
    "projection.flows",
    errors,
  );
  validateCollectionOrder(
    projection.boundaries,
    "id",
    "projection.boundaries",
    errors,
  );
  validateCollectionOrder(
    projection.unprojected_baes,
    "bae_id",
    "projection.unprojected_baes",
    errors,
  );

  const nodes = indexProjectionRecords(
    projection.nodes,
    "id",
    "projection.nodes",
    errors,
  );
  const flows = indexProjectionRecords(
    projection.flows,
    "id",
    "projection.flows",
    errors,
  );
  const boundaries = indexProjectionRecords(
    projection.boundaries,
    "id",
    "projection.boundaries",
    errors,
  );
  const unprojected = indexProjectionRecords(
    projection.unprojected_baes,
    "bae_id",
    "projection.unprojected_baes",
    errors,
  );

  const nodeRoles = new Set(Object.values(BASE_DFD_NODE_ROLES));
  const reasons = new Set(
    Object.values(BASE_DFD_UNPROJECTED_REASONS),
  );
  const knownBaeIds = new Set(expected.elementsById.keys());
  const knownRelationIds = new Set(expected.relationsById.keys());

  for (const [identity, node] of nodes.entries()) {
    validateExactRecordMembers(
      node,
      BASE_DFD_REQUIRED_RECORD_MEMBERS.node,
      `projection.nodes.${identity}`,
      errors,
    );

    if (!nodeRoles.has(text(node.role))) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.controlledRole,
          `${identity} uses unknown node role ${text(node.role)}.`,
          identity,
        ),
      );
    }

    validateTraceArray(
      node.contributing_bae_ids,
      `${identity}.contributing_bae_ids`,
      knownBaeIds,
      expected.activeBaeIds,
      errors,
    );
    validateTraceArray(
      node.contributing_relation_ids,
      `${identity}.contributing_relation_ids`,
      knownRelationIds,
      null,
      errors,
    );
  }

  for (const [identity, flow] of flows.entries()) {
    validateExactRecordMembers(
      flow,
      BASE_DFD_REQUIRED_RECORD_MEMBERS.flow,
      `projection.flows.${identity}`,
      errors,
    );

    validateTraceArray(
      flow.crossed_boundary_ids,
      `${identity}.crossed_boundary_ids`,
      new Set(boundaries.keys()),
      null,
      errors,
    );
    validateTraceArray(
      flow.contributing_bae_ids,
      `${identity}.contributing_bae_ids`,
      knownBaeIds,
      expected.activeBaeIds,
      errors,
    );
    validateTraceArray(
      flow.contributing_relation_ids,
      `${identity}.contributing_relation_ids`,
      knownRelationIds,
      null,
      errors,
    );

    if (!nodes.has(text(flow.source_node_id))) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.unresolvedTrace,
          `${identity} references unresolved source node ${text(flow.source_node_id)}.`,
          identity,
        ),
      );
    }

    if (!nodes.has(text(flow.target_node_id))) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.unresolvedTrace,
          `${identity} references unresolved target node ${text(flow.target_node_id)}.`,
          identity,
        ),
      );
    }
  }

  for (const [identity, boundary] of boundaries.entries()) {
    validateExactRecordMembers(
      boundary,
      BASE_DFD_REQUIRED_RECORD_MEMBERS.boundary,
      `projection.boundaries.${identity}`,
      errors,
    );

    validateTraceArray(
      boundary.contributing_bae_ids,
      `${identity}.contributing_bae_ids`,
      knownBaeIds,
      expected.activeBaeIds,
      errors,
    );
    validateTraceArray(
      boundary.contributing_relation_ids,
      `${identity}.contributing_relation_ids`,
      knownRelationIds,
      null,
      errors,
    );
  }

  for (const [identity, record] of unprojected.entries()) {
    validateExactRecordMembers(
      record,
      BASE_DFD_REQUIRED_RECORD_MEMBERS.unprojected_bae,
      `projection.unprojected_baes.${identity}`,
      errors,
    );

    if (!knownBaeIds.has(identity)) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.unresolvedTrace,
          `Unprojected record references unknown BAE ${identity}.`,
          identity,
        ),
      );
    } else if (!expected.activeBaeIds.has(identity)) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.inactiveContribution,
          `Unprojected record references inactive BAE ${identity}.`,
          identity,
        ),
      );
    }

    if (!reasons.has(text(record.reason))) {
      errors.push(
        problem(
          baseDfdProjectionRuleIds.controlledReason,
          `${identity} uses unknown unprojected reason ${text(record.reason)}.`,
          identity,
        ),
      );
    }
  }

  compareExpectedRecords(
    nodes,
    expected.nodes,
    baseDfdProjectionRuleIds.nodeDivergence,
    "projection.nodes",
    errors,
  );
  compareExpectedRecords(
    flows,
    expected.flows,
    baseDfdProjectionRuleIds.flowDivergence,
    "projection.flows",
    errors,
  );
  compareExpectedRecords(
    boundaries,
    expected.boundaries,
    baseDfdProjectionRuleIds.boundaryDivergence,
    "projection.boundaries",
    errors,
  );
  compareExpectedRecords(
    unprojected,
    expected.unprojected,
    baseDfdProjectionRuleIds.unprojectedDivergence,
    "projection.unprojected_baes",
    errors,
  );

  const expectedActiveRepresentations =
    expected.nodes.size +
    expected.flows.size +
    expected.boundaries.size +
    expected.unprojected.size;

  const actualActiveRepresentations =
    nodes.size +
    flows.size +
    boundaries.size +
    unprojected.size;

  if (
    expectedActiveRepresentations !== actualActiveRepresentations
  ) {
    errors.push(
      problem(
        baseDfdProjectionRuleIds.activeCoverage,
        "The projection does not represent every active BAE exactly once in its primary DFD collection.",
        "projection",
      ),
    );
  }

  return {
    valid: errors.length === 0,
    errors: errors.sort((left, right) =>
      compare(
        `${left.rule_id}|${left.context}|${left.message}`,
        `${right.rule_id}|${right.context}|${right.message}`,
      ),
    ),
    warnings,
    node_count: nodes.size,
    flow_count: flows.size,
    boundary_count: boundaries.size,
    unprojected_count: unprojected.size,
  };
}