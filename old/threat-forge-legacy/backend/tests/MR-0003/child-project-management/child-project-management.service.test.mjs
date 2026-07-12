import assert from "node:assert/strict";
import test from "node:test";
import { createChildProjectManagementService } from "../../../src/MR-0003/child-project-management/child-project-management.service.mjs";

function createMemoryStore() {
  const childProjects = new Map();
  const checkRuns = new Map();

  function latestCheckRun(childProjectId) {
    return [...checkRuns.values()]
      .filter((checkRun) => checkRun.child_project_id === childProjectId)
      .sort((left, right) => String(right.checked_at).localeCompare(String(left.checked_at)))[0] ?? null;
  }

  return {
    async listChildProjects() {
      return [...childProjects.values()].sort((left, right) => left.id.localeCompare(right.id));
    },
    async getChildProject(childProjectId) {
      return childProjects.get(childProjectId) ?? null;
    },
    async saveChildProject(childProject) {
      childProjects.set(childProject.id, childProject);
      return childProject;
    },
    async saveChildProjectCheckRun(checkRun) {
      checkRuns.set(checkRun.id, checkRun);
      return checkRun;
    },
    async listChildProjectOperationalStates() {
      return [...childProjects.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((childProject) => ({
          child_project: childProject,
          latest_check_run: latestCheckRun(childProject.id),
        }));
    },
  };
}

test("lists child project operational states through the replaceable storage port", async () => {
  const service = createChildProjectManagementService({ storePort: createMemoryStore() });

  await service.registerChildProject({
    principal: { authenticated: true },
    childProject: {
      id: "example-child",
      name: "Example Child",
      repository: { kind: "local", local_path: "../example-child" },
    },
  });
  await service.recordCheckRun({
    checkRun: {
      id: "run-1",
      child_project_id: "example-child",
      checked_at: "2026-06-27T12:00:00.000Z",
      repository_head: "abc1234",
      branch: "master",
      overall_status: "pass",
      gate_results: [{ gate_name: "child-project-standard-project-model", status: "pass", summary: "Valid." }],
    },
  });

  const model = await service.listOperationalStates({ principal: { authenticated: true } });

  assert.deepEqual(model.capabilities, [
    "child_projects.list",
    "child_projects.read",
    "child_projects.view_operational_state",
  ]);
  assert.equal(model.items.length, 1);
  assert.equal(model.items[0].child_project.id, "example-child");
  assert.equal(model.items[0].latest_check_run?.overall_status, "pass");
});

test("reads one child project operational state by id", async () => {
  const service = createChildProjectManagementService({ storePort: createMemoryStore() });
  await service.registerChildProject({
    childProject: {
      id: "example-child",
      name: "Example Child",
      repository: { kind: "git", url: "https://example.invalid/example-child.git" },
    },
  });

  const found = await service.getOperationalState({ childProjectId: "example-child" });
  const missing = await service.getOperationalState({ childProjectId: "missing-child" });

  assert.equal(found?.child_project.repository.kind, "git");
  assert.equal(missing, null);
});

test("keeps capability resolution replaceable for future RBAC", async () => {
  const service = createChildProjectManagementService({
    storePort: createMemoryStore(),
    resolveCapabilities: (principal) => principal?.role === "registered_user" ? ["child_projects.list"] : [],
  });

  const anonymous = await service.listOperationalStates({ principal: {} });
  const registered = await service.listOperationalStates({ principal: { role: "registered_user" } });

  assert.deepEqual(anonymous.capabilities, []);
  assert.deepEqual(registered.capabilities, ["child_projects.list"]);
});

test("rejects invalid service inputs before delegating to adapters", async () => {
  const service = createChildProjectManagementService({ storePort: createMemoryStore() });

  await assert.rejects(
    () => service.registerChildProject({ childProject: { id: "Invalid Space", name: "Broken" } }),
    /Invalid/u,
  );
  await assert.rejects(() => service.getOperationalState({ childProjectId: "" }), /required/u);
  assert.throws(() => createChildProjectManagementService({ storePort: {} }), /missing required methods/u);
});
