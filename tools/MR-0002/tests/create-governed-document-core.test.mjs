import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * @file Verifica del core importabile e della scrittura atomica del generatore documentale.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0003GOV-0002
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Verifies that importing the governed document generator does not execute its
 * CLI, planning remains deterministic for one canonical snapshot, successful
 * application creates registry record and body together, replay is rejected
 * without mutations, and failures during second-artifact installation or
 * post-install verification restore the original registry without partial files.
 */

const testPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(
  path.dirname(testPath),
  "..",
  "..",
  "..",
);
const generatorPath = path.join(
  projectRoot,
  "tools",
  "MR-0002",
  "create-governed-document.mjs",
);
const generatorUrl = pathToFileURL(generatorPath).href;
const exitCodeBeforeImport = process.exitCode;
const {
  applyGeneratedDocument,
  planGeneratedDocument,
} = await import(generatorUrl);

/**
 * Creates an isolated Requirement registry fixture.
 *
 * @returns {{workspace: string, registryProjectPath: string, registryPath: string, originalRegistryText: string}}
 * Fixture paths and original registry text.
 */
function createWorkspace() {
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "threatforge-document-core-"),
  );
  const registryProjectPath =
    "docs/reference/project-model/registers/requirements/MR-9999.requirements.registry.yml";
  const registryPath = path.join(
    workspace,
    ...registryProjectPath.split("/"),
  );
  const originalRegistryText = [
    "schema_version: 1",
    "registry_id: MR-9999-requirements-registry",
    "macro_requirement_id: MR-9999",
    "",
    "requirements:",
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(registryPath), {
    recursive: true,
  });
  fs.writeFileSync(
    registryPath,
    originalRegistryText,
    "utf8",
  );

  return {
    workspace,
    registryProjectPath,
    registryPath,
    originalRegistryText,
  };
}

/**
 * Builds one deterministic fixture plan.
 *
 * @param {string} registryProjectPath - Fixture registry path.
 * @returns {{id: string, requirementType: string, dryRun: boolean, registryPath: string, bodyPath: string, recordBlock: string, bodyText: string}}
 * Fixture plan.
 */
function buildPlan(registryProjectPath) {
  const id = "MR-9999ADR-0001REQ-0001";
  const bodyPath =
    `docs/reference/project-model/body/requirements/MR-9999/${id}_body.md`;

  return {
    id,
    requirementType: "functional",
    dryRun: false,
    registryPath: registryProjectPath,
    bodyPath,
    recordBlock: [
      `  - id: ${id}`,
      '    title: "Atomic fixture"',
      "    status: draft",
      "    requirement_type: functional",
      "    macro_requirement_id: MR-9999",
      `    body_path: ${bodyPath}`,
      "",
    ].join("\n"),
    bodyText: `# ${id} — Atomic fixture\n`,
  };
}

/**
 * Lists transaction residue files recursively.
 *
 * @param {string} root - Directory to inspect.
 * @returns {string[]} Relative temporary or backup paths.
 */
function listTransactionResidue(root) {
  const residue = [];

  function visit(directory) {
    if (!fs.existsSync(directory)) {
      return;
    }

    for (const entry of fs.readdirSync(directory, {
      withFileTypes: true,
    })) {
      const absolutePath = path.join(
        directory,
        entry.name,
      );

      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      if (
        entry.name.endsWith(".tmp") ||
        entry.name.endsWith(".bak")
      ) {
        residue.push(
          path.relative(root, absolutePath),
        );
      }
    }
  }

  visit(root);
  return residue.sort();
}

/**
 * Returns an fs-compatible proxy that fails on the selected rename.
 *
 * @param {number} failingRename - One-based rename invocation to reject.
 * @returns {typeof fs} Injectable file system.
 */
function createFailingFileSystem(failingRename) {
  let renameCount = 0;

  return new Proxy(fs, {
    get(target, property) {
      if (property === "renameSync") {
        return (...args) => {
          renameCount += 1;

          if (renameCount === failingRename) {
            throw new Error(
              "Injected second artifact installation failure.",
            );
          }

          return target.renameSync(...args);
        };
      }

      const value = Reflect.get(target, property);

      return typeof value === "function"
        ? value.bind(target)
        : value;
    },
  });
}

test("exports the authoring core without executing the CLI on import", () => {
  assert.equal(
    typeof planGeneratedDocument,
    "function",
  );
  assert.equal(
    typeof applyGeneratedDocument,
    "function",
  );
  assert.equal(
    process.exitCode,
    exitCodeBeforeImport,
  );
});

