#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file ThreatForge implementation trace registry checker.
 *
 * @implementsRequirement MR-0001ADR-0003REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0003REQ-0001GOV-0002
 * @implementsRequirement MR-0002ADR-0003REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0003
 * @derivedFromDecision MR-0002/ADR-0003
 * @macroRequirement MR-0001
 * @macroRequirement MR-0002
 *
 * This checker validates the ThreatForge implementation trace registry
 * against the canonical Requirement registries and declared source
 * traceability headers. Planned artifacts are reported as deterministic
 * warnings, while implemented artifacts must exist and must declare the linked
 * Requirement ids they implement or support. It also executes deterministic
 * negative fixtures so the checker proves it rejects malformed trace records.
 *
 * Side effects: reads ThreatForge Project Model registries, registered
 * implementation artifact files and governed fixture workspaces; writes JSON
 * and Markdown reports under artifacts/implementation-trace;
 * exits non-zero on traceability errors or negative fixture coverage failures.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_IMPLEMENTATION_TRACE_ROOT
  ? path.resolve(process.env.TF_IMPLEMENTATION_TRACE_ROOT)
  : defaultRootDir;

const registryProjectPath =
  process.env.TF_IMPLEMENTATION_TRACE_REGISTRY_PATH ??
  "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml";
const requirementsDirProjectPath =
  process.env.TF_IMPLEMENTATION_TRACE_REQUIREMENTS_DIR ??
  "docs/reference/project-model/registers/requirements";
const reportDirProjectPath =
  process.env.TF_IMPLEMENTATION_TRACE_REPORT_DIR ??
  "artifacts/implementation-trace";
const negativeFixturesRegistryProjectPath =
  process.env.TF_IMPLEMENTATION_TRACE_NEGATIVE_FIXTURES_REGISTRY_PATH ??
  "tools/MR-0001/fixtures/implementation-trace/negative-fixtures.registry.yml";
const skipNegativeFixtures = process.env.TF_IMPLEMENTATION_TRACE_SKIP_FIXTURES === "true";
const disableReports = process.env.TF_IMPLEMENTATION_TRACE_DISABLE_REPORTS === "1";

const allowedStatuses = new Set(["planned", "scaffolded", "implemented", "deprecated", "superseded"]);
const allowedArtifactTypes = new Set(["tool", "report", "gate", "fixture", "verification_artifact", "source_module"]);
const sourceArtifactTypes = new Set(["tool", "gate", "verification_artifact", "source_module"]);
const sourceExtensions = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);

/**
 * Creates an isolated validation accumulator.
 *
 * @returns {{errors: string[], warnings: string[]}} Empty validation result.
 */
function createResult() {
  return { errors: [], warnings: [] };
}

/**
 * Adds a deterministic error to an accumulator.
 *
 * @param {{errors: string[]}} result - Validation accumulator.
 * @param {string} message - Diagnostic message.
 * @returns {void}
 */
function addError(result, message) {
  result.errors.push(message);
}

/**
 * Adds a deterministic warning to an accumulator.
 *
 * @param {{warnings: string[]}} result - Validation accumulator.
 * @param {string} message - Diagnostic message.
 * @returns {void}
 */
function addWarning(result, message) {
  result.warnings.push(message);
}

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
 * Resolves a repository-relative path against a supplied repository root.
 *
 * @param {string} baseRootDir - Absolute root directory.
 * @param {string|null|undefined} projectPath - Repository-relative path.
 * @returns {string} Absolute path, or an empty string when input is blank.
 */
