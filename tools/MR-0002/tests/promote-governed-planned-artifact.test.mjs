import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * @file Governed planned artifact promotion verification.
 *
 * @implementsRequirement MR-0002ADR-0003REQ-0003GOV-0001
 * @derivedFromDecision MR-0002/ADR-0003
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Verifies positive lifecycle transition, exact CLI confirmation, non-source
 * scope, safe path handling, governed Node verification, byte preservation,
 * rollback behavior and transaction residue cleanup.
 */

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..", "..", "..");
const toolPath = path.join(rootDir, "tools", "MR-0002", "promote-governed-planned-artifact.mjs");
const artifactId = "MR-0005ADR-0002REQ-0001GOV-0002IMPL-0099";
const requirementId = "MR-0005ADR-0002REQ-0001GOV-0002";
const registryProjectPath = "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml";

/** @param {string} value @returns {string} */
function yamlScalar(value) {
  return JSON.stringify(String(value));
}

/** @param {string} workspace @returns {string} */
function registryPath(workspace) {
  return path.join(workspace, ...registryProjectPath.split("/"));
}

/** @param {string} workspace @param {string} projectPath @returns {string} */
function absoluteProjectPath(workspace, projectPath) {
  return path.join(workspace, ...String(projectPath).replaceAll("\\", "/").split("/"));
}

/** @param {string} workspace @returns {Record<string,string>} */
function snapshotWorkspace(workspace) {
  const snapshot = {};
  function walk(current) {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolutePath);
      else snapshot[path.relative(workspace, absolutePath).replaceAll("\\", "/")] = fs.readFileSync(absolutePath).toString("base64");
    }
  }
  walk(workspace);
  return snapshot;
}

/** @param {string} workspace */
function assertNoTransactionResidues(workspace) {
  const residues = Object.keys(snapshotWorkspace(workspace)).filter((entry) => /\.tf-.*\.(?:tmp|bak)$/u.test(entry));
  assert.deepEqual(residues, []);
}

/**
 * @param {{status?: string, artifactType?: string, artifactProjectPath?: string, artifactText?: string, includeArtifact?: boolean, verificationCommand?: string, repoCheckText?: string, duplicateRecord?: boolean, omitPlannedPath?: boolean, scaffoldedPath?: string, implementedPath?: string}} [options]
 */
function createWorkspace(options = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-planned-promotion-"));
  const status = options.status ?? "planned";
  const artifactType = options.artifactType ?? "fixture";
  const artifactProjectPath = options.artifactProjectPath ?? "artifacts/generated/example.schema.json";
  const artifactText = options.artifactText ?? '{"schema_version":1,"id":"example"}\n';
  const verificationCommand = options.verificationCommand ?? "node tools/repo-check.mjs";
  const artifactPath = absoluteProjectPath(workspace, artifactProjectPath);
  const tracePath = registryPath(workspace);
  const repoCheckPath = absoluteProjectPath(workspace, "tools/repo-check.mjs");

  fs.mkdirSync(path.dirname(tracePath), { recursive: true });
  fs.mkdirSync(path.dirname(repoCheckPath), { recursive: true });
  fs.writeFileSync(repoCheckPath, options.repoCheckText ?? "process.exit(0);\n", "utf8");
  if (options.includeArtifact !== false) {
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, artifactText, "utf8");
  }

  const record = [
    `  - id: ${artifactId}`,
    '    title: "Planned materialized artifact"',
    `    artifact_type: ${artifactType}`,
    `    status: ${status}`,
    "    linked_requirement_ids:",
    `      - ${requirementId}`,
    ...(options.omitPlannedPath ? [] : [`    planned_path: ${artifactProjectPath}`]),
    ...(options.scaffoldedPath ? [`    scaffolded_path: ${options.scaffoldedPath}`] : []),
    ...(options.implementedPath ? [`    implemented_path: ${options.implementedPath}`] : []),
    '    reason: "Verification fixture."',
    `    verification_command: ${verificationCommand}`,
  ].join("\n");
  const registry = [
    "schema_version: 1",
    "registry_id: implementation-trace-registry",
    "scope: governed_implementation_trace",
    "",
    "artifacts:",
    record,
    ...(options.duplicateRecord ? [record] : []),
    "",
  ].join("\n");
  fs.writeFileSync(tracePath, registry, "utf8");
  return { workspace, artifactPath, artifactProjectPath, tracePath };
}

