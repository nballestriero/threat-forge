import assert from "node:assert/strict";
import test from "node:test";

import { createChildProjectManagementModule } from "../../../src/MR-0003/child-project-management/child-project-management.module.mjs";
import { createChildProjectManagementHttpServer } from "../../../src/MR-0003/child-project-management/child-project-management.http-server.mjs";

/**
 * @file Runtime smoke tests for child project management read-only API boundaries.
 *
 * @verifiesRequirement MR-0003REQ-0014
 * @verifiesRequirement MR-0003REQ-0015
 * @verifiesRequirement MR-0003REQ-0025
 * @verifiesRequirement MR-0003REQ-0026
 * @derivedFromDecision MR-0003/ADR-0002
 * @derivedFromDecision MR-0003/ADR-0005
 * @macroRequirement MR-0003
 *
 * These tests exercise the child project management controller, route descriptors,
 * module composition and native Node.js read-only HTTP adapter without mutating
 * child project repositories, running validators, starting long-lived listeners,
 * generating skeletons, performing Git operations, or binding the service to a
 * concrete database from controller code.
 */

/**
 * Creates a deterministic in-memory child project management store.
 *
 * @returns {Record<string, Function>} Store port shape.
 */
function createFixtureStore() {
  const childProject = {
    id: "example-child",
    name: "Example Child Project",
    repository: {
      kind: "local",
      url: null,
      local_path: "../example-child",
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
  };
  const latestCheckRun = {
    id: "check-example-child-1",
    child_project_id: "example-child",
    checked_at: "2026-06-27T00:01:00.000Z",
    repository_head: "abc123",
    branch: "master",
    overall_status: "pass",
    gate_results: [
      {
        gate_name: "child-project-standard-project-model",
        status: "pass",
        summary: "Standard Project Model skeleton is valid.",
      },
    ],
    violations: [],
  };

  return {
    async listChildProjects() {
      return [childProject];
    },
    async getChildProject(childProjectId) {
      return childProjectId === childProject.id ? childProject : null;
    },
    async saveChildProject(nextChildProject) {
      return nextChildProject;
    },
    async saveChildProjectCheckRun(checkRun) {
      return checkRun;
    },
    async listChildProjectOperationalStates() {
      return [{ child_project: childProject, latest_check_run: latestCheckRun }];
    },
  };
}

/**
 * Creates a composed API fixture.
 *
 * @returns {ReturnType<typeof createChildProjectManagementModule>} Child project management module.
 */
function createFixtureModule() {
  return createChildProjectManagementModule({ storePort: createFixtureStore() });
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

test("composes read-only child project management routes", () => {
  const module = createFixtureModule();
  assert.deepEqual(module.routes.map((route) => route.path), ["/api/child-projects", "/api/child-projects/:id"]);
  assert.deepEqual(module.routes.map((route) => route.method), ["GET", "GET"]);
});

test("lists child project operational states through the controller", async () => {
  const module = createFixtureModule();
  const payload = await module.controller.listChildProjects({
    principal: { authenticated: true, role: "registered_user" },
  });

  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].child_project.id, "example-child");
  assert.equal(payload.items[0].latest_check_run.overall_status, "pass");
  assert.match(payload.capabilities.join(","), /child_projects.list/u);
});

test("rejects unauthenticated child project API callers", async () => {
  const module = createFixtureModule();
  await assert.rejects(
    () => module.controller.listChildProjects({ principal: { authenticated: false } }),
    /Access denied for capability: child_projects\.list/u,
  );
});

test("serves child project management collection over HTTP GET", async () => {
  const module = createFixtureModule();
  const server = createChildProjectManagementHttpServer(module);
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/child-projects`, {
      headers: {
        "x-threat-forge-authenticated": "true",
        "x-threat-forge-role": "registered_user",
      },
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(payload.items[0].child_project.id, "example-child");
  } finally {
    await close(server);
  }
});

test("serves one child project operational state over HTTP GET", async () => {
  const module = createFixtureModule();
  const server = createChildProjectManagementHttpServer(module);
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/child-projects/example-child`, {
      headers: {
        "x-threat-forge-authenticated": "true",
        "x-threat-forge-role": "registered_user",
      },
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.child_project.id, "example-child");
    assert.equal(payload.latest_check_run.gate_results[0].status, "pass");
  } finally {
    await close(server);
  }
});

test("keeps child project management HTTP API read-only", async () => {
  const module = createFixtureModule();
  const server = createChildProjectManagementHttpServer(module);
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/child-projects`, { method: "POST" });
    const payload = await response.json();

    assert.equal(response.status, 405);
    assert.equal(payload.error, "method_not_allowed");
  } finally {
    await close(server);
  }
});

test("maps absent child projects to not found responses", async () => {
  const module = createFixtureModule();
  const server = createChildProjectManagementHttpServer(module);
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/child-projects/missing-child`, {
      headers: {
        "x-threat-forge-authenticated": "true",
        "x-threat-forge-role": "registered_user",
      },
    });
    const payload = await response.json();

    assert.equal(response.status, 404);
    assert.equal(payload.error, "not_found");
  } finally {
    await close(server);
  }
});
