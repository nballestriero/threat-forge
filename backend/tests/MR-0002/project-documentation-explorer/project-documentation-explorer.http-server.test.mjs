import assert from "node:assert/strict";
import test from "node:test";

import { createProjectDocumentationExplorerController } from "../../../src/MR-0002/project-documentation-explorer/project-documentation-explorer.controller.mjs";
import { createProjectDocumentationExplorerHttpServer } from "../../../src/MR-0002/project-documentation-explorer/project-documentation-explorer.http-server.mjs";
import { createProjectDocumentationExplorerRoutes } from "../../../src/MR-0002/project-documentation-explorer/project-documentation-explorer.routes.mjs";

/**
 * @file Minimal HTTP smoke tests for the Project Documentation Explorer read-only server boundary.
 *
 * @verifiesRequirement MR-0002REQ-0046
 * @derivedFromDecision MR-0002/ADR-0013
 * @macroRequirement MR-0002
 *
 * These tests exercise the native Node.js HTTP transport without reading real
 * project-model sources, starting a long-lived listener, mutating files,
 * performing Git operations, adding a framework dependency, or implementing
 * dynamic MR-0007 identity semantics.
 */

const access = Object.freeze({
  authenticated: true,
  role: "registered_user",
  allowed: true,
  required_capability: "project_model.documentation.read",
  capabilities: [
    "project_model.documentation.read",
    "project_model.documentation.filter",
    "project_model.documentation.view_detail",
  ],
});

/**
 * Creates a bootstrap access policy for smoke tests.
 *
 * @returns {{evaluate(): Record<string, unknown>}} Access policy.
 */
function createAllowingAccessPolicy() {
  return {
    evaluate({ requiredCapability }) {
      return { ...access, required_capability: requiredCapability };
    },
  };
}

/**
 * Creates a deterministic controller and server for HTTP smoke tests.
 *
 * @returns {import("node:http").Server} HTTP server.
 */
function createFixtureServer() {
  const service = {
    async getDocumentation({ query, access: accessDecision }) {
      return {
        access: accessDecision,
        query,
        summary: { total_items: 1, filtered_items: 1, counts_by_kind: { requirement: 1 } },
        filters: [],
        items: [{ id: "MR-0002REQ-0046", kind: "requirement", title: "HTTP server", implementation_state: "implemented", acceptance_state: "accepted", related_requirement_ids: [], related_adr_ids: [], source_references: [] }],
      };
    },
    async getFilters({ query, access: accessDecision }) {
      return { access: accessDecision, query, filters: [] };
    },
    async getDetail({ id, access: accessDecision }) {
      if (id === "missing") throw new Error("Project documentation entity not found: missing");
      return {
        access: accessDecision,
        item: { id, kind: "adr", title: "Detail", implementation_state: "not_applicable", acceptance_state: "accepted", related_requirement_ids: [], related_adr_ids: [], source_references: [] },
        incoming_relations: [],
        outgoing_relations: [],
        body: null,
      };
    },
  };

  const controller = createProjectDocumentationExplorerController({ service, accessPolicy: createAllowingAccessPolicy() });
  const routes = createProjectDocumentationExplorerRoutes(controller);
  return createProjectDocumentationExplorerHttpServer({
    controller,
    routes,
    principalResolver() {
      return { authenticated: true, role: "registered_user" };
    },
  });
}

/**
 * Starts a server on an ephemeral local port for one test.
 *
 * @param {import("node:http").Server} server - HTTP server.
 * @returns {Promise<string>} Base URL.
 */
async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

/**
 * Stops a server after one test.
 *
 * @param {import("node:http").Server} server - HTTP server.
 * @returns {Promise<void>} Completion promise.
 */
async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("serves the governed documentation collection over HTTP GET", async () => {
  const server = createFixtureServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/project-model/documentation?mr=MR-0002&kind=requirement&q=server`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.deepEqual(payload.query.mr, "MR-0002");
    assert.equal(payload.items[0].id, "MR-0002REQ-0046");
  } finally {
    await close(server);
  }
});

test("serves entity details with decoded path parameters", async () => {
  const server = createFixtureServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/project-model/documentation/entities/${encodeURIComponent("MR-0002/ADR-0013")}`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.item.id, "MR-0002/ADR-0013");
  } finally {
    await close(server);
  }
});

test("keeps the Project Documentation Explorer HTTP boundary read-only", async () => {
  const server = createFixtureServer();
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/project-model/documentation`, { method: "POST" });
    const payload = await response.json();

    assert.equal(response.status, 405);
    assert.equal(payload.error, "method_not_allowed");
  } finally {
    await close(server);
  }
});
