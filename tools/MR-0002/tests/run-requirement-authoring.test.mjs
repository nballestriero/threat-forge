import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  documentModelIndexProjectPath,
  documentModelSchemaProjectPath,
  loadGovernedDocumentModelSourceSet,
} from "../../MR-0001/lib/governed-document-model-sources.mjs";

/**
 * @file Verifica del consumer e wizard governato di Requirement authoring.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0003GOV-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0001GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Verifies canonical request validation, dynamic wizard choices, read-only
 * preview, explicit confirmation, successful atomic creation, replay-safe
 * behavior and rollback when the mandatory post-creation check fails.
 */

const testPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(
  path.dirname(testPath),
  "..",
  "..",
  "..",
);
const runnerPath = path.join(
  projectRoot,
  "tools",
  "MR-0002",
  "run-requirement-authoring.mjs",
);
const runnerUrl = pathToFileURL(runnerPath).href;
const {
  collectInteractiveRequirementAuthoringRequest,
  loadRequirementAuthoringCatalog,
  planRequirementAuthoring,
  validateRequirementAuthoringRequest,
} = await import(runnerUrl);
const catalog = loadRequirementAuthoringCatalog({ rootDir: projectRoot });
const documentModelSourceSet = loadGovernedDocumentModelSourceSet({
  rootDir: projectRoot,
});

/** @param {string} root @param {string} projectPath @returns {string} */
function resolveProjectPath(root, projectPath) {
  return path.join(root, ...projectPath.split("/"));
}

/**
 * Copies every canonical source declared by the authoring catalog.
 *
 * @param {string} workspace - Fixture root.
 * @returns {void}
 */
