import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeGovernedDocumentAuthoringTasks,
  validateGovernedDocumentAuthoringTasks,
} from "../materialize-vscode-governed-document-authoring-adapter.mjs";

/**
 * @file Verification of the thin VS Code governed-document authoring adapter.
 *
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0002
 * @implementsRequirement MR-0002ADR-0006REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0002/ADR-0006
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 */

const unrelatedTask = {
  label: "ThreatForge: repo-check",
  type: "process",
  command: "node",
  args: ["tools/repo-check.mjs"],
  options: { cwd: "${workspaceFolder}" },
  problemMatcher: [],
  presentation: { reveal: "always", panel: "shared", clear: true },
};

const unrelatedInput = { id: "unrelatedInput", type: "promptString" };

test("adds managed tasks and preserves unrelated workspace configuration", () => {
  const merged = mergeGovernedDocumentAuthoringTasks({
    version: "2.0.0",
    tasks: [unrelatedTask],
    inputs: [unrelatedInput],
  });
  assert.deepEqual(merged.tasks[0], unrelatedTask);
  assert.deepEqual(
    merged.tasks.slice(1).map((task) => task.label),
    [
      "ThreatForge: preview governed document authoring",
      "ThreatForge: create governed document authoring",
      "ThreatForge: install governed Markdown assistance",
    ],
  );
  assert.deepEqual(merged.inputs, [unrelatedInput]);
  validateGovernedDocumentAuthoringTasks(merged);
});

test("managed tasks delegate the active request file without automatic confirmation", () => {
  const merged = mergeGovernedDocumentAuthoringTasks({ version: "2.0.0", tasks: [] });
  const authoringTasks = merged.tasks.filter((task) =>
    task.label.includes("document authoring"),
  );
  for (const task of authoringTasks) {
    assert.equal(task.command, "node");
    assert.equal(task.options.cwd, "${workspaceFolder}");
    assert.equal(task.args[0], "tools/MR-0002/run-governed-document-authoring.mjs");
    assert.equal(task.args[2], "--request");
    assert.equal(task.args[3], "${relativeFile}");
    assert.equal(task.args.includes("create"), false);
  }
  const installTask = merged.tasks.find((task) =>
    task.label.includes("install governed Markdown assistance"),
  );
  assert.deepEqual(installTask.args, [
    "tools/MR-0002/install-vscode-governed-markdown-assistance.mjs",
    "--install",
  ]);
  validateGovernedDocumentAuthoringTasks(merged);
});

test("adapter validation rejects divergent managed tasks", () => {
  const merged = mergeGovernedDocumentAuthoringTasks({ version: "2.0.0", tasks: [] });
  merged.tasks[0].args[3] = "authoring/static.yml";
  assert.throws(
    () => validateGovernedDocumentAuthoringTasks(merged),
    /differs from the generated adapter projection/u,
  );
});

test("task projection is idempotent", () => {
  const first = mergeGovernedDocumentAuthoringTasks({ version: "2.0.0", tasks: [unrelatedTask], inputs: [unrelatedInput] });
  const second = mergeGovernedDocumentAuthoringTasks(first);
  assert.deepEqual(second, first);
});
