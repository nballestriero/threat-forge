import assert from "node:assert/strict";
import test from "node:test";

import {
  projectBaseDfd,
} from "../lib/base-dfd-projector.mjs";

import {
  baseDfdProjectionRuleIds,
  validateBaseDfdProjection,
} from "../lib/base-dfd-projection-validator.mjs";

/**
 * @file Base DFD projection verification suite.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0006GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Verifies deterministic BAE-to-Base-DFD projection, semantic validation,
 * traceability, controlled values, active-element coverage and renderer
 * neutrality using positive and negative in-memory fixtures.
 */

const REGISTRY_PATH =
  "examples/case-studies/documentation-to-base-analysis/docs/reference/project-model/registers/base-analysis/base-analysis-elements.registry.yml";

/**
 * Creates the canonical demonstration BAE inventory used by the tests.
 *
 * @param {{
 *   dataResourceAsEndpoint?: boolean,
 *   includeInactive?: boolean
 * }} options - Fixture variants.
 * @returns {Record<string, unknown>} Canonical BAE inventory fixture.
 */
function createBaseInventory(options = {}) {
  const elements = [
    {
      id: "BAE-0001",
      title: "Demonstration user",
      base_type: "actor",
      lifecycle_state: "active",
    },
    {
      id: "BAE-0002",
      title: "Demonstration service",
      base_type: "component",
      lifecycle_state: "active",
    },
    {
      id: "BAE-0003",
      title: "Demonstration record",
      base_type: "data_resource",
      lifecycle_state: "active",
    },
    {
      id: "BAE-0004",
      title: "Service domain boundary",
      base_type: "boundary",
      lifecycle_state: "active",
    },
    {
      id: "BAE-0005",
      title: "Demonstration request flow",
      base_type: "data_flow",
      lifecycle_state: "active",
    },
  ];

  if (options.includeInactive) {
    elements.push({
      id: "BAE-0006",
      title: "Deprecated processing service",
      base_type: "component",
      lifecycle_state: "deprecated",
    });
  }

  return {
    schema_version: 1,
    registry_id: "base-analysis-elements-registry",
    macro_requirement_id: "MR-0003",
    elements,
    relations: [
      {
        id: "BAE-REL-0001",
        source_bae_id: "BAE-0005",
        predicate: "has_source_endpoint",
        target_bae_id: "BAE-0001",
      },
      {
        id: "BAE-REL-0002",
        source_bae_id: "BAE-0005",
        predicate: "has_target_endpoint",
        target_bae_id: options.dataResourceAsEndpoint
          ? "BAE-0003"
          : "BAE-0002",
      },
      {
        id: "BAE-REL-0003",
        source_bae_id: "BAE-0005",
        predicate: "crosses_boundary",
        target_bae_id: "BAE-0004",
      },
    ],
  };
}

/**
 * Projects one inventory fixture.
 *
 * @param {Record<string, unknown>} inventory - BAE inventory.
 * @returns {Record<string, unknown>} Base DFD projection.
 */
function project(inventory) {
  return projectBaseDfd({
    inventory,
    registryPath: REGISTRY_PATH,
  });
}

/**
 * Validates one projection fixture.
 *
 * @param {Record<string, unknown>} inventory - BAE inventory.
 * @param {Record<string, unknown>} projection - Candidate projection.
 * @returns {Record<string, unknown>} Validation result.
 */
function validate(inventory, projection) {
  return validateBaseDfdProjection({
    inventory,
    registryPath: REGISTRY_PATH,
    projection,
  });
}

/**
 * Requires one stable validation rule.
 *
 * @param {Record<string, unknown>} result - Validation result.
 * @param {string} ruleId - Expected stable rule.
 * @returns {void}
 */
function assertHasRule(result, ruleId) {
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((entry) => entry.rule_id === ruleId),
    `Expected rule ${ruleId}.\n${JSON.stringify(result.errors, null, 2)}`,
  );
}

