import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createRepositoryProjectionMaterializationSession,
  loadRepositoryProjectionMaterializers,
} from "../lib/repository-projection-materialization.mjs";
import { runGovernedRepositoryOperation } from "../run-governed-repository-operation.mjs";

/**
 * @file Deterministic verification of registered pre-gate materialization.
 *
 * @implementsRequirement MR-0002ADR-0002REQ-0002
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0002
 * @derivedFromDecision MR-0002/ADR-0002
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Verifies canonical registry order, controlled status resolution, declared
 * output boundaries, byte-level idempotence, rollback, preservation of
 * unrelated pre-existing changes, read-only check mode, and absence of staged
 * Git changes after materializer or repository-gate failures.
 */

const testPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testPath), "..", "..", "..");
const fixtureSourceDir = path.join(
  projectRoot,
  "tools",
  "MR-0002",
  "fixtures",
  "repository-materialization",
);

/** @param {string} root @param {string[]} args @returns {string} */
function runGit(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return String(result.stdout ?? "").trim();
}

/** @param {string} root @param {string} projectPath @param {string} text */
function writeProjectFile(root, projectPath, text) {
  const target = path.join(root, ...projectPath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, "utf8");
}

/** @param {string} root @param {string} fixtureName */
function copyFixture(root, fixtureName) {
  const target = path.join(root, "tools", "fixtures", fixtureName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(fixtureSourceDir, fixtureName), target);
}

/** @returns {string} */
function taxonomyText() {
  return `schema_version: 2
registry_id: documentation-field-values-taxonomy
scope: governed_documentation_fields
status: draft

field_value_sets:
  - id: FIELD-VALUE-SET-0001
    name: repository_materializer_status
    field_name: status
    applies_to_registry: docs/reference/project-model/registers/materialization/repository-projections.registry.yml
    applies_to_record: materializers
    status: draft
    description: Fixture materializer lifecycle values.
    values:
      - value: active
        meaning: The fixture materializer is executed.
      - value: disabled
        meaning: The fixture materializer is not executed.
      - value: deprecated
        meaning: The fixture materializer is retained for history.
`;
}

/** @returns {string} */
function requirementsText() {
  return `schema_version: 1
registry_id: MR-0002-requirements-registry
macro_requirement_id: MR-0002

requirements:
  - id: MR-0002ADR-0002REQ-0002
    title: Fixture functional requirement
    status: draft
    requirement_type: functional
    macro_requirement_id: MR-0002
    body_path: fixture.md

  - id: MR-0002ADR-0002REQ-0002GOV-0001
    title: Fixture boundary requirement
    status: draft
    requirement_type: governance
    macro_requirement_id: MR-0002
    parent_requirement_id: MR-0002ADR-0002REQ-0002
    body_path: fixture-gov-1.md

  - id: MR-0002ADR-0002REQ-0002GOV-0002
    title: Fixture idempotence requirement
    status: draft
    requirement_type: governance
    macro_requirement_id: MR-0002
    parent_requirement_id: MR-0002ADR-0002REQ-0002
    body_path: fixture-gov-2.md
`;
}

/**
 * Builds one canonical fixture registry.
 *
 * @param {string} fixtureName - Materializer script.
 * @param {{status?: string, generatedPaths?: string[], id?: string}} [options] - Record options.
 * @returns {string}
 */
function materializationRegistryText(fixtureName, options = {}) {
  const generatedPaths = options.generatedPaths ?? ["generated.txt"];
  return `schema_version: 1
registry_id: repository-projection-materialization-registry
scope: governed_repository_projections

materializers:
  - id: ${options.id ?? "fixture-materializer"}
    title: Fixture materializer
    status: ${options.status ?? "active"}
    write_command: node
    write_args:
      - tools/fixtures/${fixtureName}
      - --write
    check_command: node
    check_args:
      - tools/fixtures/${fixtureName}
      - --check
    generated_paths:
${generatedPaths.map((entry) => `      - ${entry}`).join("\n")}
    linked_requirement_ids:
      - MR-0002ADR-0002REQ-0002
      - MR-0002ADR-0002REQ-0002GOV-0001
      - MR-0002ADR-0002REQ-0002GOV-0002
`;
}

/**
 * Creates one isolated Git repository with a local bare upstream.
 *
 * @param {string} fixtureName - Materializer fixture file.
 * @param {{registryText?: string, gatePasses?: boolean}} [options] - Workspace options.
 * @returns {{root: string, remote: string}}
 */