test("produces the same plan for the same canonical snapshot", () => {
  const args = {
    "requirement-type": "functional",
    mr: "MR-0002",
    adr: "ADR-0004",
    title: "Deterministic importable core test",
    "dry-run": true,
  };
  const first = planGeneratedDocument(args, {
    rootDir: projectRoot,
  });
  const second = planGeneratedDocument(args, {
    rootDir: projectRoot,
  });

  assert.deepEqual(second, first);
  assert.match(
    first.id,
    /^MR-0002ADR-0004REQ-\d{4}$/u,
  );
  assert.equal(first.dryRun, true);
});

test("creates registry record and body together and rejects replay", () => {
  const fixture = createWorkspace();
  const plan = buildPlan(
    fixture.registryProjectPath,
  );
  const bodyPath = path.join(
    fixture.workspace,
    ...plan.bodyPath.split("/"),
  );

  try {
    const result = applyGeneratedDocument(plan, {
      rootDir: fixture.workspace,
    });

    assert.deepEqual(result, {
      id: plan.id,
      registryPath: plan.registryPath,
      bodyPath: plan.bodyPath,
    });
    assert.equal(
      fs.readFileSync(bodyPath, "utf8"),
      plan.bodyText,
    );
    assert.equal(
      fs.readFileSync(fixture.registryPath, "utf8"),
      `${fixture.originalRegistryText}${plan.recordBlock}`,
    );
    assert.deepEqual(
      listTransactionResidue(fixture.workspace),
      [],
    );

    const registrySnapshot = fs.readFileSync(
      fixture.registryPath,
      "utf8",
    );
    const bodySnapshot = fs.readFileSync(
      bodyPath,
      "utf8",
    );

    assert.throws(
      () =>
        applyGeneratedDocument(plan, {
          rootDir: fixture.workspace,
        }),
      /Body already exists and will not be overwritten/u,
    );
    assert.equal(
      fs.readFileSync(fixture.registryPath, "utf8"),
      registrySnapshot,
    );
    assert.equal(
      fs.readFileSync(bodyPath, "utf8"),
      bodySnapshot,
    );
    assert.deepEqual(
      listTransactionResidue(fixture.workspace),
      [],
    );
  } finally {
    fs.rmSync(fixture.workspace, {
      recursive: true,
      force: true,
    });
  }
});

test("rolls back when installation of the second artifact fails", () => {
  const fixture = createWorkspace();
  const plan = buildPlan(
    fixture.registryProjectPath,
  );
  const bodyPath = path.join(
    fixture.workspace,
    ...plan.bodyPath.split("/"),
  );
  const failingFileSystem =
    createFailingFileSystem(3);

  try {
    assert.throws(
      () =>
        applyGeneratedDocument(plan, {
          rootDir: fixture.workspace,
          fileSystem: failingFileSystem,
        }),
      /Cannot apply governed document transaction: Injected second artifact installation failure/u,
    );
    assert.equal(
      fs.readFileSync(fixture.registryPath, "utf8"),
      fixture.originalRegistryText,
    );
    assert.equal(
      fs.existsSync(bodyPath),
      false,
    );
    assert.deepEqual(
      listTransactionResidue(fixture.workspace),
      [],
    );
  } finally {
    fs.rmSync(fixture.workspace, {
      recursive: true,
      force: true,
    });
  }
});

test("rolls back when post-install verification fails", () => {
  const fixture = createWorkspace();
  const plan = buildPlan(
    fixture.registryProjectPath,
  );
  const bodyPath = path.join(
    fixture.workspace,
    ...plan.bodyPath.split("/"),
  );

  try {
    assert.throws(
      () =>
        applyGeneratedDocument(plan, {
          rootDir: fixture.workspace,
          afterInstall: () => {
            throw new Error(
              "Injected post-install verification failure.",
            );
          },
        }),
      /Cannot apply governed document transaction: Injected post-install verification failure/u,
    );
    assert.equal(
      fs.readFileSync(fixture.registryPath, "utf8"),
      fixture.originalRegistryText,
    );
    assert.equal(
      fs.existsSync(bodyPath),
      false,
    );
    assert.deepEqual(
      listTransactionResidue(fixture.workspace),
      [],
    );
  } finally {
    fs.rmSync(fixture.workspace, {
      recursive: true,
      force: true,
    });
  }
});
