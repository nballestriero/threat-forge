import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * @file Verifica dell'adapter VS Code sottile per Requirement authoring.
 *
 * @implementsRequirement MR-0002ADR-0005REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Verifies deterministic migration from legacy static authoring prompts to two
 * core-runner tasks, preservation of unrelated workspace tasks and inputs,
 * read-only adapter checking, and rejection of bypasses, automatic
 * confirmation, invalid cwd and duplicated legacy authoring configuration.
 */

const testPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(
  path.dirname(testPath),
  "..",
  "..",
  "..",
);
const materializerPath = path.join(
  projectRoot,
  "tools",
  "MR-0002",
  "materialize-vscode-requirement-authoring-adapter.mjs",
);
const tasksPath = path.join(projectRoot, ".vscode", "tasks.json");
const {
  materializeVsCodeRequirementAuthoringAdapter,
  mergeRequirementAuthoringTasks,
  validateRequirementAuthoringTasks,
} = await import(pathToFileURL(materializerPath).href);

const previewLabel = "ThreatForge: preview requirement authoring";
const createLabel = "ThreatForge: create requirement authoring";
const runnerPath = "tools/MR-0002/run-requirement-authoring.mjs";

/** @param {unknown} value @returns {unknown} */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** @returns {Record<string, unknown>} */
function legacyTasksFixture() {
  return {
    version: "2.0.0",
    tasks: [
      {
        label: "ThreatForge: unrelated task",
        type: "process",
        command: "node",
        args: ["tools/unrelated.mjs"],
        options: { cwd: "${workspaceFolder}" },
        problemMatcher: [],
      },
      {
        label: "ThreatForge: create functional requirement dry-run",
        type: "process",
        command: "node",
        args: [
          "tools/MR-0002/create-governed-document.mjs",
          "--requirement-type",
          "functional",
          "--mr",
          "${input:threatForgeMrId}",
          "--adr",
          "${input:threatForgeAdrId}",
          "--title",
          "${input:threatForgeFunctionalRequirementTitle}",
          "--dry-run",
        ],
        options: { cwd: "${workspaceFolder}" },
        problemMatcher: [],
      },
      {
        label: "ThreatForge: create governance requirement dry-run",
        type: "process",
        command: "node",
        args: [
          "tools/MR-0002/create-governed-document.mjs",
          "--requirement-type",
          "governance",
          "--mr",
          "${input:threatForgeMrId}",
          "--parent",
          "${input:threatForgeParentRequirementId}",
          "--title",
          "${input:threatForgeGovernanceRequirementTitle}",
          "--dry-run",
        ],
        options: { cwd: "${workspaceFolder}" },
        problemMatcher: [],
      },
    ],
    inputs: [
      {
        id: "threatForgeMrId",
        type: "promptString",
        default: "MR-0002",
      },
      {
        id: "threatForgeAdrId",
        type: "promptString",
        default: "ADR-0005",
      },
      {
        id: "threatForgeFunctionalRequirementTitle",
        type: "promptString",
      },
      {
        id: "threatForgeParentRequirementId",
        type: "promptString",
        default: "MR-0002ADR-0005REQ-0001",
      },
      {
        id: "threatForgeGovernanceRequirementTitle",
        type: "promptString",
      },
      {
        id: "unrelatedInput",
        type: "promptString",
      },
    ],
  };
}

/**
 * @param {Record<string, unknown>} tasksDocument - Tasks document.
 * @param {string} label - Task label.
 * @returns {Record<string, unknown>} Matching task.
 */
function findTask(tasksDocument, label) {
  const task = tasksDocument.tasks.find((candidate) => candidate.label === label);
  assert.ok(task, `Missing task ${label}`);
  return task;
}

test("checks the current adapter without changing the managed workspace files", () => {
  const before = fs.readFileSync(tasksPath, "utf8");
  const result = materializeVsCodeRequirementAuthoringAdapter("check");
  const after = fs.readFileSync(tasksPath, "utf8");

  assert.deepEqual(result, {
    mode: "check",
    settingsStatus: "current",
    extensionsStatus: "current",
    tasksStatus: "current",
  });
  assert.equal(after, before);
});

test("replaces legacy static authoring tasks while preserving unrelated configuration", () => {
  const merged = mergeRequirementAuthoringTasks(legacyTasksFixture());
  validateRequirementAuthoringTasks(merged);

  assert.ok(
    merged.tasks.some((task) => task.label === "ThreatForge: unrelated task"),
  );
  assert.ok(merged.inputs.some((input) => input.id === "unrelatedInput"));
  assert.deepEqual(
    findTask(merged, previewLabel).args,
    [runnerPath, "--preview"],
  );
  assert.deepEqual(
    findTask(merged, createLabel).args,
    [runnerPath, "--create"],
  );
  assert.equal(
    merged.tasks.some((task) =>
      String(task.label).includes("functional requirement dry-run"),
    ),
    false,
  );
  assert.equal(
    merged.inputs.some((input) =>
      String(input.id).startsWith("threatForgeMr") ||
      String(input.id).startsWith("threatForgeAdr") ||
      String(input.id).includes("RequirementTitle") ||
      String(input.id).includes("ParentRequirement"),
    ),
    false,
  );
});

test("merging the managed fragment is deterministic and idempotent", () => {
  const first = mergeRequirementAuthoringTasks(legacyTasksFixture());
  const second = mergeRequirementAuthoringTasks(clone(first));

  assert.deepEqual(second, first);
  validateRequirementAuthoringTasks(second);
});

test("rejects a preview task that enables creation", () => {
  const invalid = mergeRequirementAuthoringTasks(legacyTasksFixture());
  findTask(invalid, previewLabel).args = [runnerPath, "--create"];

  assert.throws(
    () => validateRequirementAuthoringTasks(invalid),
    /must invoke only .* --preview/u,
  );
});

test("rejects automatic confirmation or a non-root working directory", () => {
  const autoConfirmed = mergeRequirementAuthoringTasks(legacyTasksFixture());
  findTask(autoConfirmed, createLabel).args.push("--confirm", "create");

  assert.throws(
    () => validateRequirementAuthoringTasks(autoConfirmed),
    /must invoke only .* --create/u,
  );

  const wrongCwd = mergeRequirementAuthoringTasks(legacyTasksFixture());
  findTask(wrongCwd, createLabel).options.cwd = "${workspaceFolder}/tools";

  assert.throws(
    () => validateRequirementAuthoringTasks(wrongCwd),
    /cwd must be \$\{workspaceFolder\}/u,
  );
});

test("rejects legacy bypass tasks and duplicated static authoring inputs", () => {
  const legacyTask = mergeRequirementAuthoringTasks(legacyTasksFixture());
  legacyTask.tasks.push({
    label: "ThreatForge: create functional requirement dry-run",
    type: "process",
    command: "node",
    args: ["tools/MR-0002/create-governed-document.mjs", "--dry-run"],
    options: { cwd: "${workspaceFolder}" },
    problemMatcher: [],
  });

  assert.throws(
    () => validateRequirementAuthoringTasks(legacyTask),
    /Legacy Requirement authoring task remains configured/u,
  );

  const legacyInput = mergeRequirementAuthoringTasks(legacyTasksFixture());
  legacyInput.inputs.push({
    id: "threatForgeMrId",
    type: "promptString",
    default: "MR-0002",
  });

  assert.throws(
    () => validateRequirementAuthoringTasks(legacyInput),
    /Legacy static Requirement authoring input remains configured/u,
  );
});
