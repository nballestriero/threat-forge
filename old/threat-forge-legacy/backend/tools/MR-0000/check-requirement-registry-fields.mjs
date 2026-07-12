#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Deterministic Requirement registry field governance checker.
 *
 * @implementsRequirement MR-0001REQ-0025GOV-0001
 * @implementsRequirement MR-0001REQ-0025GOV-0002
 * @derivedFromDecision MR-0001/ADR-0009
 * @macroRequirement MR-0001
 * @macroRequirement MR-0000
 *
 * This tool validates governed Requirement registry records against the
 * Requirement governance registry. It enforces controlled lifecycle statuses,
 * controlled Requirement types, specialized Requirement suffix families, parent
 * functional Requirement consistency, same-macro parent scope, body path
 * existence, and same-scope ADR references.
 *
 * Side effects: reads project-model Requirement registries, ADR registries,
 * Requirement body files, and the Requirement governance registry; writes
 * diagnostics to stdout/stderr; exits with a non-zero code when validation
 * fails. It does not mutate project files, repair registry records, validate
 * Markdown body structure, or generate artifacts.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..", "..");
const rootDir = process.env.TF_REQUIREMENT_REGISTRY_FIELDS_ROOT
  ? path.resolve(process.env.TF_REQUIREMENT_REGISTRY_FIELDS_ROOT)
  : defaultRootDir;
const projectModelDir = path.join(rootDir, "docs", "reference", "project-model");
const registersDir = path.join(projectModelDir, "registers");
const requirementsDir = path.join(registersDir, "requirements");
const decisionsDir = path.join(registersDir, "decisions");
const requirementGovernancePath = path.join(requirementsDir, "requirement-governance.registry.yml");
const negativeFixturesDir = process.env.TF_REQUIREMENT_REGISTRY_FIELDS_NEGATIVE_FIXTURES_DIR
  ? path.resolve(process.env.TF_REQUIREMENT_REGISTRY_FIELDS_NEGATIVE_FIXTURES_DIR)
  : path.join(scriptDir, "fixtures", "requirement-registry-fields", "negative");
const skipNegativeFixtures = process.env.TF_REQUIREMENT_REGISTRY_FIELDS_SKIP_NEGATIVE_FIXTURES === "1";

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
 * Converts an absolute file path to a repository-relative display path.
 *
 * @param {string} filePath - Absolute path to display.
 * @returns {string} Repository-relative path using forward slashes.
 */
function relativeProjectPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

/**
 * Checks whether a file exists and records a diagnostic when it does not.
 *
 * @param {string} filePath - Absolute path to check.
 * @param {string} label - Human-readable file role for diagnostics.
 * @returns {boolean} True when the file exists; otherwise false.
 */
function ensureFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label} does not exist: ${relativeProjectPath(filePath)}`);
    return false;
  }
  return true;
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
 * Parses a simple scalar value used by the governed project-model YAML files.
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
 * Returns true when a compact registry field is present.
 *
 * @param {unknown} value - Value to inspect.
 * @returns {boolean} True when value is present.
 */
function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

/**
 * Lists governed Requirement registry files deterministically.
 *
 * @returns {string[]} Absolute paths to Requirement registry files.
 */
function listRequirementRegistryFiles() {
  if (!ensureFileExists(requirementsDir, "requirements registry directory")) return [];

  return fs
    .readdirSync(requirementsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".requirements.registry.yml"))
    .map((entry) => path.join(requirementsDir, entry.name))
    .sort((left, right) => relativeProjectPath(left).localeCompare(relativeProjectPath(right)));
}

/**
 * Lists governed ADR registry files deterministically.
 *
 * @returns {string[]} Absolute paths to ADR registry files.
 */
function listAdrRegistryFiles() {
  if (!ensureFileExists(decisionsDir, "decisions registry directory")) return [];

  return fs
    .readdirSync(decisionsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".decisions.registry.yml"))
    .map((entry) => path.join(decisionsDir, entry.name))
    .sort((left, right) => relativeProjectPath(left).localeCompare(relativeProjectPath(right)));
}

/**
 * Builds a set from controlled registry entries and validates duplicate ids.
 *
 * @param {unknown} value - Expected array of objects with id.
 * @param {string} context - Diagnostic context.
 * @returns {Set<string>} Controlled id set.
 */
function controlledIdSet(value, context) {
  const ids = new Set();
  if (!Array.isArray(value)) {
    errors.push(`${context} must be an array.`);
    return ids;
  }

  for (const [index, entry] of value.entries()) {
    const id = String(entry?.id ?? "").trim();
    if (!id) {
      errors.push(`${context} entry #${index + 1} is missing id.`);
      continue;
    }
    if (ids.has(id)) {
      errors.push(`${context} contains duplicate id: ${id}`);
    }
    ids.add(id);
  }

  return ids;
}

