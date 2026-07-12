#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMarkdownSectionTitles, parseMarkdownBody } from "./lib/markdown-body-parser.mjs";

/**
 * @file Deterministic Requirement Markdown body format checker.
 *
 * @implementsRequirement MR-0001REQ-0024
 * @derivedFromDecision MR-0001/ADR-0006
 * @macroRequirement MR-0000
 * @macroRequirement MR-0001
 *
 * This tool validates governed Requirement body files against the functional and
 * specialized Requirement profiles from the governed body-format registry. It
 * consumes compact Requirement registry records, the shared Markdown body
 * parser, and the body-format registry rather than hardcoding section policies
 * in this validator.
 *
 * Side effects: reads project-model Requirement registries, Requirement body
 * files, and the body-format registry; writes diagnostics to stdout/stderr;
 * exits with a non-zero code when validation fails. It does not mutate project
 * files, repair invalid bodies, generate artifacts, or validate ADR bodies.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const projectModelDir = path.join(rootDir, "docs", "reference", "project-model");
const registersDir = path.join(projectModelDir, "registers");
const requirementsDir = path.join(registersDir, "requirements");
const requirementBodiesDir = path.join(projectModelDir, "body", "requirements");
const bodyFormatRegistryPath = path.join(registersDir, "body-formats.registry.yml");
const functionalRequirementProfileId = "requirement-functional-body";
const specializedRequirementProfileId = "requirement-specialized-body";

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
 * Lists all Requirement body files under the governed requirements body root.
 *
 * @returns {string[]} Absolute paths to Requirement body files.
 */
function listRequirementBodyFiles() {
  if (!ensureFileExists(requirementBodiesDir, "Requirement body directory")) return [];

  const files = [];
  for (const macroEntry of fs.readdirSync(requirementBodiesDir, { withFileTypes: true })) {
    if (!macroEntry.isDirectory()) continue;
    const macroDir = path.join(requirementBodiesDir, macroEntry.name);
    for (const bodyEntry of fs.readdirSync(macroDir, { withFileTypes: true })) {
      if (bodyEntry.isFile() && bodyEntry.name.endsWith("_body.md")) {
        files.push(path.join(macroDir, bodyEntry.name));
      }
    }
  }
  return files.sort((left, right) => relativeProjectPath(left).localeCompare(relativeProjectPath(right)));
}

/**
 * Gets the governed Requirement body profiles from the body-format registry.
 *
 * @returns {{functional:Record<string, unknown>|null,specialized:Record<string, unknown>|null}} Requirement body profiles.
 */
function readRequirementBodyProfiles() {
  if (!ensureFileExists(bodyFormatRegistryPath, "Body-format registry")) {
    return { functional: null, specialized: null };
  }
  const registry = readYaml(bodyFormatRegistryPath);
  const profiles = Array.isArray(registry.body_format_profiles) ? registry.body_format_profiles : [];
  const functional = profiles.find((entry) => entry?.id === functionalRequirementProfileId) ?? null;
  const specialized = profiles.find((entry) => entry?.id === specializedRequirementProfileId) ?? null;

  if (!functional) {
    errors.push(`body format registry is missing required Requirement profile: ${functionalRequirementProfileId}`);
  }
  if (!specialized) {
    errors.push(`body format registry is missing required Requirement profile: ${specializedRequirementProfileId}`);
  }

  return { functional, specialized };
}

/**
 * Determines whether a Requirement record is a specialized child requirement.
 *
 * @param {Record<string, unknown>} requirement - Requirement registry record.
 * @returns {boolean} True when the record is a specialized child requirement.
 */
function isSpecializedRequirement(requirement) {
  if (requirement?.type === "specialized") return true;
  if (isPresent(requirement?.parent_requirement_id)) return true;
  return /^MR-\d{4}REQ-\d{4}[A-Z]+-\d{4}$/u.test(String(requirement?.id ?? ""));
}

/**
 * Returns the expected canonical profile for one Requirement record.
 *
 * @param {Record<string, unknown>} requirement - Requirement registry record.
 * @param {{functional:Record<string, unknown>|null,specialized:Record<string, unknown>|null}} profiles - Available profiles.
 * @returns {Record<string, unknown>|null} Matching body profile.
 */
function selectRequirementProfile(requirement, profiles) {
  return isSpecializedRequirement(requirement) ? profiles.specialized : profiles.functional;
}

/**
 * Validates one Requirement Markdown body against its governed body profile.
 *
 * @param {{requirement:Record<string, unknown>, registryPath:string, profile:Record<string, unknown>, expectedBodyPaths:Set<string>, requirementIds:Set<string>}} input - Validation input.
 * @returns {void}
 */
