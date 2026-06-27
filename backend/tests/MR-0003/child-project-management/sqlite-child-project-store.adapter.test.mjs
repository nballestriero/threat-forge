import assert from "node:assert/strict";
import test from "node:test";
import { createSqliteChildProjectStore } from "../../../src/MR-0003/child-project-management/adapters/sqlite-child-project-store.adapter.mjs";
import { assertChildProjectStorePort } from "../../../src/MR-0003/child-project-management/ports/child-project-store.port.mjs";

test("persists child projects behind the storage port without exposing SQLite to callers", async () => {
  const store = createSqliteChildProjectStore({
    databasePath: ":memory:",
    now: () => "2026-06-27T10:00:00.000Z",
  });
  try {
    assertChildProjectStorePort(store);

    const saved = await store.saveChildProject({
      id: "example-child",
      name: "Example Child",
      repository: {
        kind: "local",
        local_path: "../example-child",
        default_branch: "master",
      },
    });

    assert.equal(saved.id, "example-child");
    assert.equal(saved.repository.kind, "local");
    assert.equal(saved.project_model.root, "docs/reference/project-model");
    assert.equal(saved.lifecycle_policy.document_first_required, true);
    assert.equal(saved.lifecycle_policy.direct_push_allowed, false);
    assert.equal(saved.created_at, "2026-06-27T10:00:00.000Z");

    const listed = await store.listChildProjects();
    assert.equal(listed.length, 1);
    assert.equal((await store.getChildProject("example-child"))?.name, "Example Child");
  } finally {
    store.close();
  }
});

test("stores child project check runs with gate results and violations", async () => {
  const store = createSqliteChildProjectStore({ databasePath: ":memory:" });
  try {
    await store.saveChildProject({
      id: "example-child",
      name: "Example Child",
      repository: { kind: "git", url: "https://example.invalid/example-child.git" },
    });

    const savedRun = await store.saveChildProjectCheckRun({
      id: "run-1",
      child_project_id: "example-child",
      checked_at: "2026-06-27T11:00:00.000Z",
      repository_head: "abc1234",
      branch: "master",
      overall_status: "fail",
      gate_results: [
        { gate_name: "child-project-standard-project-model", status: "pass", summary: "Skeleton valid." },
        { gate_name: "child-project-code-traceability", status: "fail", summary: "Untraced source file." },
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

    assert.equal(savedRun.gate_results.length, 2);
    assert.equal(savedRun.violations[0]?.severity, "blocking");

    const states = await store.listChildProjectOperationalStates();
    assert.equal(states.length, 1);
    assert.equal(states[0].latest_check_run?.repository_head, "abc1234");
    assert.equal(states[0].latest_check_run?.gate_results[1]?.status, "fail");
  } finally {
    store.close();
  }
});

test("keeps the latest operational state derived from the newest check run", async () => {
  const store = createSqliteChildProjectStore({ databasePath: ":memory:" });
  try {
    await store.saveChildProject({
      id: "example-child",
      name: "Example Child",
      repository: { kind: "local", local_path: "../example-child" },
    });

    await store.saveChildProjectCheckRun({
      id: "run-old",
      child_project_id: "example-child",
      checked_at: "2026-06-27T09:00:00.000Z",
      overall_status: "fail",
    });
    await store.saveChildProjectCheckRun({
      id: "run-new",
      child_project_id: "example-child",
      checked_at: "2026-06-27T12:00:00.000Z",
      overall_status: "pass",
    });

    const states = await store.listChildProjectOperationalStates();
    assert.equal(states[0].latest_check_run?.id, "run-new");
    assert.equal(states[0].latest_check_run?.overall_status, "pass");
  } finally {
    store.close();
  }
});

test("rejects check runs for unknown child projects through SQLite foreign keys", async () => {
  const store = createSqliteChildProjectStore({ databasePath: ":memory:" });
  try {
    await assert.rejects(
      () => store.saveChildProjectCheckRun({
        id: "run-1",
        child_project_id: "missing-child",
        checked_at: "2026-06-27T11:00:00.000Z",
        overall_status: "pass",
      }),
      /FOREIGN KEY/u,
    );
  } finally {
    store.close();
  }
});