test("projects and validates the canonical Base DFD case study", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  assert.deepEqual(projection, {
    schema_version: 1,
    projection_id: "BASE-DFD-base-analysis-elements-registry",
    source: {
      registry_id: "base-analysis-elements-registry",
      registry_path: REGISTRY_PATH,
    },
    nodes: [
      {
        id: "DFD-NODE-BAE-0001",
        role: "external_entity",
        title: "Demonstration user",
        contributing_bae_ids: ["BAE-0001"],
        contributing_relation_ids: [],
      },
      {
        id: "DFD-NODE-BAE-0002",
        role: "process",
        title: "Demonstration service",
        contributing_bae_ids: ["BAE-0002"],
        contributing_relation_ids: [],
      },
    ],
    flows: [
      {
        id: "DFD-FLOW-BAE-0005",
        title: "Demonstration request flow",
        source_node_id: "DFD-NODE-BAE-0001",
        target_node_id: "DFD-NODE-BAE-0002",
        crossed_boundary_ids: ["DFD-BOUNDARY-BAE-0004"],
        contributing_bae_ids: [
          "BAE-0001",
          "BAE-0002",
          "BAE-0004",
          "BAE-0005",
        ],
        contributing_relation_ids: [
          "BAE-REL-0001",
          "BAE-REL-0002",
          "BAE-REL-0003",
        ],
      },
    ],
    boundaries: [
      {
        id: "DFD-BOUNDARY-BAE-0004",
        title: "Service domain boundary",
        contributing_bae_ids: ["BAE-0004"],
        contributing_relation_ids: [],
      },
    ],
    unprojected_baes: [
      {
        bae_id: "BAE-0003",
        title: "Demonstration record",
        reason: "no_deterministic_dfd_role",
      },
    ],
  });

  assert.deepEqual(validate(inventory, projection), {
    valid: true,
    errors: [],
    warnings: [],
    node_count: 2,
    flow_count: 1,
    boundary_count: 1,
    unprojected_count: 1,
  });
});

test("produces identical output for differently ordered canonical input", () => {
  const canonicalInventory = createBaseInventory();
  const reorderedInventory = structuredClone(canonicalInventory);

  reorderedInventory.elements.reverse();
  reorderedInventory.relations.reverse();

  assert.deepEqual(
    project(reorderedInventory),
    project(canonicalInventory),
  );
});

test("projects a Data Resource endpoint as a data store", () => {
  const inventory = createBaseInventory({
    dataResourceAsEndpoint: true,
  });
  const projection = project(inventory);

  const dataStore = projection.nodes.find(
    (node) => node.id === "DFD-NODE-BAE-0003",
  );

  assert.deepEqual(dataStore, {
    id: "DFD-NODE-BAE-0003",
    role: "data_store",
    title: "Demonstration record",
    contributing_bae_ids: ["BAE-0003", "BAE-0005"],
    contributing_relation_ids: ["BAE-REL-0002"],
  });
  assert.deepEqual(projection.unprojected_baes, []);
  assert.equal(
    projection.flows[0].target_node_id,
    "DFD-NODE-BAE-0003",
  );
  assert.equal(validate(inventory, projection).valid, true);
});

test("keeps an unconnected Data Resource explicitly unprojected", () => {
  const projection = project(createBaseInventory());

  assert.deepEqual(projection.unprojected_baes, [
    {
      bae_id: "BAE-0003",
      title: "Demonstration record",
      reason: "no_deterministic_dfd_role",
    },
  ]);
});

test("does not mutate inventories or candidate projections", () => {
  const inventory = createBaseInventory();
  const inventoryBefore = structuredClone(inventory);

  const projection = project(inventory);
  const projectionBefore = structuredClone(projection);

  validate(inventory, projection);

  assert.deepEqual(inventory, inventoryBefore);
  assert.deepEqual(projection, projectionBefore);
});

test("publishes unique stable validation rule identifiers", () => {
  const ruleIds = Object.values(baseDfdProjectionRuleIds);

  assert.equal(ruleIds.length, new Set(ruleIds).size);
  assert.ok(
    ruleIds.every((ruleId) =>
      ruleId.startsWith("base-dfd.projection."),
    ),
  );
});