/**
 * Builds a set of specialized family suffixes from controlled entries.
 *
 * @param {unknown} value - Expected array of specialized family objects.
 * @returns {Set<string>} Controlled suffix set.
 */
function controlledSpecializedSuffixSet(value) {
  const suffixes = new Set();
  if (!Array.isArray(value)) {
    errors.push("specialized_requirement_families must be an array.");
    return suffixes;
  }

  const familyIds = new Set();
  for (const [index, entry] of value.entries()) {
    const id = String(entry?.id ?? "").trim();
    const suffix = String(entry?.suffix ?? "").trim();
    const context = `specialized_requirement_families entry #${index + 1}`;

    if (!id) {
      errors.push(`${context} is missing id.`);
    } else if (familyIds.has(id)) {
      errors.push(`specialized_requirement_families contains duplicate id: ${id}`);
    }
    familyIds.add(id);

    if (!/^[A-Z]+$/u.test(suffix)) {
      errors.push(`${context} suffix must contain only uppercase ASCII letters.`);
      continue;
    }
    if (suffixes.has(suffix)) {
      errors.push(`specialized_requirement_families contains duplicate suffix: ${suffix}`);
    }
    suffixes.add(suffix);
  }

  return suffixes;
}

/**
 * Reads controlled Requirement governance values.
 *
 * @returns {{functionalPattern:RegExp|null,specializedPattern:RegExp|null,statusIds:Set<string>,typeIds:Set<string>,specializedSuffixes:Set<string>,allowedFieldIds:Set<string>,requiredFieldIds:Set<string>}} Controlled model.
 */
function readRequirementGovernance() {
  if (!ensureFileExists(requirementGovernancePath, "Requirement governance registry")) {
    return {
      functionalPattern: null,
      specializedPattern: null,
      statusIds: new Set(),
      typeIds: new Set(),
      specializedSuffixes: new Set(),
      allowedFieldIds: new Set(),
      requiredFieldIds: new Set(),
    };
  }

  const governance = readYaml(requirementGovernancePath);
  const patterns = governance.requirement_id_patterns ?? {};
  let functionalPattern = null;
  let specializedPattern = null;

  try {
    functionalPattern = new RegExp(String(patterns.functional ?? ""), "u");
  } catch (error) {
    errors.push(`requirement_id_patterns.functional is not a valid regular expression: ${error.message}`);
  }

  try {
    specializedPattern = new RegExp(String(patterns.specialized ?? ""), "u");
  } catch (error) {
    errors.push(`requirement_id_patterns.specialized is not a valid regular expression: ${error.message}`);
  }

  const statusIds = controlledIdSet(governance.requirement_statuses, "requirement_statuses");
  const typeIds = controlledIdSet(governance.requirement_types, "requirement_types");
  const specializedSuffixes = controlledSpecializedSuffixSet(governance.specialized_requirement_families);
  const fields = Array.isArray(governance.requirement_registry_fields) ? governance.requirement_registry_fields : [];
  const allowedFieldIds = controlledIdSet(fields, "requirement_registry_fields");
  const requiredFieldIds = new Set(
    fields.filter((field) => field?.required === true).map((field) => String(field.id ?? "").trim()).filter(Boolean),
  );

  if (fields.length === 0) {
    errors.push("requirement_registry_fields must define governed Requirement fields.");
  }

  return { functionalPattern, specializedPattern, statusIds, typeIds, specializedSuffixes, allowedFieldIds, requiredFieldIds };
}