/** @param {string} workspace @param {string[]} args */
function runTool(workspace, args) {
  return spawnSync(process.execPath, [toolPath, ...args], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, TF_PLANNED_ARTIFACT_PROMOTION_ROOT: workspace },
  });
}

/** @param {ReturnType<typeof createWorkspace>} fixture @param {string[]} args @param {RegExp} expected */
function assertRejectedWithoutChanges(fixture, args, expected) {
  const before = snapshotWorkspace(fixture.workspace);
  const result = runTool(fixture.workspace, args);
  const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert.notEqual(result.status, 0);
  assert.match(diagnostics, expected);
  assert.deepEqual(snapshotWorkspace(fixture.workspace), before);
  assertNoTransactionResidues(fixture.workspace);
}

/** @param {ReturnType<typeof createWorkspace>} fixture */
function removeWorkspace(fixture) {
  fs.rmSync(fixture.workspace, { recursive: true, force: true });
}

test("publishes the governed non-source promotion contract", () => {
  const source = fs.readFileSync(toolPath, "utf8");
  for (const fragment of [
    "@implementsRequirement MR-0002ADR-0003REQ-0003GOV-0001",
    "@derivedFromDecision MR-0002/ADR-0003",
    "@macroRequirement MR-0002",
    "@implementationStatus implemented",
    "spawnSync(process.execPath",
    "applyRegistryTransaction(",
    "fixture and report",
  ]) {
    assert.ok(source.includes(fragment), `missing tool contract fragment: ${fragment}`);
  }
  for (const forbidden of ["shell: true", "git commit", "git push"]) {
    assert.equal(source.includes(forbidden), false, `forbidden tool fragment: ${forbidden}`);
  }
});

test("promotes one verified planned fixture without changing artifact bytes", () => {
  const fixture = createWorkspace();
  try {
    const beforeBytes = fs.readFileSync(fixture.artifactPath);
    const result = runTool(fixture.workspace, ["--artifact-id", artifactId, "--confirm", "promote"]);
    assert.equal(result.status, 0, result.stderr);
    for (const fragment of [
      "Governed planned artifact promoted.",
      `Artifact id: ${artifactId}`,
      "Status: implemented",
      `Path: ${fixture.artifactProjectPath}`,
      "Verification command: node tools/repo-check.mjs",
    ]) {
      assert.match(result.stdout, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    }
    assert.deepEqual(fs.readFileSync(fixture.artifactPath), beforeBytes);
    const registry = fs.readFileSync(fixture.tracePath, "utf8");
    assert.match(registry, /status: implemented/u);
    assert.match(registry, new RegExp(`implemented_path: ${fixture.artifactProjectPath}`, "u"));
    assert.doesNotMatch(registry, /planned_path:/u);
    assert.match(registry, new RegExp(`artifact_type: fixture[\\s\\S]*${requirementId}[\\s\\S]*verification_command: node tools/repo-check\\.mjs`, "u"));
    assertNoTransactionResidues(fixture.workspace);

    const beforeSecondRun = snapshotWorkspace(fixture.workspace);
    const second = runTool(fixture.workspace, ["--artifact-id", artifactId, "--confirm", "promote"]);
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /not promotable from status implemented/u);
    assert.deepEqual(snapshotWorkspace(fixture.workspace), beforeSecondRun);
  } finally {
    removeWorkspace(fixture);
  }
});

