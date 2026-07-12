import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createChildProjectManagementHttpServer } from "../../../src/MR-0003/child-project-management/child-project-management.http-server.mjs";
import { createChildProjectManagementModule } from "../../../src/MR-0003/child-project-management/child-project-management.module.mjs";

/**
 * @file Runtime tests for project-scoped child documentation API boundaries.
 *
 * @verifiesRequirement MR-0003REQ-0068
 * @verifiesRequirement MR-0003REQ-0069
 * @derivedFromDecision MR-0003/ADR-0015
 * @macroRequirement MR-0003
 *
 * These tests exercise the backend child-project-scoped Project Documentation
 * Explorer API. They use a static demo child Project Model and in-memory child
 * project store fixtures only. They do not mutate child project repositories,
 * start long-lived listeners, clone Git repositories, use frontend global child
 * URLs, or fall back to threat-forge platform documentation.
 */

const currentFilePath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(currentFilePath), "../../../..");
const demoChildLocalPath = "examples/child-projects/minimal-governed-child-project";

/**
 * Creates a deterministic in-memory child project management store.
 *
 * @param {Record<string, unknown>} [overrides] - Child project field overrides.
 * @returns {Record<string, Function>} Store port shape.
 */
function createFixtureStore(overrides = {}) {
  const childProject = {
    id: "example-child",
    name: "Example Child Project",
    repository: {
      kind: "local",
      url: null,
      local_path: demoChildLocalPath,
      default_branch: "master",
    },
    project_model: {
      root: "docs/reference/project-model",
      governance_profile: "threat-forge-standard-child-project",
    },
    lifecycle_policy: {
      document_first_required: true,
      code_traceability_required: true,
      threat_analysis_pre_code_required: "reserved",
      governed_commit_push_required: true,
      direct_push_allowed: false,
    },
    archived: false,
    created_at: "2026-06-27T00:00:00.000Z",
    updated_at: "2026-06-27T00:00:00.000Z",
    ...overrides,
  };

  return {
    async listChildProjects() { return [childProject]; },
    async getChildProject(childProjectId) { return childProjectId === childProject.id ? childProject : null; },
    async saveChildProject(nextChildProject) { return nextChildProject; },
    async saveChildProjectCheckRun(checkRun) { return checkRun; },
    async listChildProjectOperationalStates() {
      return [{ child_project: childProject, latest_check_run: null }];
    },
  };
}

/**
 * Creates a composed API fixture.
 *
 * @param {Record<string, unknown>} [childProjectOverrides] - Child project field overrides.
 * @returns {ReturnType<typeof createChildProjectManagementModule>} Child project management module.
 */
function createFixtureModule(childProjectOverrides = {}) {
  return createChildProjectManagementModule({
    storePort: createFixtureStore(childProjectOverrides),
    repositoryRoot,
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

const authHeaders = Object.freeze({
  "x-threat-forge-authenticated": "true",
  "x-threat-forge-role": "registered_user",
});

test("adds project-scoped child documentation routes", () => {
  const module = createFixtureModule();
  assert.deepEqual(module.routes.map((route) => route.path), [
    "/api/child-projects",
    "/api/child-projects/:id",
    "/api/child-projects/:id/documentation",
    "/api/child-projects/:id/documentation/entities/:entityId",
  ]);
});

test("serves child project documentation collection through a project-scoped API", async () => {
  const module = createFixtureModule();
  const server = createChildProjectManagementHttpServer(module);
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/child-projects/example-child/documentation?kind=requirement`, {
      headers: authHeaders,
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.summary.total_items > 0, true);
    assert.equal(payload.query.kind[0], "requirement");
    assert.equal(payload.items.some((item) => item.id === "MR-0000REQ-0001"), true);
    assert.equal(payload.items.some((item) => item.id.startsWith("MR-0003REQ-")), false);
  } finally {
    await close(server);
  }
});

test("serves child project documentation entity details through a project-scoped API", async () => {
  const module = createFixtureModule();
  const server = createChildProjectManagementHttpServer(module);
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/child-projects/example-child/documentation/entities/MR-0000REQ-0001`, {
      headers: authHeaders,
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.item.id, "MR-0000REQ-0001");
    assert.equal(payload.body.available, true);
    assert.match(payload.body.content_markdown, /Document-First/u);
  } finally {
    await close(server);
  }
});

test("keeps unavailable child project documentation sources explicit over HTTP", async () => {
  const module = createFixtureModule({
    repository: {
      kind: "local",
      url: null,
      local_path: "examples/child-projects/missing-child-project",
      default_branch: "master",
    },
  });
  const server = createChildProjectManagementHttpServer(module);
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/child-projects/example-child/documentation`, {
      headers: authHeaders,
    });
    const payload = await response.json();

    assert.equal(response.status, 409);
    assert.equal(payload.error, "documentation_source_unavailable");
    assert.match(payload.message, /Project Model directory is not available/u);
  } finally {
    await close(server);
  }
});
