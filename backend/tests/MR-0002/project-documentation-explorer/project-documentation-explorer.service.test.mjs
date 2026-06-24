import assert from "node:assert/strict";
import test from "node:test";

import "./project-documentation-explorer.http-server.test.mjs";
import "./project-documentation-explorer.serve.test.mjs";
import "./project-documentation-explorer.frontend-client.test.mjs";
import "./project-documentation-explorer.filesystem-source-adapter.test.mjs";

import {
  createProjectDocumentationExplorerService,
  normalizeDocumentationQuery,
} from "../../../src/MR-0002/project-documentation-explorer/project-documentation-explorer.service.mjs";

/**
 * @file Minimal Node.js unit tests for stable Project Documentation Explorer service logic.
 *
 * @implementsRequirement MR-0000REQ-0018
 * @verifiesRequirement MR-0002REQ-0030
 * @verifiesRequirement MR-0002REQ-0035
 * @verifiesRequirement MR-0002REQ-0037
 * @derivedFromDecision MR-0000/ADR-0006
 * @macroRequirement MR-0000
 * @macroRequirement MR-0002
 *
 * These tests cover deterministic service-level behavior that should remain
 * stable while the Governance Console evolves: query normalization, registry and
 * graph-derived filtering, and governed Markdown body resolution through the
 * source port. They intentionally use Node.js built-in `node:test` without Jest,
 * browser runtime, canonical project-model files, Git operations or filesystem
 * mutation.
 */

const fixtureSnapshot = Object.freeze({
  macroRequirements: [
    {
      id: "MR-0002",
      name: "Reusable Interface Framework",
      status: "approved",
      body_path: "docs/reference/project-model/body/macro-requirements/MR-0002_body.md",
    },
    {
      id: "MR-0007",
      name: "Identity, User and Access Management",
      status: "draft",
    },
  ],
  requirements: [
    {
      id: "MR-0002REQ-TEST-0001",
      title: "Explorer read model filters governed entities",
      type: "functional",
      status: "approved",
      priority: "high",
      macro_requirement_id: "MR-0002",
      derived_from_decision_id: "ADR-0007",
      body_path: "docs/reference/project-model/body/requirements/MR-0002/MR-0002REQ-TEST-0001_body.md",
    },
    {
      id: "MR-0007REQ-TEST-0001",
      title: "Access policy remains separate",
      type: "functional",
      status: "draft",
      priority: "medium",
      macro_requirement_id: "MR-0007",
    },
  ],
  decisions: [
    {
      id: "ADR-0007",
      title: "Explorer read-only API contract",
      status: "approved",
      decision_type: "architecture",
      macro_requirement_id: "MR-0002",
      body_path: "docs/reference/project-model/body/decisions/MR-0002/ADR-0007_body.md",
    },
  ],
  taxonomies: [
    {
      id: "implementation_state",
      title: "Implementation state",
    },
  ],
  graphRelations: [
    {
      subject: "MR-0002REQ-TEST-0001",
      predicate: "implemented_by",
      object: "SRC-project-documentation-explorer-service",
    },
    {
      subject: "MR-0002/ADR-0007",
      predicate: "specified_by",
      object: "MR-0002REQ-TEST-0001",
    },
  ],
});

const fixtureBodies = new Map([
  [
    "docs/reference/project-model/body/requirements/MR-0002/MR-0002REQ-TEST-0001_body.md",
    "# MR-0002REQ-TEST-0001\n\nGoverned body resolved through the source port.",
  ],
]);

/**
 * Creates a deterministic in-memory source port for service-level tests.
 *
 * @returns {{loadSnapshot(): Promise<Record<string, unknown>>, loadBodyContent(projectPath: string): Promise<string|null>}} Source port.
 */
function createFixtureSourcePort() {
  return {
    async loadSnapshot() {
      return fixtureSnapshot;
    },
    async loadBodyContent(projectPath) {
      return fixtureBodies.get(projectPath) ?? null;
    },
  };
}

test("normalizes comma-separated and alias query values", () => {
  const query = normalizeDocumentationQuery({
    mr: "MR-0002, MR-0007",
    type: ["requirement", "adr"],
    implementation_state: "implemented",
    acceptance_state: "accepted",
    q: "  explorer  ",
  });

  assert.deepEqual(query.mr, ["MR-0002", "MR-0007"]);
  assert.deepEqual(query.kind, ["requirement", "adr"]);
  assert.deepEqual(query.implementation_state, ["implemented"]);
  assert.deepEqual(query.acceptance_state, ["accepted"]);
  assert.equal(query.q, "explorer");
});

test("filters documentation items by macro requirement and graph-derived implementation state", async () => {
  const service = createProjectDocumentationExplorerService({ sourcePort: createFixtureSourcePort() });
  const model = await service.getDocumentation({
    query: {
      mr: "MR-0002",
      kind: "requirement",
      implementation_state: "implemented",
      q: "Explorer",
    },
  });

  assert.equal(model.summary.total_items, 6);
  assert.equal(model.summary.filtered_items, 1);
  assert.equal(model.items[0].id, "MR-0002REQ-TEST-0001");
  assert.equal(model.items[0].implementation_state, "implemented");
  assert.equal(model.items[0].acceptance_state, "accepted");

  const macroFacet = model.filters.find((facet) => facet.id === "mr");
  assert.equal(macroFacet.values.find((value) => value.value === "MR-0002")?.selected, true);
});

test("loads governed body content for detail view-models through the source port", async () => {
  const service = createProjectDocumentationExplorerService({ sourcePort: createFixtureSourcePort() });
  const detail = await service.getDetail({ id: "MR-0002REQ-TEST-0001" });

  assert.equal(detail.item.id, "MR-0002REQ-TEST-0001");
  assert.equal(detail.body.available, true);
  assert.equal(
    detail.body.path,
    "docs/reference/project-model/body/requirements/MR-0002/MR-0002REQ-TEST-0001_body.md",
  );
  assert.match(detail.body.content_markdown, /Governed body resolved through the source port/u);
  assert.equal(detail.outgoing_relations.length, 1);
});
