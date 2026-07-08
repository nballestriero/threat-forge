#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Restart-workspace implementation trace registry checker.
 *
 * @implementsRequirement MR-0001ADR-0003REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0003
 * @macroRequirement MR-0001
 *
 * This checker validates the restart-workspace implementation trace registry
 * against restart-workspace Requirement registries and declared source
 * traceability headers. Planned artifacts are reported as deterministic
 * warnings, while implemented artifacts must exist and must declare the linked
 * Requirement ids they implement or support.
 *
 * Side effects: reads restart-workspace Project Model registries and registered
 * implementation artifact files; writes JSON and Markdown reports under
 * restart-workspace/artifacts/implementation-trace; exits non-zero on errors.
 * Planned missing artifacts produce warnings and do not fail the check.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..", "..");
const rootDir = process.env.TF_IMPLEMENTATION_TRACE_ROOT
  ? path.resolve(process.env.TF_IMPLEMENTATION_TRACE_ROOT)
  : defaultRootDir;

const registryProjectPath =
  process.env.TF_IMPLEMENTATION_TRACE_REGISTRY_PATH ??
  "restart-workspace/docs/reference/project-model/registers/implementation/implementation-trace.registry.yml";
const requirementsDirProjectPath =
  process.env.TF_IMPLEMENTATION_TRACE_REQUIREMENTS_DIR ??
  "restart-workspace/docs/reference/project-model/registers/requirements";
const reportDirProjectPath =
  process.env.TF_IMPLEMENTATION_TRACE_REPORT_DIR ??
  "restart-workspace/artifacts/implementation-trace";

