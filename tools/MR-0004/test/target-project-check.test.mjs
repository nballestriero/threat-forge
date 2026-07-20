import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  runTargetProjectCheck,
  targetOwnedProjectPaths,
  targetProjectReportProjectPath,
} from "../run-target-project-check.mjs";

/**
 * @file Target Project governed-document validation verification.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0003
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Verifies valid and invalid Target Project checks, empty BAE acceptance,
 * deterministic reporting, target confinement and governed-source immutability.
 */

const testPath = fileURLToPath(import.meta.url);
const engineRoot = path.resolve(path.dirname(testPath), "..", "..", "..");

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function copyProjectPath(sourceRoot, destinationRoot, projectPath) {
  const source = path.resolve(sourceRoot, ...projectPath.split("/"));
  const destination = path.resolve(destinationRoot, ...projectPath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

function createTargetFromCanonicalCorpus() {
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-target-fixture-"));
  for (const projectPath of targetOwnedProjectPaths) {
    copyProjectPath(engineRoot, targetRoot, projectPath);
  }
  return targetRoot;
}

function projectPathsDigest(rootDir, projectPaths) {
  const hash = crypto.createHash("sha256");

  function visit(current, projectPath) {
    const stat = fs.lstatSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current).sort(compare)) {
        visit(path.join(current, entry), projectPath);
      }
      return;
    }
    const relative = path.relative(rootDir, current).replaceAll("\\", "/");
    hash.update(projectPath);
    hash.update("\0");
    hash.update(relative);
    hash.update("\0");
    hash.update(fs.readFileSync(current));
    hash.update("\0");
  }

  for (const projectPath of [...projectPaths].sort(compare)) {
    visit(path.resolve(rootDir, ...projectPath.split("/")), projectPath);
  }
  return hash.digest("hex");
}

function readReport(targetRoot) {
  return fs.readFileSync(
    path.resolve(targetRoot, ...targetProjectReportProjectPath.split("/")),
    "utf8",
  );
}

function removeTarget(targetRoot) {
  fs.rmSync(targetRoot, { recursive: true, force: true });
}

test("valid target corpus passes deterministically without governed-source mutation", () => {
  const targetRoot = createTargetFromCanonicalCorpus();
  try {
    const targetBefore = projectPathsDigest(targetRoot, targetOwnedProjectPaths);
    const engineBefore = projectPathsDigest(engineRoot, [
      "docs/reference/project-model",
    ]);
    const first = runTargetProjectCheck({ engineRoot, targetRoot });
    const firstReport = readReport(targetRoot);
    const second = runTargetProjectCheck({ engineRoot, targetRoot });
    const secondReport = readReport(targetRoot);

    assert.equal(first.status, "pass");
    assert.equal(first.error_count, 0);
    assert.equal(first.checks.length, 6);
    assert.deepEqual(second, first);
    assert.equal(secondReport, firstReport);
    assert.equal(
      projectPathsDigest(targetRoot, targetOwnedProjectPaths),
      targetBefore,
    );
    assert.equal(
      projectPathsDigest(engineRoot, ["docs/reference/project-model"]),
      engineBefore,
    );
    assert.equal(firstReport.includes(engineRoot), false);
    assert.equal(firstReport.includes(targetRoot), false);
  } finally {
    removeTarget(targetRoot);
  }
});

test("empty local BAE inventory is valid", () => {
  const targetRoot = createTargetFromCanonicalCorpus();
  try {
    const inventoryPath = path.join(
      targetRoot,
      "docs",
      "reference",
      "project-model",
      "registers",
      "base-analysis",
      "base-analysis-elements.registry.yml",
    );
    fs.writeFileSync(
      inventoryPath,
      [
        "schema_version: 1",
        "registry_id: base-analysis-elements-registry",
        "macro_requirement_id: MR-0003",
        "elements: []",
        "relations: []",
        "",
      ].join("\n"),
      "utf8",
    );

    const bodyRoot = path.join(
      targetRoot,
      "docs",
      "reference",
      "project-model",
      "body",
    );
    const removeBaeReferences = (current) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const child = path.join(current, entry.name);
        if (entry.isDirectory()) {
          removeBaeReferences(child);
          continue;
        }
        if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
        const text = fs.readFileSync(child, "utf8");
        fs.writeFileSync(
          child,
          text.replace(/\[BAE-\d{4}\]/gu, "[No Base Analysis Element]"),
          "utf8",
        );
      }
    };
    removeBaeReferences(bodyRoot);

    const report = runTargetProjectCheck({ engineRoot, targetRoot });
    assert.equal(report.status, "pass");
    assert.equal(report.error_count, 0);
    const baseAnalysis = report.checks.find(
      (entry) => entry.id === "base-analysis-registry",
    );
    assert.equal(baseAnalysis.records_checked, 0);
    assert.equal(baseAnalysis.relations_checked, 0);
  } finally {
    removeTarget(targetRoot);
  }
});