/**
 * Extracts a macro-requirement id from a governed Requirement id.
 *
 * @param {string} requirementId - Requirement id.
 * @returns {string} Macro-requirement id, or empty string when unavailable.
 */
function requirementMacroId(requirementId) {
  return /^MR-\d{4}/u.exec(String(requirementId ?? ""))?.[0] ?? "";
}

/**
 * Extracts the specialized family suffix from a specialized Requirement id.
 *
 * @param {string} requirementId - Requirement id.
 * @returns {string} Specialized family suffix, or empty string when unavailable.
 */
function specializedSuffix(requirementId) {
  return /^MR-\d{4}REQ-\d{4}([A-Z]+)-\d{4}$/u.exec(String(requirementId ?? ""))?.[1] ?? "";
}

/**
 * Determines whether a Requirement record should be governed as specialized.
 *
 * @param {Record<string, unknown>} requirement - Requirement registry record.
 * @param {RegExp|null} specializedPattern - Controlled specialized id pattern.
 * @returns {boolean} True when the record is specialized.
 */
function isSpecializedRequirement(requirement, specializedPattern) {
  const id = String(requirement?.id ?? "");
  if (requirement?.type === "specialized") return true;
  if (isPresent(requirement?.parent_requirement_id)) return true;
  return specializedPattern?.test(id) ?? /^MR-\d{4}REQ-\d{4}[A-Z]+-\d{4}$/u.test(id);
}

/**
 * Builds an ADR id index grouped by macro requirement scope.
 *
 * @returns {Map<string, Set<string>>} ADR ids keyed by macro-requirement id.
 */
function buildAdrIndex() {
  const adrIdsByMacro = new Map();

  for (const registryPath of listAdrRegistryFiles()) {
    const registry = readYaml(registryPath);
    const macroRequirementId = String(registry.macro_requirement_id ?? "").trim();
    if (!macroRequirementId) {
      errors.push(`${relativeProjectPath(registryPath)} is missing macro_requirement_id.`);
      continue;
    }

    if (!adrIdsByMacro.has(macroRequirementId)) {
      adrIdsByMacro.set(macroRequirementId, new Set());
    }

    const decisions = Array.isArray(registry.decisions) ? registry.decisions : [];
    for (const adr of decisions) {
      const adrId = String(adr?.id ?? "").trim();
      if (adrId) adrIdsByMacro.get(macroRequirementId).add(adrId);
    }
  }

  return adrIdsByMacro;
}

/**
 * Reads all Requirement records and detects duplicate ids.
 *
 * @returns {{records:Array<{requirement:Record<string, unknown>,registryPath:string,macroRequirementId:string}>,requirementsById:Map<string, Record<string, unknown>>,registryById:Map<string, string>}} Requirement indexes.
 */
function readRequirementRecords() {
  const records = [];
  const requirementsById = new Map();
  const registryById = new Map();

  for (const registryPath of listRequirementRegistryFiles()) {
    const registry = readYaml(registryPath);
    const macroRequirementId = String(registry.macro_requirement_id ?? "").trim();
    if (!macroRequirementId) {
      errors.push(`${relativeProjectPath(registryPath)} is missing macro_requirement_id.`);
    }

    const requirements = Array.isArray(registry.requirements) ? registry.requirements : [];
    for (const requirement of requirements) {
      const requirementId = String(requirement?.id ?? "").trim();
      records.push({ requirement, registryPath, macroRequirementId });
      if (!requirementId) continue;

      if (requirementsById.has(requirementId)) {
        errors.push(
          `Duplicate Requirement id ${requirementId} in ${relativeProjectPath(registryPath)} and ${registryById.get(requirementId)}.`,
        );
      } else {
        requirementsById.set(requirementId, requirement);
        registryById.set(requirementId, relativeProjectPath(registryPath));
      }
    }
  }

  return { records, requirementsById, registryById };
}