function createWorkspace(fixtureName, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-materialization-"));
  const remote = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-materialization-remote-"));
  runGit(remote, ["init", "--bare"]);
  runGit(root, ["init", "-b", "master"]);
  runGit(root, ["config", "user.email", "fixture@example.com"]);
  runGit(root, ["config", "user.name", "Fixture"]);
  runGit(root, ["remote", "add", "origin", remote]);

  copyFixture(root, fixtureName);
  writeProjectFile(
    root,
    "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
    taxonomyText(),
  );
  writeProjectFile(
    root,
    "docs/reference/project-model/registers/requirements/MR-0002.requirements.registry.yml",
    requirementsText(),
  );
  writeProjectFile(
    root,
    "docs/reference/project-model/registers/materialization/repository-projections.registry.yml",
    options.registryText ?? materializationRegistryText(fixtureName),
  );
  writeProjectFile(root, "source.txt", "canonical\n");
  writeProjectFile(root, "generated.txt", "stale\n");
  writeProjectFile(root, "unrelated.txt", "baseline\n");
  writeProjectFile(
    root,
    "tools/repo-check.mjs",
    options.gatePasses === false
      ? 'console.error("Fixture repository gate failed."); process.exit(1);\n'
      : 'console.log("Fixture repository gate passed.");\n',
  );

  runGit(root, ["add", "--all"]);
  runGit(root, ["commit", "-m", "fixture baseline"]);
  runGit(root, ["push", "-u", "origin", "master"]);
  return { root, remote };
}

/** @param {{root: string, remote: string}} fixture */
function removeWorkspace(fixture) {
  fs.rmSync(fixture.root, { recursive: true, force: true });
  fs.rmSync(fixture.remote, { recursive: true, force: true });
}

test("loads active materializers in canonical registry order", () => {
  const fixture = createWorkspace("deterministic-projection.mjs");
  try {
    const registry = loadRepositoryProjectionMaterializers({ rootDir: fixture.root });
    assert.deepEqual(registry.materializers.map((entry) => entry.id), ["fixture-materializer"]);
    assert.deepEqual(registry.materializers[0].generatedPaths, ["generated.txt"]);
  } finally {
    removeWorkspace(fixture);
  }
});

test("materializes a stale projection and proves second-pass idempotence", () => {
  const fixture = createWorkspace("deterministic-projection.mjs");
  try {
    const session = createRepositoryProjectionMaterializationSession({
      rootDir: fixture.root,
      stdio: "pipe",
    });
    const result = session.execute();
    assert.deepEqual(result.activeMaterializerIds, ["fixture-materializer"]);
    assert.equal(fs.readFileSync(path.join(fixture.root, "generated.txt"), "utf8"), "canonical\n");
    session.release();
    assert.equal(session.getState(), "released");
  } finally {
    removeWorkspace(fixture);
  }
});

test("leaves an already current projection byte-identical", () => {
  const fixture = createWorkspace("deterministic-projection.mjs");
  try {
    fs.writeFileSync(path.join(fixture.root, "generated.txt"), "canonical\n", "utf8");
    const before = fs.readFileSync(path.join(fixture.root, "generated.txt"));
    const session = createRepositoryProjectionMaterializationSession({
      rootDir: fixture.root,
      stdio: "pipe",
    });
    session.execute();
    session.release();
    assert.deepEqual(fs.readFileSync(path.join(fixture.root, "generated.txt")), before);
  } finally {
    removeWorkspace(fixture);
  }
});

test("rejects non-idempotent output and restores pre-run state", () => {
  const fixture = createWorkspace("non-idempotent-projection.mjs");
  try {
    fs.writeFileSync(path.join(fixture.root, "generated.txt"), "0\n", "utf8");
    const session = createRepositoryProjectionMaterializationSession({
      rootDir: fixture.root,
      stdio: "pipe",
    });
    assert.throws(() => session.execute(), /not idempotent/u);
    assert.equal(session.getState(), "rolled_back");
    assert.equal(fs.readFileSync(path.join(fixture.root, "generated.txt"), "utf8"), "0\n");
  } finally {
    removeWorkspace(fixture);
  }
});

test("rolls back declared output after a materializer check failure", () => {
  const fixture = createWorkspace("check-failure-projection.mjs");
  try {
    const session = createRepositoryProjectionMaterializationSession({
      rootDir: fixture.root,
      stdio: "pipe",
    });
    assert.throws(() => session.execute(), /check failure|failed with exit code/u);
    assert.equal(fs.readFileSync(path.join(fixture.root, "generated.txt"), "utf8"), "stale\n");
  } finally {
    removeWorkspace(fixture);
  }
});

test("rejects undeclared output and removes it during rollback", () => {
  const fixture = createWorkspace("undeclared-output-projection.mjs");
  try {
    const session = createRepositoryProjectionMaterializationSession({
      rootDir: fixture.root,
      stdio: "pipe",
    });
    assert.throws(() => session.execute(), /changed undeclared repository paths/u);
    assert.equal(fs.readFileSync(path.join(fixture.root, "generated.txt"), "utf8"), "stale\n");
    assert.equal(fs.existsSync(path.join(fixture.root, "undeclared.txt")), false);
  } finally {
    removeWorkspace(fixture);
  }
});

