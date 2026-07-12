import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createFilesystemProjectModelSourceAdapter } from "../../../src/MR-0002/project-documentation-explorer/filesystem-project-model-source.adapter.mjs";

/**
 * @file Filesystem source adapter security tests for Project Documentation Explorer.
 *
 * @implementsRequirement MR-0000REQ-0018
 * @verifiesRequirement MR-0002REQ-0051
 * @derivedFromDecision MR-0002/ADR-0018
 * @macroRequirement MR-0000
 * @macroRequirement MR-0002
 *
 * These tests verify that the filesystem-backed source adapter resolves governed
 * body paths through both lexical and canonical containment checks before reading
 * from disk. They intentionally use temporary directories and Node.js built-in
 * filesystem primitives without Git operations, HTTP servers, browser runtime,
 * external parser libraries, or persistent repository mutation.
 */

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "threat-forge-filesystem-source-"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function removeTempPath(filePath) {
  fs.rmSync(filePath, { recursive: true, force: true });
}

test("loads body content only after repository-contained canonical path resolution", async () => {
  const rootDir = makeTempRoot();
  try {
    const bodyPath = path.join(
      rootDir,
      "docs",
      "reference",
      "project-model",
      "body",
      "requirements",
      "MR-0002",
      "MR-0002REQ-0051_body.md",
    );
    writeFile(bodyPath, "# Safe governed body\n");

    const adapter = createFilesystemProjectModelSourceAdapter({ rootDir });
    const content = await adapter.loadBodyContent(
      "docs/reference/project-model/body/requirements/MR-0002/MR-0002REQ-0051_body.md",
    );

    assert.equal(content, "# Safe governed body\n");
  } finally {
    removeTempPath(rootDir);
  }
});

test("rejects lexical path traversal before reading body content", async () => {
  const rootDir = makeTempRoot();
  try {
    const adapter = createFilesystemProjectModelSourceAdapter({ rootDir });

    await assert.rejects(
      () => adapter.loadBodyContent("../outside.md"),
      /Project path escapes repository root/u,
    );
  } finally {
    removeTempPath(rootDir);
  }
});

test("rejects symlink or junction escapes after canonical path resolution", async (context) => {
  const rootDir = makeTempRoot();
  const outsideDir = makeTempRoot();
  try {
    const outsideBodyPath = path.join(outsideDir, "secret.md");
    writeFile(outsideBodyPath, "secret outside repository root\n");

    const linkPath = path.join(rootDir, "docs", "reference", "project-model", "body", "linked-out");
    fs.mkdirSync(path.dirname(linkPath), { recursive: true });

    try {
      fs.symlinkSync(outsideDir, linkPath, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      context.skip(`Symlink/junction creation unavailable in this environment: ${error.message}`);
      return;
    }

    const adapter = createFilesystemProjectModelSourceAdapter({ rootDir });

    await assert.rejects(
      () => adapter.loadBodyContent("docs/reference/project-model/body/linked-out/secret.md"),
      /Canonical project path escapes repository root/u,
    );
  } finally {
    removeTempPath(rootDir);
    removeTempPath(outsideDir);
  }
});
