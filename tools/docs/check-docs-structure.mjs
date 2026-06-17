#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Deterministic documentation structure checker.
 *
 * @implementsRequirement MR-0001REQ-0001
 * @derivedFromDecision ADR-0001
 * @macroRequirement MR-0001
 *
 * This tool implements the structural part of MR-0001REQ-0001:
 * the expected documentation structure must be present and must remain
 * deterministic. It intentionally validates only directory/layout rules.
 * Markdown format, internal links, graph relations, and registry semantics
 * must be checked by separate requirement-backed tools.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..");
const errors = [];

const requiredDocsDirectories = [
  "docs",
  "docs/tutorials",
  "docs/how-to",
  "docs/reference",
  "docs/explanation",
  "docs/reference/project-model",
  "docs/reference/project-model/registers",
  "docs/reference/project-model/registers/decisions",
  "docs/reference/project-model/registers/requirements",
  "docs/reference/project-model/registers/graph",
  "docs/reference/project-model/body",
  "docs/reference/project-model/body/macro-requirements",
  "docs/reference/project-model/body/decisions",
  "docs/reference/project-model/body/requirements",
];

const allowedDocsTopLevelDirectories = new Set([
  "tutorials",
  "how-to",
  "reference",
  "explanation",
]);

const allowedDocsTopLevelFiles = new Set([
  ".gitkeep",
  "README.md",
]);

const ignoredVersioningAnchorNames = new Set([
  ".DS_Store",
  "Thumbs.db",
]);

function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function resolveProjectPath(projectPath) {
  return path.join(rootDir, normalizeProjectPath(projectPath));
}

function relativeProjectPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function directoryEntries(directoryPath) {
  try {
    return fs.readdirSync(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function ensureDirectory(projectPath) {
  const absolutePath = resolveProjectPath(projectPath);
  if (!isDirectory(absolutePath)) {
    errors.push(`Required directory is missing: ${projectPath}`);
  }
}

function validateDocsRootShape() {
  const docsPath = resolveProjectPath("docs");
  if (!isDirectory(docsPath)) return;

  for (const entry of directoryEntries(docsPath)) {
    if (entry.isDirectory()) {
      if (!allowedDocsTopLevelDirectories.has(entry.name)) {
        errors.push(
          `Unsupported top-level docs directory: docs/${entry.name}. ` +
            `Allowed directories: ${Array.from(allowedDocsTopLevelDirectories).join(", ")}.`,
        );
      }
      continue;
    }

    if (entry.isFile() && !allowedDocsTopLevelFiles.has(entry.name)) {
      errors.push(
        `Unsupported top-level docs file: docs/${entry.name}. ` +
          `Top-level documentation must be placed inside a Diátaxis directory.`,
      );
    }
  }
}

function hasVersioningAnchor(directoryPath) {
  return directoryEntries(directoryPath).some((entry) => {
    if (ignoredVersioningAnchorNames.has(entry.name)) return false;
    if (entry.name === ".gitkeep") return true;
    return entry.isFile() || entry.isDirectory();
  });
}

function validateVersionedEmptyCanonicalDirectories() {
  for (const projectPath of ["docs/tutorials", "docs/how-to", "docs/explanation"]) {
    const absolutePath = resolveProjectPath(projectPath);
    if (!isDirectory(absolutePath)) continue;

    if (!hasVersioningAnchor(absolutePath)) {
      errors.push(
        `${projectPath} has no versioning anchor. ` +
          `Add ${projectPath}/.gitkeep while the directory has no documentation content.`,
      );
    }
  }
}

function main() {
  for (const projectPath of requiredDocsDirectories) {
    ensureDirectory(projectPath);
  }

  validateDocsRootShape();
  validateVersionedEmptyCanonicalDirectories();

  if (errors.length) {
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log("Documentation structure check passed.");
  console.log(`Implemented requirement: MR-0001REQ-0001`);
  console.log(`Repository root: ${relativeProjectPath(rootDir) || "."}`);
}

main();
