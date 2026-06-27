#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Child project governance registry contract validator.
 *
 * @implementsRequirement MR-0003REQ-0055
 * @implementsRequirement MR-0003REQ-0056
 * @implementsRequirement MR-0003REQ-0057
 * @implementsRequirement MR-0003REQ-0058
 * @implementsRequirement MR-0003REQ-0059
 * @implementsRequirement MR-0003REQ-0060
 * @derivedFromDecision MR-0003/ADR-0011
 * @macroRequirement MR-0003
 *
 * This tool validates the initial child-project governance registry family used
 * to describe gate applicability classes, capability facets, governed gates,
 * provisional profiles and validation surfaces. It checks cross-registry
 * references before any child-project gate orchestrator exists, and negative
 * fixtures prove that missing validation surfaces, unknown capabilities and
 * unknown profile gate references fail closed.
 *
 * Side effects: reads the child-project governance registry files, runs
 * isolated negative fixtures, writes diagnostics to stdout/stderr, and exits
 * non-zero when the registry contract is inconsistent. It does not execute
 * child-project gates, detect project capabilities, mutate child projects,
 * generate final enforcement matrices, implement Base Analysis/STRIDE/STRIDE-AI,
 * or replace the future gate execution planner.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..", "..");
const rootDir = process.env.TF_CHILD_PROJECT_GOVERNANCE_REGISTRY_ROOT
  ? path.resolve(process.env.TF_CHILD_PROJECT_GOVERNANCE_REGISTRY_ROOT)
  : defaultRootDir;
const projectModelDir = path.join(rootDir, "docs", "reference", "project-model");
const registryDir = path.join(projectModelDir, "registers", "child-project-governance");
const negativeFixturesDir = process.env.TF_CHILD_PROJECT_GOVERNANCE_REGISTRY_NEGATIVE_FIXTURES_DIR
  ? path.resolve(process.env.TF_CHILD_PROJECT_GOVERNANCE_REGISTRY_NEGATIVE_FIXTURES_DIR)
  : path.join(scriptDir, "fixtures", "child-project-governance-registries", "negative");
const skipNegativeFixtures = process.env.TF_CHILD_PROJECT_GOVERNANCE_REGISTRY_SKIP_NEGATIVE_FIXTURES === "1";
const errors = [];

const registryFiles = {
  applicabilityClasses: "gate-applicability-classes.registry.yml",
  capabilities: "governance-capabilities.registry.yml",
  gates: "governance-gates.registry.yml",
  profiles: "governance-profiles.registry.yml",
  validationSurfaces: "validation-surfaces.registry.yml",
};

const requiredApplicabilityClasses = new Set([
  "always_required",
  "capability_required",
  "declared_if_present",
  "planned_until_method_available",
  "platform_self_required",
  "platform_only",
  "child_project_required",
  "demo_required",
  "not_applicable_with_evidence",
  "unsupported_with_warning",
]);
const requiredExecutionStatuses = new Set(["pass", "fail", "warning", "planned", "not_applicable", "unsupported"]);
const requiredCapabilityStates = new Set(["declared", "detected", "not_present", "unknown", "unsupported"]);

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
 * Resolves a repository-relative path against the repository root.
 *
 * @param {string|null|undefined} projectPath - Repository-relative path.
 * @returns {string} Absolute path.
 */