function copyCanonicalSources(workspace) {
  const sourcePaths = new Set([
    ...catalog.sources.map((source) => source.path),
    documentModelSchemaProjectPath,
    documentModelIndexProjectPath,
    ...documentModelSourceSet.models.map((source) => source.path),
    ...documentModelSourceSet.profiles.map((source) => source.path),
  ]);

  for (const projectPath of sourcePaths) {
    const sourcePath = resolveProjectPath(projectRoot, projectPath);
    const targetPath = resolveProjectPath(workspace, projectPath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

/**
 * Creates one isolated authoring workspace.
 *
 * @param {boolean} checkPasses - Whether the fixture repository check passes.
 * @returns {{workspace: string, requestProjectPath: string, requestPath: string, registryPath: string, originalRegistryText: string}}
 */
function createWorkspace(checkPasses = true) {
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "threatforge-requirement-authoring-"),
  );
  copyCanonicalSources(workspace);

  const requestProjectPath =
    "authoring/fixture.requirement-authoring.yml";
  const requestPath = resolveProjectPath(
    workspace,
    requestProjectPath,
  );
  fs.mkdirSync(path.dirname(requestPath), { recursive: true });
  fs.writeFileSync(
    requestPath,
    [
      "macro_requirement_id: MR-0002",
      "decision_id: ADR-0004",
      "requirement_type: functional",
      'title: "Authoring runner fixture"',
      "",
    ].join("\n"),
    "utf8",
  );

  const checkPath = resolveProjectPath(
    workspace,
    "tools/repo-check.mjs",
  );
  fs.mkdirSync(path.dirname(checkPath), { recursive: true });
  fs.writeFileSync(
    checkPath,
    checkPasses
      ? 'console.log("Fixture ThreatForge check passed.");\n'
      : 'console.error("Fixture ThreatForge check failed."); process.exitCode = 1;\n',
    "utf8",
  );

  const registryPath = resolveProjectPath(
    workspace,
    "docs/reference/project-model/registers/requirements/MR-0002.requirements.registry.yml",
  );
  return {
    workspace,
    requestProjectPath,
    requestPath,
    registryPath,
    originalRegistryText: fs.readFileSync(registryPath, "utf8"),
  };
}

/**
 * Runs the authoring CLI against one isolated root.
 *
 * @param {string} workspace - Fixture root.
 * @param {string[]} args - Runner arguments.
 * @param {string} [input] - Terminal input.
 * @returns {{status: number|null, output: string}}
 */
function runCli(workspace, args, input = "") {
  const result = spawnSync(
    process.execPath,
    [runnerPath, ...args],
    {
      cwd: workspace,
      encoding: "utf8",
      input,
      windowsHide: true,
      env: {
        ...process.env,
        TF_AUTHORING_ROOT: workspace,
        TF_REQUIREMENT_AUTHORING_ROOT: workspace,
        TF_REQUIREMENT_AUTHORING_CATALOG_ROOT: workspace,
        TF_REQUIREMENT_AUTHORING_SCHEMA_ROOT: workspace,
        TF_REQUIREMENT_AUTHORING_MATERIALIZER_ROOT: workspace,
        TF_VSCODE_REQUIREMENT_AUTHORING_ADAPTER_ROOT: workspace,
      },
    },
  );
  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

/** @param {ReturnType<typeof createWorkspace>} fixture @param {Record<string, unknown>} plan */
function assertNoDocumentMutation(fixture, plan) {
  assert.equal(
    fs.readFileSync(fixture.registryPath, "utf8"),
    fixture.originalRegistryText,
  );
  assert.equal(
    fs.existsSync(
      resolveProjectPath(fixture.workspace, plan.documentPlan.bodyPath),
    ),
    false,
  );
}

test("imports the runner without executing its CLI and loads the governed catalog", () => {
  assert.equal(typeof loadRequirementAuthoringCatalog, "function");
  assert.equal(typeof validateRequirementAuthoringRequest, "function");
  assert.equal(typeof planRequirementAuthoring, "function");
});

test("validates canonical scope, concrete type and parent rules", () => {
  assert.throws(
    () =>
      validateRequirementAuthoringRequest(
        {
          macro_requirement_id: "MR-9999",
          decision_id: "ADR-0004",
          requirement_type: "functional",
          title: "Unknown macro",
        },
        catalog,
      ),
    /Unknown canonical Macro-requirement/u,
  );
  assert.throws(
    () =>
      validateRequirementAuthoringRequest(
        {
          macro_requirement_id: "MR-0002",
          decision_id: "ADR-9999",
          requirement_type: "functional",
          title: "Wrong decision",
        },
        catalog,
      ),
    /does not belong to MR-0002/u,
  );
  assert.throws(
    () =>
      validateRequirementAuthoringRequest(
        {
          macro_requirement_id: "MR-0002",
          decision_id: "ADR-0004",
          requirement_type: "specialized",
          title: "Abstract type",
        },
        catalog,
      ),
    /Unknown or abstract canonical requirement_type/u,
  );
  assert.throws(
    () =>
      validateRequirementAuthoringRequest(
        {
          macro_requirement_id: "MR-0002",
          decision_id: "ADR-0004",
          requirement_type: "governance",
          title: "Missing parent",
        },
        catalog,
      ),
    /parent_requirement_id for governance/u,
  );
  assert.throws(
    () =>
      validateRequirementAuthoringRequest(
        {
          macro_requirement_id: "MR-0002",
          decision_id: "ADR-0004",
          requirement_type: "governance",
          parent_requirement_id: "MR-0002ADR-0003REQ-0001",
          title: "Cross decision parent",
        },
        catalog,
      ),
    /does not belong to MR-0002\/ADR-0004/u,
  );
  assert.throws(
    () =>
      validateRequirementAuthoringRequest(
        {
          macro_requirement_id: "MR-0002",
          decision_id: "ADR-0004",
          requirement_type: "functional",
          parent_requirement_id: "",
          title: "Forbidden parent field",
        },
        catalog,
      ),
    /functional must not declare parent_requirement_id/u,
  );
});

test("collects wizard choices exclusively from the supplied catalog", async () => {
  const answers = ["1", "1", "2", "1", "Wizard title"];
  const lines = [];
  const request = await collectInteractiveRequirementAuthoringRequest(
    {
      catalog_id: "requirement-authoring-catalog",
      requirement_types: [
        {
          value: "functional",
          meaning: "Synthetic functional",
          requires_parent_requirement: false,
          allowed_parent_requirement_types: [],
        },
        {
          value: "governance",
          meaning: "Synthetic governance",
          requires_parent_requirement: true,
          allowed_parent_requirement_types: ["functional"],
        },
      ],
      macro_requirements: [
        {
          id: "MR-7777",
          title: "Synthetic macro",
          decisions: [
            {
              id: "ADR-0009",
              title: "Synthetic decision",
              requirements: [
                {
                  id: "MR-7777ADR-0009REQ-0003",
                  title: "Synthetic parent",
                  requirement_type: "functional",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      ask: async () => answers.shift(),
      write: (line) => lines.push(line),
    },
  );

  assert.deepEqual(request, {
    macro_requirement_id: "MR-7777",
    decision_id: "ADR-0009",
    requirement_type: "governance",
    title: "Wizard title",
    parent_requirement_id: "MR-7777ADR-0009REQ-0003",
  });
  assert.match(lines.join("\n"), /MR-7777 — Synthetic macro/u);
  assert.match(lines.join("\n"), /Synthetic governance/u);
});

test("previews without mutation and requires explicit creation confirmation", () => {
  const fixture = createWorkspace(true);
  const request = {
    macro_requirement_id: "MR-0002",
    decision_id: "ADR-0004",
    requirement_type: "functional",
    title: "Authoring runner fixture",
  };
  const plan = planRequirementAuthoring(request, catalog, {
    rootDir: fixture.workspace,
    mode: "create",
  });

  try {
    const preview = runCli(
      fixture.workspace,
      ["--preview", "--request", fixture.requestProjectPath],
    );
    assert.equal(preview.status, 0, preview.output);
    assert.match(preview.output, /Mode: preview/u);
    assert.match(preview.output, /No repository file was modified/u);
    assertNoDocumentMutation(fixture, plan);

    const cancelled = runCli(
      fixture.workspace,
      ["--create", "--request", fixture.requestProjectPath],
      "\n",
    );
    assert.notEqual(cancelled.status, 0);
    assert.match(cancelled.output, /explicit confirmation "create" was not provided/u);
    assertNoDocumentMutation(fixture, plan);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});

test("creates and verifies the same previewed document after confirmation", () => {
  const fixture = createWorkspace(true);
  const request = {
    macro_requirement_id: "MR-0002",
    decision_id: "ADR-0004",
    requirement_type: "functional",
    title: "Authoring runner fixture",
  };
  const plan = planRequirementAuthoring(request, catalog, {
    rootDir: fixture.workspace,
    mode: "create",
  });
  const bodyPath = resolveProjectPath(
    fixture.workspace,
    plan.documentPlan.bodyPath,
  );

  try {
    const result = runCli(
      fixture.workspace,
      ["--create", "--request", fixture.requestProjectPath],
      "create\n",
    );
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Fixture ThreatForge check passed/u);
    assert.match(result.output, /Governed Requirement created and verified/u);
    assert.equal(
      fs.readFileSync(bodyPath, "utf8"),
      plan.documentPlan.bodyText,
    );
    assert.equal(
      fs.readFileSync(fixture.registryPath, "utf8"),
      `${fixture.originalRegistryText}${plan.documentPlan.recordBlock}`,
    );
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});

test("rolls back record and body when the post-creation check fails", () => {
  const fixture = createWorkspace(false);
  const request = {
    macro_requirement_id: "MR-0002",
    decision_id: "ADR-0004",
    requirement_type: "functional",
    title: "Authoring runner fixture",
  };
  const plan = planRequirementAuthoring(request, catalog, {
    rootDir: fixture.workspace,
    mode: "create",
  });

  try {
    const result = runCli(
      fixture.workspace,
      ["--create", "--request", fixture.requestProjectPath],
      "create\n",
    );
    assert.notEqual(result.status, 0);
    assert.match(result.output, /Post-creation ThreatForge check failed/u);
    assert.match(result.output, /Fixture ThreatForge check failed/u);
    assertNoDocumentMutation(fixture, plan);
  } finally {
    fs.rmSync(fixture.workspace, { recursive: true, force: true });
  }
});
