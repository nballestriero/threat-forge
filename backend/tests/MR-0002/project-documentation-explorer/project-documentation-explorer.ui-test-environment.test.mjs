import assert from "node:assert/strict";
import test from "node:test";

import {
  createUiTestEnvironmentEndpoints,
  createUiTestEnvironmentProcessRegistry,
  createUiTestEnvironmentServices,
} from "../../../../tools/dev/run-ui-test-environment.mjs";

/**
 * @file Runtime tests for the local UI test environment service wiring.
 *
 * @verifiesRequirement MR-0002REQ-0071
 * @verifiesRequirement MR-0002REQ-0072
 * @derivedFromDecision MR-0002/ADR-0030
 * @macroRequirement MR-0002
 *
 * These tests verify deterministic service wiring for the developer-only UI test
 * environment. They do not spawn backend services, start Vite, mutate the demo
 * child-project workspace, write PID registries, perform network calls, commit
 * files or push to git.
 */

test("wires the demo child Project Documentation Explorer as a separate local service", () => {
  const endpoints = createUiTestEnvironmentEndpoints();
  const services = createUiTestEnvironmentServices({ endpoints });

  assert.equal(endpoints.project_documentation_explorer, "http://127.0.0.1:4174");
  assert.equal(endpoints.demo_child_project_documentation_explorer, "http://127.0.0.1:4178");
  assert.notEqual(endpoints.demo_child_project_documentation_explorer, endpoints.project_documentation_explorer);

  const childDocumentationService = services.find((service) => service.name === "demo-child-project-documentation-explorer");
  assert.ok(childDocumentationService, "expected demo child documentation service");
  assert.deepEqual(childDocumentationService.args, ["run", "backend:project-documentation-explorer:serve:demo"]);
});

test("configures the frontend with the demo child documentation HTTP source", () => {
  const endpoints = createUiTestEnvironmentEndpoints();
  const services = createUiTestEnvironmentServices({ endpoints });
  const frontendService = services.find((service) => service.name === "frontend");

  assert.ok(frontendService, "expected frontend service");
  assert.equal(frontendService.env.VITE_PROJECT_DOCUMENTATION_EXPLORER_HTTP_BASE_URL, endpoints.project_documentation_explorer);
  assert.equal(frontendService.env.VITE_CHILD_PROJECT_DOCUMENTATION_EXPLORER_HTTP_BASE_URL, endpoints.demo_child_project_documentation_explorer);
  assert.equal(frontendService.env.VITE_CHILD_PROJECT_GOVERNANCE_PLAN_HTTP_BASE_URL, endpoints.child_project_governance_plan);

  const registry = createUiTestEnvironmentProcessRegistry({
    endpoints,
    processes: [{ name: "demo-child-project-documentation-explorer", pid: 1234 }],
    repositoryRoot: "/repo",
    now: () => "2026-06-30T00:00:00.000Z",
  });
  assert.equal(registry.endpoints.demo_child_project_documentation_explorer, "http://127.0.0.1:4178");
  assert.deepEqual(registry.processes, [{ name: "demo-child-project-documentation-explorer", pid: 1234 }]);
});