test("accepts direct governed Node check and test verification forms", async (context) => {
  const cases = [
    {
      name: "node-check",
      artifactProjectPath: "fixtures/valid-fixture.mjs",
      artifactText: "export const value = 4;\n",
      verificationCommand: "node --check fixtures/valid-fixture.mjs",
    },
    {
      name: "node-test",
      artifactProjectPath: "fixtures/valid-fixture.test.mjs",
      artifactText: 'import test from "node:test";\nimport assert from "node:assert/strict";\ntest("fixture", () => assert.equal(2 + 2, 4));\n',
      verificationCommand: "node --test fixtures/valid-fixture.test.mjs",
    },
  ];
  for (const entry of cases) {
    await context.test(entry.name, () => {
      const fixture = createWorkspace(entry);
      try {
        const beforeBytes = fs.readFileSync(fixture.artifactPath);
        const result = runTool(fixture.workspace, ["--artifact-id", artifactId, "--confirm", "promote"]);
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(fs.readFileSync(fixture.artifactPath), beforeBytes);
        assert.match(fs.readFileSync(fixture.tracePath, "utf8"), /status: implemented/u);
        assertNoTransactionResidues(fixture.workspace);
      } finally {
        removeWorkspace(fixture);
      }
    });
  }
});

test("requires exact complete CLI input and confirmation", async (context) => {
  const cases = [
    { name: "missing-artifact-id", args: ["--confirm", "promote"], expected: /Missing required argument: --artifact-id/u },
    { name: "invalid-artifact-id", args: ["--artifact-id", "IMPL-0001", "--confirm", "promote"], expected: /Invalid implementation artifact id/u },
    { name: "wrong-confirmation", args: ["--artifact-id", artifactId, "--confirm", "create"], expected: /confirmation is required: --confirm promote/u },
    { name: "unsupported-argument", args: ["--artifact-id", artifactId, "--confirm", "promote", "--write", "yes"], expected: /Unsupported argument: --write/u },
  ];
  for (const entry of cases) {
    await context.test(entry.name, () => {
      const fixture = createWorkspace();
      try {
        assertRejectedWithoutChanges(fixture, entry.args, entry.expected);
      } finally {
        removeWorkspace(fixture);
      }
    });
  }
});

test("rejects unknown and ambiguous implementation artifact identifiers", async (context) => {
  await context.test("unknown", () => {
    const fixture = createWorkspace();
    try {
      assertRejectedWithoutChanges(
        fixture,
        ["--artifact-id", "MR-0005ADR-0002REQ-0001GOV-0002IMPL-0001", "--confirm", "promote"],
        /Unknown implementation artifact id/u,
      );
    } finally {
      removeWorkspace(fixture);
    }
  });
  await context.test("ambiguous", () => {
    const fixture = createWorkspace({ duplicateRecord: true });
    try {
      assertRejectedWithoutChanges(
        fixture,
        ["--artifact-id", artifactId, "--confirm", "promote"],
        /Ambiguous implementation artifact id/u,
      );
    } finally {
      removeWorkspace(fixture);
    }
  });
});

test("rejects every non-planned lifecycle state and source artifact type", async (context) => {
  for (const status of ["scaffolded", "implemented", "deprecated", "superseded"]) {
    await context.test(`status-${status}`, () => {
      const fixture = createWorkspace({ status });
      try {
        assertRejectedWithoutChanges(
          fixture,
          ["--artifact-id", artifactId, "--confirm", "promote"],
          new RegExp(`not promotable from status ${status}`, "u"),
        );
      } finally {
        removeWorkspace(fixture);
      }
    });
  }
  for (const artifactType of ["tool", "gate", "verification_artifact", "source_module"]) {
    await context.test(`artifact-type-${artifactType}`, () => {
      const fixture = createWorkspace({ artifactType });
      try {
        assertRejectedWithoutChanges(
          fixture,
          ["--artifact-id", artifactId, "--confirm", "promote"],
          /supports only materialized non-source artifact types fixture and report/u,
        );
      } finally {
        removeWorkspace(fixture);
      }
    });
  }
});

