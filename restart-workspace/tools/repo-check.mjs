#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Restart-workspace local check orchestrator.
 *
 * @implementsRequirement MR-0001ADR-0003REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0003
 * @macroRequirement MR-0001
 *
 * This restart-local orchestrator reads the governed restart checks registry,
 * executes active checks in registry order, preserves checker output, and
 * summarizes the result without wiring restart-workspace checks into the
 * original repository gate runner.
 *
 * Side effects: reads restart-workspace check registry, executes registered
 * checker tools, preserves their stdout/stderr, and exits non-zero when any
 * active checker fails or the check registry is invalid.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const restartWorkspaceDir = path.resolve(scriptDir, "..");
const repositoryRootDir = path.resolve(restartWorkspaceDir, "..");
const checksRegistryProjectPath =
  process.env.TF_RESTART_CHECKS_REGISTRY_PATH ??
  "restart-workspace/docs/reference/project-model/registers/checks/restart-checks.registry.yml";

const allowedStatuses = new Set(["active", "planned", "disabled"]);
const errors = [];
const warnings = [];

/**
 * Reads UTF-8 text from a file, removing a possible byte-order mark.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {string} File text without a leading UTF-8 BOM.
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
 * Resolves a repository-relative path against the repository root.
 *
 * @param {string|null|undefined} projectPath - Repository-relative path.
 * @returns {string} Absolute path, or an empty string when input is blank.
 */
function resolveProjectPath(projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  return normalized ? path.join(repositoryRootDir, normalized) : "";
}

/**
 * Removes surrounding single or double quotes from a simple YAML scalar.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string} Unquoted scalar text when quotes are present.
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
 * Parses a simple scalar value used by governed YAML registries.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string|number|boolean|null|Array<object>|object} Parsed scalar value.
 */
function parseScalar(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+$/u.test(trimmed)) return Number.parseInt(trimmed, 10);
  return stripQuotes(trimmed);
}

/**
 * Counts leading space indentation for a YAML line.
 *
 * @param {string} line - YAML line.
 * @returns {number} Number of leading spaces.
 */
function countIndent(line) {
  return line.match(/^ */u)?.[0].length ?? 0;
}

/**
 * Parses the restricted YAML subset used by current restart registries.
 *
 * @param {string} text - YAML text.
 * @returns {Record<string, unknown>} Parsed YAML object.
 */
function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = String(text ?? "").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n").split("\n");

  function getParent(indent) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    return stack[stack.length - 1].value;
  }

  function nextMeaningfulLine(startIndex) {
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      if (lines[index].trim() && !lines[index].trimStart().startsWith("#")) return lines[index];
    }
    return "";
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;

    const indent = countIndent(raw);
    const trimmed = raw.trim();

    if (trimmed.startsWith("- ")) {
      const parent = getParent(indent);
      if (!Array.isArray(parent)) continue;

      const itemText = trimmed.slice(2).trim();
      const colonIndex = itemText.indexOf(":");

      if (colonIndex === -1) {
        parent.push(parseScalar(itemText));
        continue;
      }

      const key = itemText.slice(0, colonIndex).trim();
      const rawValue = itemText.slice(colonIndex + 1).trim();
      const obj = {};
      parent.push(obj);

      if (rawValue === "") {
        const nextLine = nextMeaningfulLine(index);
        const value = nextLine.trim().startsWith("- ") ? [] : {};
        obj[key] = value;
        stack.push({ indent, value: obj });
        stack.push({ indent: indent + 2, value });
      } else {
        obj[key] = parseScalar(rawValue);
        stack.push({ indent, value: obj });
      }
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();
    const parent = getParent(indent);

    if (rawValue === "") {
      const nextLine = nextMeaningfulLine(index);
      const value = nextLine.trim().startsWith("- ") ? [] : {};
      parent[key] = value;
      stack.push({ indent, value });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

/**
 * Builds an executable command and arguments for a check record.
 *
 * @param {Record<string, unknown>} check - Check registry record.
 * @returns {{command: string, args: string[]}} Executable command data.
 */
function buildCommand(check) {
  const command = String(check.command ?? "").trim();
  const args = Array.isArray(check.args) ? check.args.map((value) => String(value)) : [];

  if (command === "node") {
    return { command: process.execPath, args };
  }

  return { command, args };
}

/**
 * Loads and validates restart check records.
 *
 * @returns {Array<Record<string, unknown>>} Active check records.
 */
function loadActiveChecks() {
  const registryPath = resolveProjectPath(checksRegistryProjectPath);
  if (!fs.existsSync(registryPath)) {
    errors.push(`Restart checks registry is missing: ${checksRegistryProjectPath}`);
    return [];
  }

  const registry = parseYaml(readText(registryPath));
  if (!Array.isArray(registry.checks)) {
    errors.push("Restart checks registry must define a checks array.");
    return [];
  }

  const ids = new Set();
  const activeChecks = [];

  for (const check of registry.checks) {
    const id = String(check?.id ?? "").trim();
    const title = String(check?.title ?? "").trim();
    const status = String(check?.status ?? "").trim();
    const command = String(check?.command ?? "").trim();
    const args = Array.isArray(check?.args) ? check.args : [];
    const linkedRequirementIds = Array.isArray(check?.linked_requirement_ids) ? check.linked_requirement_ids : [];

    if (!id) {
      errors.push("Restart check record is missing id.");
      continue;
    }

    if (ids.has(id)) errors.push(`Duplicate restart check id: ${id}`);
    ids.add(id);

    if (!title) errors.push(`${id} is missing title.`);
    if (!allowedStatuses.has(status)) errors.push(`${id} has unsupported status: ${status || "<empty>"}`);
    if (!command) errors.push(`${id} is missing command.`);
    if (!Array.isArray(args)) errors.push(`${id} args must be an array.`);
    if (linkedRequirementIds.length === 0) errors.push(`${id} must declare linked_requirement_ids.`);

    if (status === "planned") {
      warnings.push(`${id} is planned and is not executed by repo-check yet.`);
    }

    if (status === "active") activeChecks.push(check);
  }

  return activeChecks;
}

const activeChecks = loadActiveChecks();
let failed = errors.length > 0;
let executed = 0;

console.log("Restart-workspace check started.");
console.log(`Repository root: ${repositoryRootDir}`);
console.log(`Restart workspace: ${restartWorkspaceDir}`);
console.log(`Checks registry: ${checksRegistryProjectPath}`);
console.log(`Active checks: ${activeChecks.length}`);

if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length > 0) {
  console.error("Registry errors:");
  for (const error of errors) console.error(`- ${error}`);
}

for (const check of activeChecks) {
  executed += 1;
  console.log("");
  console.log(`==> ${check.title}`);

  const { command, args } = buildCommand(check);
  const result = spawnSync(command, args, {
    cwd: repositoryRootDir,
    env: {
      ...process.env,
      TF_IMPLEMENTATION_TRACE_ROOT: repositoryRootDir,
    },
    stdio: "inherit",
  });

  if (result.error) {
    failed = true;
    console.error(`Check failed to start: ${check.id}`);
    console.error(result.error.message);
    continue;
  }

  if (result.status !== 0) {
    failed = true;
    console.error(`Check failed: ${check.id}`);
    console.error(`Exit code: ${result.status}`);
  }
}

console.log("");
console.log(`Executed checks: ${executed}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);

if (failed) {
  console.error("Restart-workspace check failed.");
  process.exit(1);
}

console.log("Restart-workspace check passed.");