function resolveProjectPath(projectPath) {
  return path.join(rootDir, normalizeProjectPath(projectPath));
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
 * Parses a simple scalar value used by governed registry YAML files.
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
 * Adds a deterministic validation error.
 *
 * @param {string} message - Diagnostic message.
 * @returns {void}
 */
function addError(message) {
  errors.push(message);
}

/**
 * Returns true when a value is a non-empty string.
 *
 * @param {unknown} value - Value to test.
 * @returns {boolean} True for non-empty strings.
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Returns an array value or an empty array for invalid input.
 *
 * @param {unknown} value - Candidate array.
 * @returns {unknown[]} Array value or empty array.
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Builds a set of ids from an array of registry records.
 *
 * @param {unknown[]} records - Registry records.
 * @param {string} label - Human-readable registry label.
 * @returns {Set<string>} Unique ids.
 */
function collectIds(records, label) {
  const ids = new Set();
  for (const record of records) {
    const id = String(record?.id ?? "").trim();
    if (!id) {
      addError(`${label} contains a record without id.`);
      continue;
    }
    if (ids.has(id)) addError(`${label} contains duplicate id: ${id}`);
    ids.add(id);
  }
  return ids;
}

/**
 * Requires a record to expose non-empty text fields.
 *
 * @param {Record<string, unknown>} record - Registry record.
 * @param {string[]} fields - Required field names.
 * @param {string} label - Human-readable record label.
 * @returns {void}
 */
function requireTextFields(record, fields, label) {
  for (const field of fields) {
    if (!isNonEmptyString(record?.[field])) {
      addError(`${label} ${String(record?.id ?? "<unknown>")} must define non-empty ${field}.`);
    }
  }
}

/**
 * Requires a registry file to exist and parse.
 *
 * @param {string} fileName - Registry file name.
 * @returns {Record<string, unknown>} Parsed registry.
 */
function loadRegistry(fileName) {
  const registryPath = path.join(registryDir, fileName);
  if (!fs.existsSync(registryPath)) {
    addError(`Required child project governance registry is missing: ${normalizeProjectPath(path.relative(rootDir, registryPath))}`);
    return {};
  }

  const parsed = readYaml(registryPath);
  if (parsed.schema_version !== 1) {
    addError(`${fileName} must declare schema_version: 1.`);
  }
  if (!isNonEmptyString(parsed.registry_id)) {
    addError(`${fileName} must declare registry_id.`);
  }
  return parsed;
}

/**
 * Ensures all required ids are present in a registry id set.
 *
 * @param {Set<string>} actual - Actual ids.
 * @param {Set<string>} required - Required ids.
 * @param {string} label - Human-readable registry label.
 * @returns {void}
 */
function requireIds(actual, required, label) {
  for (const id of required) {
    if (!actual.has(id)) addError(`${label} is missing required id: ${id}`);
  }
}

/**
 * Validates all child-project governance registries and cross-references.
 *
 * @returns {{ classes: number, statuses: number, capabilities: number, gates: number, profiles: number, surfaces: number }} Registry counts.
 */
function validateRegistries() {
  const applicabilityRegistry = loadRegistry(registryFiles.applicabilityClasses);
  const capabilityRegistry = loadRegistry(registryFiles.capabilities);
  const gateRegistry = loadRegistry(registryFiles.gates);
  const profileRegistry = loadRegistry(registryFiles.profiles);
  const validationSurfaceRegistry = loadRegistry(registryFiles.validationSurfaces);

  const applicabilityClasses = asArray(applicabilityRegistry.applicability_classes);
  const executionStatuses = asArray(applicabilityRegistry.execution_result_statuses);
  const capabilityStates = asArray(capabilityRegistry.capability_states);
  const capabilities = asArray(capabilityRegistry.governance_capabilities);
  const validationSurfaces = asArray(validationSurfaceRegistry.validation_surfaces);
  const gates = asArray(gateRegistry.governance_gates);
  const profiles = asArray(profileRegistry.governance_profiles);

  const applicabilityClassIds = collectIds(applicabilityClasses, "applicability_classes");
  const executionStatusIds = collectIds(executionStatuses, "execution_result_statuses");
  const capabilityStateIds = collectIds(capabilityStates, "capability_states");
  const capabilityIds = collectIds(capabilities, "governance_capabilities");
  const validationSurfaceIds = collectIds(validationSurfaces, "validation_surfaces");
  const gateIds = collectIds(gates, "governance_gates");
  const profileIds = collectIds(profiles, "governance_profiles");

  requireIds(applicabilityClassIds, requiredApplicabilityClasses, "applicability_classes");
  requireIds(executionStatusIds, requiredExecutionStatuses, "execution_result_statuses");
  requireIds(capabilityStateIds, requiredCapabilityStates, "capability_states");

  for (const record of [...applicabilityClasses, ...executionStatuses, ...capabilityStates]) {
    requireTextFields(record, ["label", "description"], "controlled value");
  }

  for (const capability of capabilities) {
    requireTextFields(capability, ["label", "description", "category"], "governance_capability");
  }

  for (const surface of validationSurfaces) {
    requireTextFields(surface, ["label", "description", "evidence_kind"], "validation_surface");
  }

  for (const gate of gates) {
    requireTextFields(gate, ["label", "description", "owner_macro_requirement", "applicability_class"], "governance_gate");
    if (!/^MR-\d{4}$/u.test(String(gate.owner_macro_requirement ?? ""))) {
      addError(`governance_gate ${gate.id} owner_macro_requirement must be an MR id.`);
    }
    if (!applicabilityClassIds.has(String(gate.applicability_class ?? ""))) {
      addError(`governance_gate ${gate.id} references unknown applicability_class: ${String(gate.applicability_class ?? "")}`);
    }

    const targetScopes = asArray(gate.target_scopes);
    if (targetScopes.length === 0) addError(`governance_gate ${gate.id} must define at least one target_scope.`);

    const gateSurfaces = asArray(gate.validation_surfaces);
    if (gateSurfaces.length === 0) {
      addError(`governance_gate ${gate.id} must define at least one validation_surface.`);
    }
    for (const surfaceId of gateSurfaces) {
      if (!validationSurfaceIds.has(String(surfaceId))) {
        addError(`governance_gate ${gate.id} references unknown validation_surface: ${String(surfaceId)}`);
      }
    }

    const requiredCapabilities = asArray(gate.required_capabilities);
    if (String(gate.applicability_class) === "capability_required" && requiredCapabilities.length === 0) {
      addError(`governance_gate ${gate.id} with capability_required must declare required_capabilities.`);
    }
    for (const capabilityId of requiredCapabilities) {
      if (!capabilityIds.has(String(capabilityId))) {
        addError(`governance_gate ${gate.id} references unknown capability: ${String(capabilityId)}`);
      }
    }

    for (const statusField of ["result_when_not_applicable", "unsupported_behavior"]) {
      const status = String(gate[statusField] ?? "");
      if (status && !executionStatusIds.has(status)) {
        addError(`governance_gate ${gate.id} references unknown ${statusField}: ${status}`);
      }
    }
  }

  for (const profile of profiles) {
    requireTextFields(profile, ["label", "description", "target_scope"], "governance_profile");
    if (typeof profile.baseline_required !== "boolean") {
      addError(`governance_profile ${profile.id} must define boolean baseline_required.`);
    }
    const profileGates = asArray(profile.gates);
    if (profileGates.length === 0) addError(`governance_profile ${profile.id} must reference at least one gate.`);
    for (const gateId of profileGates) {
      if (!gateIds.has(String(gateId))) {
        addError(`governance_profile ${profile.id} references unknown gate: ${String(gateId)}`);
      }
    }
    for (const field of ["required_capabilities", "optional_capabilities"]) {
      for (const capabilityId of asArray(profile[field])) {
        if (!capabilityIds.has(String(capabilityId))) {
          addError(`governance_profile ${profile.id} references unknown ${field}: ${String(capabilityId)}`);
        }
      }
    }
  }

  if (!profileIds.has("platform_self_governance")) {
    addError("governance_profiles must include platform_self_governance for threat-forge dogfooding.");
  }
  if (!gateIds.has("child_governance_registry_contract")) {
    addError("governance_gates must include child_governance_registry_contract for this validator.");
  }

  return {
    classes: applicabilityClassIds.size,
    statuses: executionStatusIds.size,
    capabilities: capabilityIds.size,
    gates: gateIds.size,
    profiles: profileIds.size,
    surfaces: validationSurfaceIds.size,
  };
}

/**
 * Safely writes fixture files under a temporary root.
 *
 * @param {string} tempRoot - Temporary repository root.
 * @param {Record<string, string>} files - Repository-relative fixture files.
 * @returns {void}
 */
function writeFixtureFiles(tempRoot, files) {
  for (const [projectPath, contents] of Object.entries(files ?? {})) {
    const normalizedPath = normalizeProjectPath(projectPath);
    const targetPath = path.resolve(tempRoot, normalizedPath);
    if (!targetPath.startsWith(tempRoot + path.sep)) {
      throw new Error(`Fixture file escapes temporary root: ${projectPath}`);
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, String(contents ?? ""), "utf8");
  }
}

/**
 * Runs a single negative fixture through this same checker in an isolated tree.
 *
 * @param {string} fixturePath - Fixture JSON path.
 * @returns {{ passed: boolean, id: string, diagnostic?: string }} Fixture result.
 */
function runNegativeFixture(fixturePath) {
  const fixture = JSON.parse(readText(fixturePath));
  const fixtureId = String(fixture.id ?? path.basename(fixturePath, ".json"));
  const expectedDiagnostic = String(fixture.expectedDiagnostic ?? "").trim();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `tf-child-governance-registries-${fixtureId}-`));

  try {
    writeFixtureFiles(tempRoot, fixture.files ?? {});
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: tempRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        TF_CHILD_PROJECT_GOVERNANCE_REGISTRY_ROOT: tempRoot,
        TF_CHILD_PROJECT_GOVERNANCE_REGISTRY_SKIP_NEGATIVE_FIXTURES: "1",
      },
    });

    const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (result.status === 0) {
      return { passed: false, id: fixtureId, diagnostic: "fixture unexpectedly passed" };
    }
    if (expectedDiagnostic && !combinedOutput.includes(expectedDiagnostic)) {
      return {
        passed: false,
        id: fixtureId,
        diagnostic: `expected diagnostic fragment was not found: ${expectedDiagnostic}`,
      };
    }
    return { passed: true, id: fixtureId };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