test("incomplete target fails closed and writes a local report", () => {
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threatforge-target-incomplete-"));
  try {
    const report = runTargetProjectCheck({ engineRoot, targetRoot });
    assert.equal(report.status, "fail");
    assert.equal(report.error_count, 1);
    assert.match(report.diagnostics[0].message, /Required project path is missing/u);
    assert.equal(fs.existsSync(path.join(targetRoot, "artifacts")), true);
  } finally {
    removeTarget(targetRoot);
  }
});

test("malformed target-local Markdown is rejected by the canonical body profile", () => {
  const targetRoot = createTargetFromCanonicalCorpus();
  try {
    const bodyRoot = path.join(
      targetRoot,
      "docs",
      "reference",
      "project-model",
      "body",
    );
    const firstBody = [];
    const findBody = (current) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((left, right) => compare(left.name, right.name))) {
        const child = path.join(current, entry.name);
        if (entry.isDirectory()) findBody(child);
        else if (entry.isFile() && entry.name.endsWith(".md")) firstBody.push(child);
      }
    };
    findBody(bodyRoot);
    assert.ok(firstBody.length > 0);
    const current = fs.readFileSync(firstBody[0], "utf8");
    fs.writeFileSync(firstBody[0], current.replace(/^# .+$/mu, "# Invalid governed body"), "utf8");

    const report = runTargetProjectCheck({ engineRoot, targetRoot });
    assert.equal(report.status, "fail");
    assert.ok(
      report.diagnostics.some((item) => /body\.header|Body must contain exactly one canonical H1/u.test(`${item.rule_id} ${item.message}`)),
    );
  } finally {
    removeTarget(targetRoot);
  }
});

test("invalid target-local BAE identity is rejected", () => {
  const targetRoot = createTargetFromCanonicalCorpus();
  try {
    const inventoryPath = path.join(
      targetRoot,
      "docs",
      "reference",
      "project-model",
      "registers",
      "base-analysis",
      "base-analysis-elements.registry.yml",
    );
    const current = fs.readFileSync(inventoryPath, "utf8");
    const mutated = current.replace(/^  - id: BAE-\d{4}$/mu, "  - id: BAE-BAD");
    assert.notEqual(mutated, current);
    fs.writeFileSync(inventoryPath, mutated, "utf8");

    const report = runTargetProjectCheck({ engineRoot, targetRoot });
    assert.equal(report.status, "fail");
    assert.ok(
      report.diagnostics.some((item) => item.rule_id === "bae.registry.invalid-element-id"),
    );
  } finally {
    removeTarget(targetRoot);
  }
});

test("unsafe target-owned paths are rejected by canonical validation", () => {
  const targetRoot = createTargetFromCanonicalCorpus();
  try {
    const registryPath = path.join(
      targetRoot,
      "docs",
      "reference",
      "project-model",
      "registers",
      "macro-requirements.registry.yml",
    );
    const current = fs.readFileSync(registryPath, "utf8");
    const mutated = current.replace(
      /^    body_path: .*$/mu,
      "    body_path: ../outside.md",
    );
    assert.notEqual(mutated, current);
    fs.writeFileSync(registryPath, mutated, "utf8");

    const report = runTargetProjectCheck({ engineRoot, targetRoot });
    assert.equal(report.status, "fail");
    assert.ok(
      report.diagnostics.some(
        (item) =>
          item.check_id === "macro-requirement-model" &&
          item.severity === "error",
      ),
    );
  } finally {
    removeTarget(targetRoot);
  }
});