test("rejects missing, conflicting, unsafe and absent planned paths", async (context) => {
  const cases = [
    { name: "missing-path", options: { omitPlannedPath: true }, expected: /missing planned_path/u },
    { name: "scaffolded-path", options: { scaffoldedPath: "tools/unexpected.mjs" }, expected: /unexpectedly declares scaffolded_path/u },
    { name: "implemented-path", options: { implementedPath: "artifacts/already.json" }, expected: /already declares implemented_path/u },
    { name: "parent-segment", options: { artifactProjectPath: "../outside.json", includeArtifact: false }, expected: /planned path is unsafe/u },
    { name: "windows-absolute", options: { artifactProjectPath: "C:/outside.json", includeArtifact: false }, expected: /must be repository-relative/u },
    { name: "legacy-old", options: { artifactProjectPath: "old/generated.json" }, expected: /must not target the legacy old\/ directory/u },
    { name: "missing-file", options: { includeArtifact: false }, expected: /Materialized planned artifact file is missing/u },
  ];
  for (const entry of cases) {
    await context.test(entry.name, () => {
      const fixture = createWorkspace(entry.options);
      try {
        assertRejectedWithoutChanges(
          fixture,
          ["--artifact-id", artifactId, "--confirm", "promote"],
          entry.expected,
        );
      } finally {
        removeWorkspace(fixture);
      }
    });
  }
});

test("rejects unsupported, mismatched and failed verification without trace mutation", async (context) => {
  const cases = [
    { name: "unsupported", options: { verificationCommand: "node -e process.exit(0)" }, expected: /Unsupported governed verification command/u },
    { name: "path-mismatch", options: { artifactProjectPath: "fixtures/value.mjs", artifactText: "export const value = 1;\n", verificationCommand: "node --check fixtures/other.mjs" }, expected: /does not match planned_path/u },
    { name: "verification-failure", options: { repoCheckText: "process.exit(7);\n" }, expected: /Governed verification failed with exit code 7/u },
  ];
  for (const entry of cases) {
    await context.test(entry.name, () => {
      const fixture = createWorkspace(entry.options);
      try {
        assertRejectedWithoutChanges(
          fixture,
          ["--artifact-id", artifactId, "--confirm", "promote"],
          entry.expected,
        );
      } finally {
        removeWorkspace(fixture);
      }
    });
  }
});

test("restores artifact bytes when verification modifies the materialized file", () => {
  const artifactProjectPath = "artifacts/generated/mutable.schema.json";
  const fixture = createWorkspace({
    artifactProjectPath,
    repoCheckText: `import fs from "node:fs";\nfs.writeFileSync(${yamlScalar(artifactProjectPath)}, "mutated\\n", "utf8");\n`,
  });
  try {
    const beforeArtifact = fs.readFileSync(fixture.artifactPath);
    const beforeRegistry = fs.readFileSync(fixture.tracePath);
    const result = runTool(fixture.workspace, ["--artifact-id", artifactId, "--confirm", "promote"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /modified protected input: materialized artifact; original bytes were restored/u);
    assert.deepEqual(fs.readFileSync(fixture.artifactPath), beforeArtifact);
    assert.deepEqual(fs.readFileSync(fixture.tracePath), beforeRegistry);
    assertNoTransactionResidues(fixture.workspace);
  } finally {
    removeWorkspace(fixture);
  }
});


test("restores the trace registry when verification attempts to modify it", () => {
  const fixture = createWorkspace({
    repoCheckText: `import fs from "node:fs";
fs.writeFileSync(${yamlScalar(registryProjectPath)}, "mutated\\n", "utf8");
`,
  });
  try {
    const beforeArtifact = fs.readFileSync(fixture.artifactPath);
    const beforeRegistry = fs.readFileSync(fixture.tracePath);
    const result = runTool(fixture.workspace, ["--artifact-id", artifactId, "--confirm", "promote"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /modified protected input: implementation trace registry; original bytes were restored/u);
    assert.deepEqual(fs.readFileSync(fixture.artifactPath), beforeArtifact);
    assert.deepEqual(fs.readFileSync(fixture.tracePath), beforeRegistry);
    assertNoTransactionResidues(fixture.workspace);
  } finally {
    removeWorkspace(fixture);
  }
});
