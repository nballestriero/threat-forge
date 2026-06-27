import assert from "node:assert/strict";
import test from "node:test";
import {
  childProjectManagementCapabilities,
  parseChildProjectCheckRun,
  parseChildProjectOperationalStateList,
  parseChildProjectRecord,
} from "../../../src/MR-0003/child-project-management/child-project-management.contract.mjs";
import {
  assertChildProjectStorePort,
  getMissingChildProjectStorePortMethods,
  requiredChildProjectStorePortMethods,
} from "../../../src/MR-0003/child-project-management/ports/child-project-store.port.mjs";

test("parses child project records without exposing storage adapter details", () => {
  const record = parseChildProjectRecord({
    id: "example-child",
    name: "Example Child",
    repository: {
      kind: "git",
      url: "https://example.invalid/example-child.git",
      default_branch: "master",
    },
  });

  assert.equal(record.project_model.root, "docs/reference/project-model");
  assert.equal(record.lifecycle_policy.document_first_required, true);
  assert.equal(record.lifecycle_policy.code_traceability_required, true);
  assert.equal(record.lifecycle_policy.threat_analysis_pre_code_required, "reserved");
  assert.equal(record.lifecycle_policy.direct_push_allowed, false);
});

test("parses operational state with check-run results and violations", () => {
  const checkRun = parseChildProjectCheckRun({
    id: "run-1",
    child_project_id: "example-child",
    checked_at: "2026-06-27T00:00:00.000Z",
    overall_status: "fail",
    gate_results: [
      { gate_name: "child-project-standard-project-model", status: "pass", summary: "Skeleton valid." },
      { gate_name: "child-project-code-traceability", status: "fail", summary: "Untraced code." },
    ],
    violations: [
      {
        gate_name: "child-project-code-traceability",
        severity: "blocking",
        code: "untraced_implementation_file",
        path: "src/index.mjs",
        message: "Implementation file is not linked to a governed requirement.",
      },
    ],
  });

  const list = parseChildProjectOperationalStateList({
    capabilities: [childProjectManagementCapabilities.list, childProjectManagementCapabilities.viewOperationalState],
    items: [
      {
        child_project: {
          id: "example-child",
          name: "Example Child",
          repository: { kind: "local", local_path: "../example-child" },
        },
        latest_check_run: checkRun,
      },
    ],
  });

  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].latest_check_run?.violations[0]?.severity, "blocking");
});

test("asserts child project store adapter shape through a replaceable port", async () => {
  const memoryAdapter = {
    async listChildProjects() { return []; },
    async getChildProject() { return null; },
    async saveChildProject(childProject) { return childProject; },
    async saveChildProjectCheckRun(checkRun) { return checkRun; },
    async listChildProjectOperationalStates() { return []; },
  };

  const port = assertChildProjectStorePort(memoryAdapter);
  assert.deepEqual(getMissingChildProjectStorePortMethods(port), []);
  assert.equal((await port.listChildProjects()).length, 0);
  assert.deepEqual(requiredChildProjectStorePortMethods, [
    "listChildProjects",
    "getChildProject",
    "saveChildProject",
    "saveChildProjectCheckRun",
    "listChildProjectOperationalStates",
  ]);
});

test("rejects adapters that do not implement the storage port", () => {
  assert.deepEqual(getMissingChildProjectStorePortMethods({}), requiredChildProjectStorePortMethods);
  assert.throws(() => assertChildProjectStorePort({ listChildProjects() { return []; } }), /missing required methods/u);
});