/**
 * Proves representative invalid registry states fail closed.
 *
 * @returns {number} Number of negative fixtures executed.
 */
function validateNegativeFixtures() {
  if (skipNegativeFixtures || !fs.existsSync(negativeFixturesDir)) return 0;

  const fixturePaths = fs
    .readdirSync(negativeFixturesDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(negativeFixturesDir, name));

  for (const fixturePath of fixturePaths) {
    const result = runNegativeFixture(fixturePath);
    if (!result.passed) {
      errors.push(`Negative fixture ${result.id} failed: ${result.diagnostic}`);
    }
  }

  return fixturePaths.length;
}

const counts = validateRegistries();
const negativeFixtureCount = validateNegativeFixtures();

if (errors.length > 0) {
  console.error("Child project governance registry contract check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Child project governance registry contract check passed.");
console.log("Implemented requirement: MR-0003REQ-0055");
console.log("Implemented requirement: MR-0003REQ-0056");
console.log("Implemented requirement: MR-0003REQ-0057");
console.log("Implemented requirement: MR-0003REQ-0058");
console.log("Implemented requirement: MR-0003REQ-0059");
console.log("Implemented requirement: MR-0003REQ-0060");
console.log(`Registry directory: ${normalizeProjectPath(path.relative(rootDir, registryDir))}`);
console.log(`Registry files: ${Object.keys(registryFiles).length}`);
console.log(`Applicability classes: ${counts.classes}`);
console.log(`Execution result statuses: ${counts.statuses}`);
console.log(`Governance capabilities: ${counts.capabilities}`);
console.log(`Governance gates: ${counts.gates}`);
console.log(`Governance profiles: ${counts.profiles}`);
console.log(`Validation surfaces: ${counts.surfaces}`);
console.log(`Negative fixtures: ${negativeFixtureCount}`);