test("preserves unrelated pre-existing changes during rollback", () => {
  const fixture = createWorkspace("check-failure-projection.mjs");
  try {
    fs.writeFileSync(path.join(fixture.root, "unrelated.txt"), "user change\n", "utf8");
    const session = createRepositoryProjectionMaterializationSession({
      rootDir: fixture.root,
      stdio: "pipe",
    });
    assert.throws(() => session.execute(), /failed with exit code/u);
    assert.equal(fs.readFileSync(path.join(fixture.root, "unrelated.txt"), "utf8"), "user change\n");
    assert.equal(fs.readFileSync(path.join(fixture.root, "generated.txt"), "utf8"), "stale\n");
  } finally {
    removeWorkspace(fixture);
  }
});

test("does not execute disabled materializers", () => {
  const registryText = materializationRegistryText("deterministic-projection.mjs", {
    status: "disabled",
  });
  const fixture = createWorkspace("deterministic-projection.mjs", { registryText });
  try {
    const session = createRepositoryProjectionMaterializationSession({
      rootDir: fixture.root,
      stdio: "pipe",
    });
    const result = session.execute();
    assert.deepEqual(result.activeMaterializerIds, []);
    assert.equal(fs.readFileSync(path.join(fixture.root, "generated.txt"), "utf8"), "stale\n");
    session.release();
  } finally {
    removeWorkspace(fixture);
  }
});

test("rejects unsafe and overlapping active generated paths", () => {
  const unsafeFixture = createWorkspace("deterministic-projection.mjs", {
    registryText: materializationRegistryText("deterministic-projection.mjs", {
      generatedPaths: ["../outside.txt"],
    }),
  });
  try {
    assert.throws(
      () => loadRepositoryProjectionMaterializers({ rootDir: unsafeFixture.root }),
      /unsafe|outside/u,
    );
  } finally {
    removeWorkspace(unsafeFixture);
  }

  const overlappingText = `${materializationRegistryText("deterministic-projection.mjs").trimEnd()}

  - id: second-materializer
    title: Second fixture materializer
    status: active
    write_command: node
    write_args:
      - tools/fixtures/deterministic-projection.mjs
      - --write
    check_command: node
    check_args:
      - tools/fixtures/deterministic-projection.mjs
      - --check
    generated_paths:
      - generated.txt
    linked_requirement_ids:
      - MR-0002ADR-0002REQ-0002
      - MR-0002ADR-0002REQ-0002GOV-0001
      - MR-0002ADR-0002REQ-0002GOV-0002
`;
  const overlappingFixture = createWorkspace("deterministic-projection.mjs", {
    registryText: overlappingText,
  });
  try {
    assert.throws(
      () => loadRepositoryProjectionMaterializers({ rootDir: overlappingFixture.root }),
      /overlapping generated paths/u,
    );
  } finally {
    removeWorkspace(overlappingFixture);
  }
});

test("runner check mode remains read-only and skips materializer writes", () => {
  const fixture = createWorkspace("deterministic-projection.mjs");
  try {
    const before = fs.readFileSync(path.join(fixture.root, "generated.txt"));
    const result = runGovernedRepositoryOperation({
      rootDir: fixture.root,
      mode: "--check",
    });
    assert.equal(result.materialized, false);
    assert.deepEqual(fs.readFileSync(path.join(fixture.root, "generated.txt")), before);
    assert.equal(runGit(fixture.root, ["diff", "--cached", "--name-only"]), "");
  } finally {
    removeWorkspace(fixture);
  }
});

test("runner stops before gate and Git staging after materializer failure", () => {
  const fixture = createWorkspace("check-failure-projection.mjs");
  try {
    assert.throws(
      () => runGovernedRepositoryOperation({
        rootDir: fixture.root,
        mode: "--commit-push",
        commitMessage: "fixture commit",
      }),
      /failed with exit code/u,
    );
    assert.equal(fs.readFileSync(path.join(fixture.root, "generated.txt"), "utf8"), "stale\n");
    assert.equal(runGit(fixture.root, ["diff", "--cached", "--name-only"]), "");
    assert.equal(runGit(fixture.root, ["rev-list", "--count", "HEAD"]), "1");
  } finally {
    removeWorkspace(fixture);
  }
});

test("runner rolls back materialized output when the read-only gate fails", () => {
  const fixture = createWorkspace("deterministic-projection.mjs", { gatePasses: false });
  try {
    assert.throws(
      () => runGovernedRepositoryOperation({
        rootDir: fixture.root,
        mode: "--commit-push",
        commitMessage: "fixture commit",
      }),
      /ThreatForge repository checks/u,
    );
    assert.equal(fs.readFileSync(path.join(fixture.root, "generated.txt"), "utf8"), "stale\n");
    assert.equal(runGit(fixture.root, ["diff", "--cached", "--name-only"]), "");
    assert.equal(runGit(fixture.root, ["rev-list", "--count", "HEAD"]), "1");
  } finally {
    removeWorkspace(fixture);
  }
});