function resolveProjectPath(baseRootDir, projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  return normalized ? path.join(baseRootDir, normalized) : "";
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
 * Extracts the optional implementation lifecycle declaration from source text.
 *
 * @param {string} text - Source file text.
 * @returns {string} Declared lifecycle status, or an empty string.
 */
function parseImplementationStatusDeclaration(text) {
  const match = String(text ?? "").match(/^\s*\*?\s*@implementationStatus\s+([A-Za-z0-9_-]+)\s*$/mu);
  return match?.[1] ?? "";
}

/**
 * Loads ThreatForge Requirement ids from MR-specific registries.
 *
 * @param {string} baseRootDir - Absolute root directory to validate.
 * @param {{errors: string[]}} result - Validation accumulator.
 * @returns {Set<string>} Known Requirement ids.
 */
function loadRequirementIds(baseRootDir, result) {
  const requirementIds = new Set();
  const requirementsDir = resolveProjectPath(baseRootDir, requirementsDirProjectPath);

  if (!fs.existsSync(requirementsDir)) {
    addError(result, `Requirement registry directory is missing: ${requirementsDirProjectPath}`);
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
 * Validates one implementation trace artifact record.
 *
 * @param {Record<string, unknown>} artifact - Artifact record.
 * @param {Set<string>} requirementIds - Known Requirement ids.
 * @param {Set<string>} artifactIds - Previously seen artifact ids.
 * @param {string} baseRootDir - Absolute root directory to validate.
 * @param {{errors: string[], warnings: string[]}} result - Validation accumulator.
 * @returns {void}
 */
function validateArtifact(artifact, requirementIds, artifactIds, baseRootDir, result) {
  const artifactId = String(artifact?.id ?? "").trim();
  if (!artifactId) {
    addError(result, "Implementation trace artifact is missing id.");
    return;
  }

  if (artifactIds.has(artifactId)) {
    addError(result, `Duplicate implementation trace artifact id: ${artifactId}`);
  }
  artifactIds.add(artifactId);

  const status = String(artifact.status ?? "").trim();
  const artifactType = String(artifact.artifact_type ?? "").trim();
  const linkedRequirementIds = Array.isArray(artifact.linked_requirement_ids)
    ? artifact.linked_requirement_ids.map((value) => String(value).trim()).filter(Boolean)
    : [];

  if (!allowedStatuses.has(status)) {
    addError(result, `${artifactId} has unsupported status: ${status || "<empty>"}`);
  }

  if (!allowedArtifactTypes.has(artifactType)) {
    addError(result, `${artifactId} has unsupported artifact_type: ${artifactType || "<empty>"}`);
  }

  if (linkedRequirementIds.length === 0) {
    addError(result, `${artifactId} must declare at least one linked_requirement_ids entry.`);
  }

  for (const requirementId of linkedRequirementIds) {
    if (!requirementIds.has(requirementId)) {
      addError(result, `${artifactId} links unknown requirement id: ${requirementId}`);
    }
  }

  if (status === "planned") {
    const plannedPath = normalizeProjectPath(artifact.planned_path);
    if (!plannedPath) {
      addError(result, `${artifactId} status planned requires planned_path.`);
      return;
    }

    if (!fs.existsSync(resolveProjectPath(baseRootDir, plannedPath))) {
      addWarning(result, `${artifactId} is planned but not implemented yet: ${plannedPath}`);
      return;
    }

    addWarning(result, `${artifactId} is still marked planned but the planned path exists: ${plannedPath}`);
    return;
  }


  if (status === "scaffolded") {
    const scaffoldedPath = normalizeProjectPath(artifact.scaffolded_path);
    if (!scaffoldedPath) {
      addError(result, `${artifactId} status scaffolded requires scaffolded_path.`);
      return;
    }

    const scaffoldedAbsolutePath = resolveProjectPath(baseRootDir, scaffoldedPath);
    if (!fs.existsSync(scaffoldedAbsolutePath)) {
      addError(result, `${artifactId} is scaffolded but path is missing: ${scaffoldedPath}`);
      return;
    }

    if (!requiresSourceTraceability(artifact, scaffoldedPath)) return;

    const sourceText = readText(scaffoldedAbsolutePath);
    const declaredRequirementIds = parseImplementsRequirementDeclarations(sourceText);
    for (const requirementId of linkedRequirementIds) {
      if (!declaredRequirementIds.has(requirementId)) {
        addError(
          result,
          `${artifactId} scaffolded artifact ${scaffoldedPath} does not declare @implementsRequirement ${requirementId}.`,
        );
      }
    }

    for (const requirementId of declaredRequirementIds) {
      if (!requirementIds.has(requirementId)) {
        addError(result, `${scaffoldedPath} declares unknown @implementsRequirement ${requirementId}.`);
      }
      if (!linkedRequirementIds.includes(requirementId)) {
        addError(result, `${scaffoldedPath} declares @implementsRequirement ${requirementId} but registry artifact ${artifactId} does not link it.`);
      }
    }

    const declaredStatus = parseImplementationStatusDeclaration(sourceText);
    if (declaredStatus !== "scaffolded") {
      addError(result, `${artifactId} scaffolded artifact ${scaffoldedPath} must declare @implementationStatus scaffolded.`);
    }
    return;
  }

  if (status === "implemented") {
    const implementedPath = normalizeProjectPath(artifact.implemented_path);
    if (!implementedPath) {
      addError(result, `${artifactId} status implemented requires implemented_path.`);
      return;
    }

    const implementedAbsolutePath = resolveProjectPath(baseRootDir, implementedPath);
    if (!fs.existsSync(implementedAbsolutePath)) {
      addError(result, `${artifactId} is implemented but path is missing: ${implementedPath}`);
      return;
    }

    if (!requiresSourceTraceability(artifact, implementedPath)) return;

    const implementedSourceText = readText(implementedAbsolutePath);
    const declaredStatus = parseImplementationStatusDeclaration(implementedSourceText);
    if (declaredStatus === "scaffolded") {
      addError(result, `${artifactId} implemented artifact ${implementedPath} still declares @implementationStatus scaffolded.`);
    }
    const declaredRequirementIds = parseImplementsRequirementDeclarations(implementedSourceText);
    for (const requirementId of linkedRequirementIds) {
      if (!declaredRequirementIds.has(requirementId)) {
        addError(
          result,
          `${artifactId} implemented artifact ${implementedPath} does not declare @implementsRequirement ${requirementId}.`,
        );
      }
    }

    for (const requirementId of declaredRequirementIds) {
      if (!requirementIds.has(requirementId)) {
        addError(result, `${implementedPath} declares unknown @implementsRequirement ${requirementId}.`);
      }
      if (!linkedRequirementIds.includes(requirementId)) {
        addError(result, `${implementedPath} declares @implementsRequirement ${requirementId} but registry artifact ${artifactId} does not link it.`);
      }
    }
  }
}

/**
 * Runs implementation trace validation against one root directory.
 *
 * @param {string} baseRootDir - Absolute root directory to validate.
 * @returns {{artifactCount: number, errors: string[], warnings: string[]}} Validation result.
 */
function runImplementationTraceValidation(baseRootDir) {
  const result = createResult();
  const registryPath = resolveProjectPath(baseRootDir, registryProjectPath);

  if (!fs.existsSync(registryPath)) {
    addError(result, `Implementation trace registry is missing: ${registryProjectPath}`);
    return { artifactCount: 0, ...result };
  }

  const requirementIds = loadRequirementIds(baseRootDir, result);
  const registry = readYaml(registryPath);
  const artifacts = Array.isArray(registry.artifacts) ? registry.artifacts : [];
  const artifactIds = new Set();

  if (!Array.isArray(registry.artifacts)) {
    addError(result, "Implementation trace registry must define an artifacts array.");
  }

  for (const artifact of artifacts) {
    validateArtifact(artifact, requirementIds, artifactIds, baseRootDir, result);
  }

  return { artifactCount: artifacts.length, ...result };
}

/**
 * Executes governed negative fixtures for this checker.
 *
 * @returns {{checked: number, results: Array<Record<string, unknown>>, errors: string[]}} Fixture result.
 */
function runNegativeFixtures() {
  const fixtureErrors = [];
  const results = [];
  if (skipNegativeFixtures) return { checked: 0, results, errors: fixtureErrors };

  const registryPath = resolveProjectPath(rootDir, negativeFixturesRegistryProjectPath);
  if (!fs.existsSync(registryPath)) {
    fixtureErrors.push(`Negative fixture registry is missing: ${negativeFixturesRegistryProjectPath}`);
    return { checked: 0, results, errors: fixtureErrors };
  }

  const registry = readYaml(registryPath);
  const fixtures = Array.isArray(registry.fixtures) ? registry.fixtures : [];
  if (!Array.isArray(registry.fixtures) || fixtures.length === 0) {
    fixtureErrors.push(`${negativeFixturesRegistryProjectPath} must define a non-empty fixtures array.`);
    return { checked: 0, results, errors: fixtureErrors };
  }

  for (const fixture of fixtures) {
    const id = String(fixture?.id ?? "").trim();
    const rootPath = normalizeProjectPath(fixture?.root_path);
    const expectedError = String(fixture?.expected_error_contains ?? "").trim();

    if (!id || !rootPath || !expectedError) {
      fixtureErrors.push(`${negativeFixturesRegistryProjectPath} contains an invalid fixture record.`);
      continue;
    }

    const fixtureRoot = resolveProjectPath(rootDir, rootPath);
    const validation = runImplementationTraceValidation(fixtureRoot);
    const diagnostics = validation.errors.join("\n");
    const matched = validation.errors.length > 0 && diagnostics.includes(expectedError);

    results.push({
      id,
      expected_error_contains: expectedError,
      status: validation.errors.length > 0 ? "failed_as_expected" : "unexpected_pass",
      matched,
      error_count: validation.errors.length,
      warning_count: validation.warnings.length,
    });

    if (validation.errors.length === 0) {
      fixtureErrors.push(`${id} negative fixture unexpectedly passed.`);
      continue;
    }

    if (!matched) {
      fixtureErrors.push(`${id} negative fixture did not emit expected diagnostic: ${expectedError}`);
    }
  }

  return { checked: results.length, results, errors: fixtureErrors };
}

/**
 * Writes JSON and Markdown reports for the validation result.
 *
 * @param {{artifactCount: number, errors: string[], warnings: string[]}} validation - Registry validation result.
 * @param {{checked: number, results: Array<Record<string, unknown>>, errors: string[]}} negativeFixtures - Fixture validation result.
 * @returns {void}
 */
function writeReports(validation, negativeFixtures) {
  if (disableReports) return;

  const reportDir = resolveProjectPath(rootDir, reportDirProjectPath);
  fs.mkdirSync(reportDir, { recursive: true });

  const allErrors = [...validation.errors, ...negativeFixtures.errors];
  const report = {
    checker: "check-implementation-trace-registry",
    implemented_requirements: [
      "MR-0001ADR-0003REQ-0001GOV-0001",
      "MR-0001ADR-0003REQ-0001GOV-0002",
      "MR-0002ADR-0003REQ-0001GOV-0001",
    ],
    status: allErrors.length > 0 ? "fail" : "pass",
    artifact_count: validation.artifactCount,
    warning_count: validation.warnings.length,
    error_count: allErrors.length,
    warnings: validation.warnings,
    errors: allErrors,
    negative_fixtures_registry: negativeFixturesRegistryProjectPath,
    negative_fixtures_checked: negativeFixtures.checked,
    negative_fixture_results: negativeFixtures.results,
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
    "Implemented requirements:",
    ...report.implemented_requirements.map((requirementId) => `- ${requirementId}`),
    `Artifacts checked: ${validation.artifactCount}`,
    `Negative fixtures checked: ${negativeFixtures.checked}`,
    `Warnings: ${validation.warnings.length}`,
    `Errors: ${allErrors.length}`,
    "",
    "## Negative fixtures",
    "",
    ...(negativeFixtures.results.length > 0
      ? negativeFixtures.results.map(
          (fixture) => `- ${fixture.id}: expected ${JSON.stringify(fixture.expected_error_contains)}; matched: ${fixture.matched}`,
        )
      : ["None."]),
    "",
    "## Warnings",
    "",
    ...(validation.warnings.length > 0 ? validation.warnings.map((warning) => `- ${warning}`) : ["None."]),
    "",
    "## Errors",
    "",
    ...(allErrors.length > 0 ? allErrors.map((error) => `- ${error}`) : ["None."]),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(reportDir, "implementation-trace.report.md"), markdown, "utf8");
}

const validation = runImplementationTraceValidation(rootDir);
const negativeFixtures = runNegativeFixtures();
const allErrors = [...validation.errors, ...negativeFixtures.errors];

writeReports(validation, negativeFixtures);

if (allErrors.length > 0) {
  console.error("Implementation trace registry check failed.");
  console.error("Implemented requirement: MR-0001ADR-0003REQ-0001GOV-0001");
  console.error("Implemented requirement: MR-0001ADR-0003REQ-0001GOV-0002");
  console.error("Implemented requirement: MR-0002ADR-0003REQ-0001GOV-0001");
  console.error(`Artifacts checked: ${validation.artifactCount}`);
  console.error(`Negative fixtures checked: ${negativeFixtures.checked}`);
  console.error(`Warnings: ${validation.warnings.length}`);
  console.error(`Errors: ${allErrors.length}`);
  for (const error of allErrors) console.error(`ERROR: ${error}`);
  if (validation.warnings.length > 0) {
    console.error("Warnings:");
    for (const warning of validation.warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Implementation trace registry check passed.");
console.log("Implemented requirement: MR-0001ADR-0003REQ-0001GOV-0001");
console.log("Implemented requirement: MR-0001ADR-0003REQ-0001GOV-0002");
console.log("Implemented requirement: MR-0002ADR-0003REQ-0001GOV-0001");
console.log(`Artifacts checked: ${validation.artifactCount}`);
console.log(`Negative fixtures checked: ${negativeFixtures.checked}`);
console.log(`Warnings: ${validation.warnings.length}`);
console.log(`Errors: ${allErrors.length}`);
if (validation.warnings.length > 0) {
  console.log("Deterministic warnings:");
  for (const warning of validation.warnings) console.log(`- ${warning}`);
}