test("rejects a missing expected node", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  projection.nodes = projection.nodes.filter(
    (node) => node.id !== "DFD-NODE-BAE-0002",
  );

  const result = validate(inventory, projection);

  assertHasRule(
    result,
    baseDfdProjectionRuleIds.nodeDivergence,
  );
  assertHasRule(
    result,
    baseDfdProjectionRuleIds.activeCoverage,
  );
});

test("rejects a divergent Data Flow endpoint", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  projection.flows[0].target_node_id =
    "DFD-NODE-BAE-0001";

  assertHasRule(
    validate(inventory, projection),
    baseDfdProjectionRuleIds.flowDivergence,
  );
});

test("rejects divergent crossed-boundary semantics", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  projection.flows[0].crossed_boundary_ids = [];

  assertHasRule(
    validate(inventory, projection),
    baseDfdProjectionRuleIds.flowDivergence,
  );
});

test("rejects an unresolved BAE trace identity", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  projection.nodes[0].contributing_bae_ids = [
    "BAE-0001",
    "BAE-9999",
  ];

  assertHasRule(
    validate(inventory, projection),
    baseDfdProjectionRuleIds.unresolvedTrace,
  );
});

test("rejects an inactive BAE contribution", () => {
  const inventory = createBaseInventory({
    includeInactive: true,
  });
  const projection = project(inventory);

  projection.nodes[0].contributing_bae_ids = [
    "BAE-0001",
    "BAE-0006",
  ];

  assertHasRule(
    validate(inventory, projection),
    baseDfdProjectionRuleIds.inactiveContribution,
  );
});

test("rejects an uncontrolled node role", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  projection.nodes[0].role = "service";

  assertHasRule(
    validate(inventory, projection),
    baseDfdProjectionRuleIds.controlledRole,
  );
});

test("rejects an uncontrolled unprojected reason", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  projection.unprojected_baes[0].reason = "free_text_reason";

  assertHasRule(
    validate(inventory, projection),
    baseDfdProjectionRuleIds.controlledReason,
  );
});

test("rejects duplicate projected identities", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  projection.nodes.push(
    structuredClone(projection.nodes[0]),
  );

  assertHasRule(
    validate(inventory, projection),
    baseDfdProjectionRuleIds.duplicateIdentity,
  );
});

test("rejects non-deterministic collection ordering", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  projection.nodes.reverse();

  assertHasRule(
    validate(inventory, projection),
    baseDfdProjectionRuleIds.deterministicOrder,
  );
});

test("rejects renderer or layout data in the semantic model", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  projection.nodes[0].x = 120;

  assertHasRule(
    validate(inventory, projection),
    baseDfdProjectionRuleIds.rendererData,
  );
});

test("rejects a missing required semantic member", () => {
  const inventory = createBaseInventory();
  const projection = project(inventory);

  delete projection.nodes[0].title;

  assertHasRule(
    validate(inventory, projection),
    baseDfdProjectionRuleIds.requiredMember,
  );
});

test("rejects a non-record projection root", () => {
  const result = validateBaseDfdProjection({
    inventory: createBaseInventory(),
    registryPath: REGISTRY_PATH,
    projection: null,
  });

  assertHasRule(
    result,
    baseDfdProjectionRuleIds.rootRecord,
  );
});

test("projector rejects a Data Flow missing its target endpoint", () => {
  const inventory = createBaseInventory();

  inventory.relations = inventory.relations.filter(
    (relation) =>
      relation.predicate !== "has_target_endpoint",
  );

  assert.throws(
    () => project(inventory),
    /exactly one has_target_endpoint relation/u,
  );
});

test("projector rejects duplicate BAE identities", () => {
  const inventory = createBaseInventory();

  inventory.elements.push(
    structuredClone(inventory.elements[0]),
  );

  assert.throws(
    () => project(inventory),
    /duplicate identity BAE-0001/u,
  );
});