const allowedStatuses = new Set(["planned", "implemented", "deprecated", "superseded"]);
const allowedArtifactTypes = new Set(["tool", "report", "gate", "fixture", "verification_artifact", "source_module"]);
const sourceArtifactTypes = new Set(["tool", "gate", "source_module"]);
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
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
  return normalized ? path.join(rootDir, normalized) : "";
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
 * Parses the restricted YAML subset used by current governed registries.
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

  function readBlock(startIndex, baseIndent) {
    const block = [];
    let index = startIndex;
    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      const nextIndent = countIndent(next);
      if (next.trim() && nextIndent <= baseIndent) break;
      index += 1;
      const sliceAt = Math.min(baseIndent + 2, next.length);
      block.push(next.slice(sliceAt));
    }
    return { text: block.join("\n").replace(/\n$/u, ""), nextIndex: index };
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

      if (rawValue === "|") {
        const block = readBlock(index, indent);
        obj[key] = block.text;
        index = block.nextIndex;
      } else if (rawValue === "") {
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

    if (rawValue === "|") {
      const block = readBlock(index, indent);
      parent[key] = block.text;
      index = block.nextIndex;
    } else if (rawValue === "") {
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
 * Reads and parses a governed YAML file.
 *
 * @param {string} filePath - YAML file path.
 * @returns {Record<string, unknown>} Parsed YAML object.
 */
function readYaml(filePath) {
  return parseYaml(readText(filePath));
}

/**
 * Extracts `@implementsRequirement` declarations from a source file.
 *
 * @param {string} text - Source file text.
 * @returns {Set<string>} Requirement ids declared by the file.
 */
function parseImplementsRequirementDeclarations(text) {
  const requirementIds = new Set();
  const tagPattern = /^\s*\*?\s*@implementsRequirement\s+([A-Za-z0-9-]+)\s*$/gmu;
  for (const match of text.matchAll(tagPattern)) {
    requirementIds.add(match[1]);
  }
  return requirementIds;
}

/**
 * Loads restart-workspace Requirement ids from MR-specific registries.
 *
 * @returns {Set<string>} Known Requirement ids.
 */
function loadRequirementIds() {
  const requirementIds = new Set();
  const requirementsDir = resolveProjectPath(requirementsDirProjectPath);

  if (!fs.existsSync(requirementsDir)) {
    errors.push(`Requirement registry directory is missing: ${requirementsDirProjectPath}`);
    return requirementIds;
  }

  for (const entry of fs.readdirSync(requirementsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/^MR-\d{4}\.requirements\.registry\.yml$/u.test(entry.name)) continue;
    const registry = readYaml(path.join(requirementsDir, entry.name));
    for (const requirement of registry.requirements ?? []) {
      if (requirement?.id) requirementIds.add(String(requirement.id));
    }
  }

  return requirementIds;
}

/**
 * Detects whether a repository path should carry JSDoc traceability headers.
 *
 * @param {Record<string, unknown>} artifact - Implementation trace artifact record.
 * @param {string} projectPath - Repository-relative artifact path.
 * @returns {boolean} True when the artifact is source code governed by JSDoc tags.
 */
function requiresSourceTraceability(artifact, projectPath) {
  return sourceArtifactTypes.has(String(artifact.artifact_type ?? "")) &&
    sourceExtensions.has(path.extname(normalizeProjectPath(projectPath)));
}

/**
 * Returns the planned or implemented path for an artifact record.
 *
 * @param {Record<string, unknown>} artifact - Implementation trace artifact record.
 * @returns {string} Repository-relative path, or empty string.
 */
function artifactProjectPath(artifact) {
  if (artifact.status === "implemented") return normalizeProjectPath(artifact.implemented_path);
  if (artifact.status === "planned") return normalizeProjectPath(artifact.planned_path);
  return normalizeProjectPath(artifact.implemented_path || artifact.planned_path);
}

/**
 * Adds a deterministic validation error.
 *
 * @param {string} message - Diagnostic message.
 * @returns {void}
 */
function addError(message) {
  errors.push(message);
}

/**
 * Adds a deterministic warning.
 *
 * @param {string} message - Warning message.
 * @returns {void}
 */
function addWarning(message) {
  warnings.push(message);
}

/**
 * Validates one implementation trace artifact record.
 *
 * @param {Record<string, unknown>} artifact - Artifact record.
 * @param {Set<string>} requirementIds - Known Requirement ids.
 * @param {Set<string>} artifactIds - Previously seen artifact ids.
 * @returns {void}
 */
function validateArtifact(artifact, requirementIds, artifactIds) {
  const artifactId = String(artifact?.id ?? "").trim();
  if (!artifactId) {
    addError("Implementation trace artifact is missing id.");
    return;
  }

  if (artifactIds.has(artifactId)) {
    addError(`Duplicate implementation trace artifact id: ${artifactId}`);
  }
  artifactIds.add(artifactId);

  const status = String(artifact.status ?? "").trim();
  const artifactType = String(artifact.artifact_type ?? "").trim();
  const linkedRequirementIds = Array.isArray(artifact.linked_requirement_ids)
    ? artifact.linked_requirement_ids.map((value) => String(value).trim()).filter(Boolean)
    : [];

  if (!allowedStatuses.has(status)) {
    addError(`${artifactId} has unsupported status: ${status || "<empty>"}`);
  }

  if (!allowedArtifactTypes.has(artifactType)) {
    addError(`${artifactId} has unsupported artifact_type: ${artifactType || "<empty>"}`);
  }

  if (linkedRequirementIds.length === 0) {
    addError(`${artifactId} must declare at least one linked_requirement_ids entry.`);
  }

  for (const requirementId of linkedRequirementIds) {
    if (!requirementIds.has(requirementId)) {
      addError(`${artifactId} links unknown requirement id: ${requirementId}`);
    }
  }

  if (status === "planned") {
    const plannedPath = normalizeProjectPath(artifact.planned_path);
    if (!plannedPath) {
      addError(`${artifactId} status planned requires planned_path.`);
      return;
    }

    if (!fs.existsSync(resolveProjectPath(plannedPath))) {
      addWarning(`${artifactId} is planned but not implemented yet: ${plannedPath}`);
      return;
    }

    addWarning(`${artifactId} is still marked planned but the planned path exists: ${plannedPath}`);
    return;
  }

  if (status === "implemented") {
    const implementedPath = normalizeProjectPath(artifact.implemented_path);
    if (!implementedPath) {
      addError(`${artifactId} status implemented requires implemented_path.`);
      return;
    }

    const implementedAbsolutePath = resolveProjectPath(implementedPath);
    if (!fs.existsSync(implementedAbsolutePath)) {
      addError(`${artifactId} is implemented but path is missing: ${implementedPath}`);
      return;
    }

    if (!requiresSourceTraceability(artifact, implementedPath)) return;

    const declaredRequirementIds = parseImplementsRequirementDeclarations(readText(implementedAbsolutePath));
    for (const requirementId of linkedRequirementIds) {
      if (!declaredRequirementIds.has(requirementId)) {
        addError(
          `${artifactId} implemented artifact ${implementedPath} does not declare @implementsRequirement ${requirementId}.`,
        );
      }
    }

    for (const requirementId of declaredRequirementIds) {
      if (!requirementIds.has(requirementId)) {
        addError(`${implementedPath} declares unknown @implementsRequirement ${requirementId}.`);
      }
      if (!linkedRequirementIds.includes(requirementId)) {
        addError(`${implementedPath} declares @implementsRequirement ${requirementId} but registry artifact ${artifactId} does not link it.`);
      }
    }
  }
}

/**
 * Writes JSON and Markdown reports for the validation result.
 *
 * @param {number} artifactCount - Number of artifact records checked.
 * @returns {void}
 */
function writeReports(artifactCount) {
  const reportDir = resolveProjectPath(reportDirProjectPath);
  fs.mkdirSync(reportDir, { recursive: true });

  const report = {
    checker: "check-implementation-trace-registry",
    status: errors.length > 0 ? "fail" : "pass",
    artifact_count: artifactCount,
    warning_count: warnings.length,
    error_count: errors.length,
    warnings,
    errors,
  };

  fs.writeFileSync(
    path.join(reportDir, "implementation-trace.report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  const markdown = [
    "# Implementation trace registry report",
    "",
    `Status: ${report.status}`,
    `Artifacts checked: ${artifactCount}`,
    `Warnings: ${warnings.length}`,
    `Errors: ${errors.length}`,
    "",
    "## Warnings",
    "",
    ...(warnings.length > 0 ? warnings.map((warning) => `- ${warning}`) : ["None."]),
    "",
    "## Errors",
    "",
    ...(errors.length > 0 ? errors.map((error) => `- ${error}`) : ["None."]),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(reportDir, "implementation-trace.report.md"), markdown, "utf8");
}

const registryPath = resolveProjectPath(registryProjectPath);
if (!fs.existsSync(registryPath)) {
  errors.push(`Implementation trace registry is missing: ${registryProjectPath}`);
  writeReports(0);
  console.error("Implementation trace registry check failed.");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const requirementIds = loadRequirementIds();
const registry = readYaml(registryPath);
const artifacts = Array.isArray(registry.artifacts) ? registry.artifacts : [];
const artifactIds = new Set();

if (!Array.isArray(registry.artifacts)) {
  errors.push("Implementation trace registry must define an artifacts array.");
}

for (const artifact of artifacts) {
  validateArtifact(artifact, requirementIds, artifactIds);
}

writeReports(artifacts.length);

if (errors.length > 0) {
  console.error("Implementation trace registry check failed.");
  for (const error of errors) console.error(`- ${error}`);
  if (warnings.length > 0) {
    console.error("Warnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Implementation trace registry check passed.");
console.log("Implemented requirement: MR-0001ADR-0003REQ-0001GOV-0001");
console.log(`Artifacts checked: ${artifacts.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);
if (warnings.length > 0) {
  console.log("Deterministic warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