function validateRequirementBody({ requirement, registryPath, profile, expectedBodyPaths, requirementIds }) {
  const requirementId = requirement?.id;
  const macroRequirementId = requirementId ? /^MR-\d{4}/u.exec(String(requirementId))?.[0] : null;
  const recordContext = `${relativeProjectPath(registryPath)} Requirement ${requirementId || "#unknown"}`;

  if (!isPresent(requirementId)) {
    errors.push(`${recordContext} is missing id.`);
    return;
  }

  const specialized = isSpecializedRequirement(requirement);
  if (specialized) {
    if (!isPresent(requirement.parent_requirement_id)) {
      errors.push(`${recordContext} is specialized but is missing parent_requirement_id.`);
    } else if (!requirementIds.has(String(requirement.parent_requirement_id))) {
      errors.push(`${recordContext} references unknown parent_requirement_id: ${requirement.parent_requirement_id}`);
    }
  }

  if (!isPresent(requirement.body_path)) {
    errors.push(`${recordContext} is missing body_path.`);
    return;
  }

  const bodyPath = resolveProjectPath(requirement.body_path);
  expectedBodyPaths.add(relativeProjectPath(bodyPath));

  if (!ensureFileExists(bodyPath, `${recordContext} body_path`)) return;

  const parsed = parseMarkdownBody(readText(bodyPath), { sourcePath: relativeProjectPath(bodyPath) });
  const bodyContext = `${recordContext} body ${relativeProjectPath(bodyPath)}`;

  if (!parsed.startsWithH1 || !parsed.h1) {
    errors.push(`${bodyContext} must start with an H1 heading.`);
  } else {
    const h1Pattern = new RegExp(profile.h1_rule?.pattern ?? "");
    if (!h1Pattern.test(parsed.h1.raw)) {
      errors.push(`${bodyContext} H1 does not match profile ${profile.id} pattern: ${profile.h1_rule?.pattern}`);
    }
    if (!parsed.h1.title.startsWith(String(requirementId))) {
      errors.push(`${bodyContext} H1 must start with Requirement id ${requirementId}.`);
    }
  }

  if (isPresent(macroRequirementId)) {
    const expectedDirectory = `docs/reference/project-model/body/requirements/${macroRequirementId}/`;
    if (!normalizeProjectPath(requirement.body_path).startsWith(expectedDirectory)) {
      errors.push(`${bodyContext} body_path must be under ${expectedDirectory}.`);
    }
  }

  const sectionTitles = getMarkdownSectionTitles(parsed);
  const requiredSections = Array.isArray(profile.required_sections) ? profile.required_sections : [];
  const requiredSectionOrder = Array.isArray(profile.required_section_order) ? profile.required_section_order : [];
  const optionalSections = Array.isArray(profile.optional_sections) ? profile.optional_sections : [];
  const allowedSections = new Set([...requiredSections, ...optionalSections]);

  for (const section of requiredSections) {
    if (!sectionTitles.includes(section)) {
      errors.push(`${bodyContext} is missing required section: ${section}`);
    }
  }

  if (profile.allow_extra_sections === false) {
    for (const section of sectionTitles) {
      if (!allowedSections.has(section)) {
        errors.push(`${bodyContext} contains unsupported section: ${section}`);
      }
    }
  }

  let previousIndex = -1;
  for (const section of requiredSectionOrder) {
    const currentIndex = sectionTitles.indexOf(section);
    if (currentIndex === -1) continue;
    if (currentIndex < previousIndex) {
      errors.push(`${bodyContext} has required section out of order: ${section}`);
    }
    previousIndex = currentIndex;
  }
}

const profiles = readRequirementBodyProfiles();
const expectedBodyPaths = new Set();
const requirementsToValidate = [];
const requirementIds = new Set();

if (profiles.functional && profiles.specialized) {
  for (const registryPath of listRequirementRegistryFiles()) {
    const registry = readYaml(registryPath);
    const requirements = Array.isArray(registry.requirements) ? registry.requirements : [];
    for (const requirement of requirements) {
      if (isPresent(requirement?.id)) requirementIds.add(String(requirement.id));
      requirementsToValidate.push({ requirement, registryPath });
    }
  }

  for (const entry of requirementsToValidate) {
    const profile = selectRequirementProfile(entry.requirement, profiles);
    if (profile) {
      validateRequirementBody({ ...entry, profile, expectedBodyPaths, requirementIds });
    }
  }

  for (const bodyPath of listRequirementBodyFiles()) {
    const relativeBodyPath = relativeProjectPath(bodyPath);
    if (!expectedBodyPaths.has(relativeBodyPath)) {
      errors.push(`Requirement body file is not referenced by any Requirement registry record: ${relativeBodyPath}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Requirement body format check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Requirement body format check passed.");
console.log("Implemented requirement: MR-0001REQ-0024");
console.log(`Profiles: ${functionalRequirementProfileId}, ${specializedRequirementProfileId}`);
console.log(`Registry: ${relativeProjectPath(bodyFormatRegistryPath)}`);