/**
 * Validates one Requirement record against controlled registry-field rules.
 *
 * @param {{requirement:Record<string, unknown>,registryPath:string,macroRequirementId:string}} entry - Requirement record entry.
 * @param {ReturnType<typeof readRequirementGovernance>} governance - Controlled governance values.
 * @param {Map<string, Record<string, unknown>>} requirementsById - Requirement lookup by id.
 * @param {Map<string, Set<string>>} adrIdsByMacro - ADR ids grouped by macro requirement.
 * @returns {void}
 */
function validateRequirementRecord(entry, governance, requirementsById, adrIdsByMacro) {
  const { requirement, registryPath, macroRequirementId } = entry;
  const requirementId = String(requirement?.id ?? "").trim();
  const recordContext = `${relativeProjectPath(registryPath)} Requirement ${requirementId || "#unknown"}`;

  for (const fieldId of Object.keys(requirement ?? {})) {
    if (!governance.allowedFieldIds.has(fieldId)) {
      errors.push(`${recordContext} contains unsupported field: ${fieldId}`);
    }
  }

  for (const fieldId of governance.requiredFieldIds) {
    if (!isPresent(requirement?.[fieldId])) {
      errors.push(`${recordContext} is missing required field: ${fieldId}`);
    }
  }

  if (!isPresent(requirementId)) {
    return;
  }

  const idMacroId = requirementMacroId(requirementId);
  if (macroRequirementId && idMacroId && macroRequirementId !== idMacroId) {
    errors.push(`${recordContext} id macro scope ${idMacroId} does not match registry macro_requirement_id ${macroRequirementId}.`);
  }

  const status = String(requirement?.status ?? "").trim();
  if (status && !governance.statusIds.has(status)) {
    errors.push(`${recordContext} status must be one of: ${Array.from(governance.statusIds).join(", ")}.`);
  }

  const type = String(requirement?.type ?? "").trim();
  if (type && !governance.typeIds.has(type)) {
    errors.push(`${recordContext} type must be one of: ${Array.from(governance.typeIds).join(", ")}.`);
  }

  const specialized = isSpecializedRequirement(requirement, governance.specializedPattern);
  const matchesFunctionalPattern = governance.functionalPattern?.test(requirementId) ?? false;
  const matchesSpecializedPattern = governance.specializedPattern?.test(requirementId) ?? false;

  if (specialized) {
    if (type !== "specialized") {
      errors.push(`${recordContext} is specialized and must declare type: specialized.`);
    }
    if (!matchesSpecializedPattern) {
      errors.push(`${recordContext} id must match the controlled specialized Requirement pattern.`);
    }

    const suffix = specializedSuffix(requirementId);
    if (!suffix) {
      errors.push(`${recordContext} is missing a specialized family suffix in its id.`);
    } else if (!governance.specializedSuffixes.has(suffix)) {
      errors.push(
        `${recordContext} specialized suffix ${suffix} must be one of: ${Array.from(governance.specializedSuffixes).join(", ")}.`,
      );
    }

    const parentRequirementId = String(requirement?.parent_requirement_id ?? "").trim();
    if (!parentRequirementId) {
      errors.push(`${recordContext} is specialized and must declare parent_requirement_id.`);
    } else {
      const parent = requirementsById.get(parentRequirementId);
      if (!parent) {
        errors.push(`${recordContext} references unknown parent_requirement_id: ${parentRequirementId}.`);
      } else {
        const parentSpecialized = isSpecializedRequirement(parent, governance.specializedPattern);
        const parentType = String(parent?.type ?? "").trim();
        const parentId = String(parent?.id ?? "").trim();
        if (parentSpecialized || parentType === "specialized") {
          errors.push(`${recordContext} parent_requirement_id must reference a functional parent Requirement: ${parentRequirementId}.`);
        }
        if (parentId && requirementMacroId(parentId) !== idMacroId) {
          errors.push(`${recordContext} parent_requirement_id must stay within the same macro-requirement scope: ${parentRequirementId}.`);
        }
      }
    }
  } else {
    if (type && type !== "functional") {
      errors.push(`${recordContext} non-specialized Requirement must declare type: functional when type is present.`);
    }
    if (!matchesFunctionalPattern) {
      errors.push(`${recordContext} id must match the controlled functional Requirement pattern.`);
    }
    if (isPresent(requirement?.parent_requirement_id)) {
      errors.push(`${recordContext} functional Requirement must not declare parent_requirement_id.`);
    }
  }

  const derivedFromDecisionId = String(requirement?.derived_from_decision_id ?? "").trim();
  if (derivedFromDecisionId) {
    const allowedAdrIds = adrIdsByMacro.get(idMacroId) ?? new Set();
    if (!allowedAdrIds.has(derivedFromDecisionId)) {
      errors.push(`${recordContext} derived_from_decision_id must reference an ADR in ${idMacroId}: ${derivedFromDecisionId}.`);
    }
  }

  const bodyPath = normalizeProjectPath(requirement?.body_path);
  if (bodyPath) {
    const expectedPrefix = `docs/reference/project-model/body/requirements/${idMacroId}/`;
    if (idMacroId && !bodyPath.startsWith(expectedPrefix)) {
      errors.push(`${recordContext} body_path must be under ${expectedPrefix}.`);
    }
    if (!bodyPath.endsWith(`${requirementId}_body.md`)) {
      errors.push(`${recordContext} body_path must end with ${requirementId}_body.md.`);
    }
    ensureFileExists(resolveProjectPath(bodyPath), `${recordContext} body_path`);
  }
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
 * Runs one negative Requirement registry field fixture through this checker in an isolated tree.
 *
 * @param {string} fixturePath - Fixture JSON path.
 * @returns {{ passed: boolean, id: string, diagnostic?: string }} Fixture result.
 */
function runNegativeFixture(fixturePath) {
  const fixture = JSON.parse(readText(fixturePath));
  const fixtureId = String(fixture.id ?? path.basename(fixturePath, ".json"));
  const expectedDiagnostic = String(fixture.expectedDiagnostic ?? "").trim();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `tf-requirement-registry-fields-${fixtureId}-`));

  try {
    writeFixtureFiles(tempRoot, fixture.files ?? {});
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: tempRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        TF_REQUIREMENT_REGISTRY_FIELDS_ROOT: tempRoot,
        TF_REQUIREMENT_REGISTRY_FIELDS_SKIP_NEGATIVE_FIXTURES: "1",
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
 * Proves representative invalid Requirement registry field states fail closed.
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

const governance = readRequirementGovernance();
const adrIdsByMacro = buildAdrIndex();
const { records, requirementsById } = readRequirementRecords();

for (const entry of records) {
  validateRequirementRecord(entry, governance, requirementsById, adrIdsByMacro);
}

const negativeFixtureCount = validateNegativeFixtures();

if (errors.length > 0) {
  console.error("Requirement registry field check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Requirement registry field check passed.");
console.log("Implemented requirement: MR-0001REQ-0025GOV-0001");
console.log("Implemented requirement: MR-0001REQ-0025GOV-0002");
console.log(`Registry: ${relativeProjectPath(requirementGovernancePath)}`);
console.log(`Negative fixtures: ${negativeFixtureCount}`);
