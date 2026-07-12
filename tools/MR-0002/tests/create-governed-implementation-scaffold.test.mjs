import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * @file Governed implementation scaffolder integration test.
 *
 * @implementsRequirement MR-0002ADR-0003REQ-0001GOV-0002
 * @derivedFromDecision MR-0002/ADR-0003
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 */

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "..", "..", "..");
const creatorPath = path.join(repositoryRoot, "tools/MR-0002/create-governed-implementation-scaffold.mjs");
const requirementId = "MR-0002ADR-0003REQ-0001GOV-0002";
const targetProjectPath = "tools/MR-0002/generated/scaffolder-integration.test.mjs";
const registryProjectPath = "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml";

/** @param {string} workspaceRoot @returns {void} */
function createWorkspace(workspaceRoot) {
  const requirementsDir = path.join(workspaceRoot, "docs/reference/project-model/registers/requirements");
  const implementationDir = path.join(workspaceRoot, "docs/reference/project-model/registers/implementation");
  fs.mkdirSync(requirementsDir, { recursive: true });
  fs.mkdirSync(implementationDir, { recursive: true });
  fs.writeFileSync(
    path.join(requirementsDir, "MR-0002.requirements.registry.yml"),
    [
      "schema_version: 1",
      "registry_id: MR-0002-requirements-registry",
      "macro_requirement_id: MR-0002",
      "",
      "requirements:",
      `  - id: ${requirementId}`,
      "    title: Scaffolder integration fixture",
      "    status: draft",
      "    requirement_type: governance",
      "    macro_requirement_id: MR-0002",
      "    parent_requirement_id: MR-0002ADR-0003REQ-0001",
      "    body_path: fixture.md",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(implementationDir, "implementation-trace.registry.yml"),
    [
      "schema_version: 1",
      "registry_id: implementation-trace-registry",
      "scope: governed_implementation_trace",
      "",
      "artifacts:",
      "",
    ].join("\n"),
    "utf8",
  );
}

/** @param {string} workspaceRoot @param {string} title */
function runCreator(workspaceRoot, title) {
  return spawnSync(
    process.execPath,
    [
      creatorPath,
      "--requirement",
      requirementId,
      "--artifact-type",
      "test",
      "--title",
      title,
      "--path",
      targetProjectPath,
      "--confirm",
      "create",
    ],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
      env: { ...process.env, TF_IMPLEMENTATION_SCAFFOLDER_ROOT: workspaceRoot },
    },
  );
}

/** @param {string} workspaceRoot @returns {string[]} */
function findTransactionResidue(workspaceRoot) {
  const residue = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (/\.tf-.*\.(?:tmp|bak)$/u.test(entry.name)) residue.push(absolutePath);
    }
  };
  visit(workspaceRoot);
  return residue;
}

test("creates one traceable scaffold and matching registry record", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threat-forge-scaffolder-test-"));
  try {
    createWorkspace(workspaceRoot);
    const result = runCreator(workspaceRoot, "Generated integration scaffold");
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Governed implementation scaffold created\./u);

    const sourcePath = path.join(workspaceRoot, ...targetProjectPath.split("/"));
    const sourceText = fs.readFileSync(sourcePath, "utf8");
    assert.match(sourceText, new RegExp(`@implementsRequirement ${requirementId}`, "u"));
    assert.match(sourceText, /@derivedFromDecision MR-0002\/ADR-0003/u);
    assert.match(sourceText, /@macroRequirement MR-0002/u);
    assert.match(sourceText, /@implementationStatus scaffolded/u);
    assert.match(sourceText, /TODO: implement the governed test behavior\./u);

    const registryText = fs.readFileSync(path.join(workspaceRoot, ...registryProjectPath.split("/")), "utf8");
    assert.match(registryText, new RegExp(`${requirementId}IMPL-0001`, "u"));
    assert.match(registryText, /artifact_type: verification_artifact/u);
    assert.match(registryText, /status: scaffolded/u);
    assert.match(registryText, new RegExp(`scaffolded_path: ${targetProjectPath.replaceAll("/", "\\/")}`, "u"));
    assert.match(registryText, new RegExp(`verification_command: node --test ${targetProjectPath.replaceAll("/", "\\/")}`, "u"));
    assert.deepEqual(findTransactionResidue(workspaceRoot), []);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("rejects a repeated target without changing source or registry", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threat-forge-scaffolder-repeat-test-"));
  try {
    createWorkspace(workspaceRoot);
    const firstResult = runCreator(workspaceRoot, "First integration scaffold");
    assert.equal(firstResult.status, 0, firstResult.stderr || firstResult.stdout);

    const sourcePath = path.join(workspaceRoot, ...targetProjectPath.split("/"));
    const registryPath = path.join(workspaceRoot, ...registryProjectPath.split("/"));
    const sourceBefore = fs.readFileSync(sourcePath, "utf8");
    const registryBefore = fs.readFileSync(registryPath, "utf8");

    const repeatedResult = runCreator(workspaceRoot, "Repeated integration scaffold");
    assert.notEqual(repeatedResult.status, 0);
    assert.match(`${repeatedResult.stdout}\n${repeatedResult.stderr}`, /Refusing to overwrite existing path/u);
    assert.equal(fs.readFileSync(sourcePath, "utf8"), sourceBefore);
    assert.equal(fs.readFileSync(registryPath, "utf8"), registryBefore);
    assert.deepEqual(findTransactionResidue(workspaceRoot), []);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});
