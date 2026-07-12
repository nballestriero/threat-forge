#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Deterministic orphan governed body file checker.
 *
 * @implementsRequirement MR-0000REQ-0021
 * @derivedFromDecision MR-0000/ADR-0006
 * @macroRequirement MR-0000
 *
 * This checker validates the Doc-as-Code invariant that every governed
 * Markdown body file under `docs/reference/project-model/body` is referenced by
 * an explicit registry `body_path`. It also reports registry `body_path` values
 * that point outside the governed body tree or to missing files, keeping the
 * registry-to-body relationship bidirectional and deterministic.
 *
 * Side effects: reads project-model registry files and governed Markdown body
 * files; writes diagnostics to stdout/stderr; exits non-zero when orphan body
 * files or invalid body path references are found. It does not mutate files,
 * infer missing registry records, rewrite body paths, validate body Markdown
 * sections, or replace the specialized ADR/Requirement body-format validators.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRootDir = path.resolve(scriptDir, "..", "..", "..");
const rootDir = process.env.TF_ORPHAN_GOVERNED_BODIES_ROOT
  ? path.resolve(process.env.TF_ORPHAN_GOVERNED_BODIES_ROOT)
  : defaultRootDir;
const projectModelDir = path.join(rootDir, "docs", "reference", "project-model");
const registersDir = path.join(projectModelDir, "registers");
const bodyDir = path.join(projectModelDir, "body");
const errors = [];

/**
 * Reads UTF-8 text from a file while stripping a possible byte-order mark.
 *
 * @param {string} filePath - Absolute path of the file to read.
 * @returns {string} File contents without a leading UTF-8 BOM.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
}

/**
 * Converts path separators to stable forward slashes.
 *
 * @param {string|null|undefined} value - Path-like value.
 * @returns {string} Normalized path text.
 */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Converts an absolute file path to a repository-relative display path.
 *
 * @param {string} filePath - Absolute path to display.
 * @returns {string} Repository-relative path using forward slashes.
 */
function relativeProjectPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

/**
 * Resolves a repository-relative path against the repository root.
 *
 * @param {string} projectPath - Repository-relative path.
 * @returns {string} Absolute path.
 */
function resolveProjectPath(projectPath) {
  return path.join(rootDir, normalizeProjectPath(projectPath));
}

/**
 * Removes surrounding quotes from a simple YAML scalar.
 *
 * @param {string} value - Raw scalar value.
 * @returns {string} Unquoted value.
 */
function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Records a deterministic validation error.
 *
 * @param {string} message - Human-readable diagnostic message.
 * @returns {void}
 */
function addError(message) {
  errors.push(message);
}

/**
 * Walks a directory recursively and returns files matching a predicate.
 *
 * @param {string} directory - Absolute directory path.
 * @param {(filePath: string) => boolean} predicate - File inclusion predicate.
 * @returns {string[]} Sorted absolute file paths.
 */
function listFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];

  const files = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath, predicate));
    } else if (entry.isFile() && predicate(entryPath)) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => relativeProjectPath(left).localeCompare(relativeProjectPath(right)));
}

/**
 * Extracts governed registry body_path values from YAML text.
 *
 * The project currently uses a restricted scalar form for body_path fields.
 * This checker intentionally reads only explicit `body_path:` scalars rather
 * than inferring paths from naming conventions.
 *
 * @param {string} registryPath - Absolute registry path.
 * @returns {{ projectPath: string, registryPath: string, line: number }[]} Extracted references.
 */
function extractBodyPathReferences(registryPath) {
  const references = [];
  const lines = readText(registryPath).replace(/\r\n/gu, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*body_path:\s*(.+?)\s*$/u);
    if (!match) continue;

    const value = stripQuotes(match[1]);
    if (!value) {
      addError(`${relativeProjectPath(registryPath)}:${index + 1} declares an empty body_path.`);
      continue;
    }

    references.push({
      projectPath: normalizeProjectPath(value),
      registryPath,
      line: index + 1,
    });
  }

  return references;
}

/**
 * Validates that all governed body files are referenced and all references are valid.
 *
 * @returns {{ registryFiles: number, referencedBodyPaths: number, governedBodyFiles: number }} Validation summary.
 */
function validateGovernedBodyReferences() {
  const registryFiles = listFiles(registersDir, (filePath) => filePath.endsWith(".yml") || filePath.endsWith(".yaml"));
  const bodyFiles = listFiles(bodyDir, (filePath) => filePath.endsWith(".md"));
  const actualBodyPaths = new Set(bodyFiles.map(relativeProjectPath));
  const referencedBodyPaths = new Set();

  for (const registryPath of registryFiles) {
    for (const reference of extractBodyPathReferences(registryPath)) {
      const referenceLocation = `${relativeProjectPath(reference.registryPath)}:${reference.line}`;
      const absoluteBodyPath = resolveProjectPath(reference.projectPath);
      const relativeBodyPath = relativeProjectPath(absoluteBodyPath);
      const bodyPathInsideGovernedTree =
        absoluteBodyPath === bodyDir || absoluteBodyPath.startsWith(`${bodyDir}${path.sep}`);

      if (!bodyPathInsideGovernedTree) {
        addError(`${referenceLocation} points outside governed body directory: ${reference.projectPath}`);
        continue;
      }

      if (!reference.projectPath.endsWith(".md")) {
        addError(`${referenceLocation} body_path must reference a Markdown file: ${reference.projectPath}`);
      }

      if (!fs.existsSync(absoluteBodyPath)) {
        addError(`${referenceLocation} references a missing governed body file: ${reference.projectPath}`);
        continue;
      }

      referencedBodyPaths.add(relativeBodyPath);
    }
  }

  const orphanBodyPaths = [...actualBodyPaths].filter((bodyPath) => !referencedBodyPaths.has(bodyPath)).sort();
  for (const bodyPath of orphanBodyPaths) {
    addError(`Governed body file is not referenced by any registry body_path: ${bodyPath}`);
  }

  return {
    registryFiles: registryFiles.length,
    referencedBodyPaths: referencedBodyPaths.size,
    governedBodyFiles: actualBodyPaths.size,
  };
}

const summary = validateGovernedBodyReferences();

if (errors.length > 0) {
  console.error("Orphan governed body detection failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Orphan governed body check passed.");
console.log("Implemented requirement: MR-0000REQ-0021");
console.log(`Registry files scanned: ${summary.registryFiles}`);
console.log(`Referenced governed body paths: ${summary.referencedBodyPaths}`);
console.log(`Governed Markdown body files: ${summary.governedBodyFiles}`);
