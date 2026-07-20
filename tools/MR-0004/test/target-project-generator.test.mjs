import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createTargetProject,
  generatedTargetProjectFilePaths,
} from "../lib/target-project-generator.mjs";
import { runTargetProjectCheck } from "../run-target-project-check.mjs";

/**
 * @file Target Project generator verification suite.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0001
 * @implementsRequirement MR-0004ADR-0001REQ-0002
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 */

const testDir = path.dirname(fileURLToPath(import.meta.url));
const engineRoot = path.resolve(testDir, "..", "..", "..");
const canonicalProjectModelRoot = path.join(
  engineRoot,
  "docs",
  "reference",
  "project-model",
);

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function listFiles(rootDir) {
  const files = [];
  function walk(directoryPath) {
    for (const entry of fs
      .readdirSync(directoryPath, { withFileTypes: true })
      .sort((left, right) => compare(left.name, right.name))) {
      const absolute = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) walk(absolute);
      if (entry.isFile()) files.push(path.relative(rootDir, absolute).replaceAll(path.sep, "/"));
    }
  }
  walk(rootDir);
  return files.sort(compare);
}

function hashTree(rootDir) {
  const hash = crypto.createHash("sha256");
  for (const projectPath of listFiles(rootDir)) {
    hash.update(projectPath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(rootDir, ...projectPath.split("/"))));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function hashGeneratedProject(rootDir) {
  return Object.fromEntries(
    listFiles(rootDir).map((projectPath) => [
      projectPath,
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(rootDir, ...projectPath.split("/"))))
        .digest("hex"),
    ]),
  );
}

function creationOptions(destinationRoot) {
  return {
    engineRoot,
    destinationRoot,
    projectId: "threatforge-demo",
    projectTitle: "ThreatForge Demo",
    author: "ThreatForge",
    decisionDate: "2026-07-20",
  };
}

test("internal and external destinations receive the same valid document-only project", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-target-generator-"));
  const internalParent = path.join(engineRoot, "artifacts");
  fs.mkdirSync(internalParent, { recursive: true });
  const internalDestination = path.join(
    internalParent,
    `target-project-generator-${path.basename(workspace)}`,
  );
  const externalDestination = path.join(workspace, "external-target");
  const canonicalBefore = hashTree(canonicalProjectModelRoot);
  try {
    const internal = createTargetProject(creationOptions(internalDestination));
    const external = createTargetProject(creationOptions(externalDestination));

    assert.equal(internal.validation.status, "pass");
    assert.equal(external.validation.status, "pass");
    assert.deepEqual(internal.files, [...generatedTargetProjectFilePaths]);
    assert.deepEqual(external.files, [...generatedTargetProjectFilePaths]);
    assert.deepEqual(listFiles(internalDestination), [...generatedTargetProjectFilePaths]);
    assert.deepEqual(listFiles(externalDestination), [...generatedTargetProjectFilePaths]);
    assert.deepEqual(hashGeneratedProject(internalDestination), hashGeneratedProject(externalDestination));
    assert.equal(
      listFiles(externalDestination).some((projectPath) =>
        /\.(?:cjs|js|jsx|mjs|ts|tsx)$/u.test(projectPath),
      ),
      false,
    );

    const check = runTargetProjectCheck({
      engineRoot,
      targetRoot: externalDestination,
      writeReports: false,
    });
    assert.equal(check.status, "pass");
    const baeCheck = check.checks.find((entry) => entry.id === "base-analysis-registry");
    assert.equal(baeCheck.records_checked, 5);
    assert.equal(baeCheck.relations_checked, 3);
    assert.equal(hashTree(canonicalProjectModelRoot), canonicalBefore);
  } finally {
    fs.rmSync(internalDestination, { recursive: true, force: true });
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("invalid destinations are rejected before target artifacts are written", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-target-generator-invalid-"));
  const nonEmptyDestination = path.join(workspace, "occupied");
  fs.mkdirSync(nonEmptyDestination);
  const sentinel = path.join(nonEmptyDestination, "keep.txt");
  fs.writeFileSync(sentinel, "keep\n", "utf8");
  const canonicalBefore = hashTree(canonicalProjectModelRoot);
  try {
    assert.throws(
      () => createTargetProject(creationOptions(nonEmptyDestination)),
      /must be empty/u,
    );
    assert.equal(fs.readFileSync(sentinel, "utf8"), "keep\n");
    assert.deepEqual(listFiles(nonEmptyDestination), ["keep.txt"]);

    const forbiddenDestination = path.join(canonicalProjectModelRoot, "generated-target");
    assert.throws(
      () => createTargetProject(creationOptions(forbiddenDestination)),
      /canonical ThreatForge project-model paths/u,
    );
    assert.equal(fs.existsSync(forbiddenDestination), false);
    assert.equal(hashTree(canonicalProjectModelRoot), canonicalBefore);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("template validation failure leaves the destination absent", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-target-generator-fail-"));
  const destination = path.join(workspace, "rejected-target");
  try {
    assert.throws(
      () =>
        createTargetProject({
          ...creationOptions(destination),
          validateTarget: () => ({
            status: "fail",
            diagnostics: [
              {
                severity: "error",
                check_id: "fixture",
                rule_id: "fixture.rejected",
                message: "rejected by fixture",
              },
            ],
          }),
        }),
      /failed canonical validation/u,
    );
    assert.equal(fs.existsSync(destination), false);
    assert.equal(
      fs.readdirSync(workspace).some((name) => name.startsWith(".threatforge-target-project-")),
      false,
    );
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("command-line adapter creates a canonically validated target", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-target-generator-cli-"));
  const destination = path.join(workspace, "cli-target");
  try {
    const result = spawnSync(
      process.execPath,
      [
        "tools/MR-0004/create-target-project.mjs",
        "--destination-root",
        destination,
        "--project-id",
        "cli-demo",
        "--project-title",
        "CLI Demo",
        "--author",
        "ThreatForge",
        "--decision-date",
        "2026-07-20",
      ],
      { cwd: engineRoot, encoding: "utf8", shell: false },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Target Project creation succeeded\./u);
    assert.match(result.stdout, /Validation: pass/u);
    assert.deepEqual(listFiles(destination), [...generatedTargetProjectFilePaths]);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
