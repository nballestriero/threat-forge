#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMarkdownSectionTitles, parseMarkdownBody } from "./lib/markdown-body-parser.mjs";

/**
 * @file Deterministic ADR Markdown body format checker.
 *
 * @implementsRequirement MR-0001REQ-0023
 * @derivedFromDecision MR-0001/ADR-0006
 * @macroRequirement MR-0000
 * @macroRequirement MR-0001
 *
 * This tool validates governed ADR body files against the
 * `adr-functional-decision-body` profile from the governed body-format registry.
 * It consumes compact ADR registry records, the shared Markdown body parser, and
 * the body-format registry rather than hardcoding the ADR section policy in the
 * validator itself.
 *
 * Side effects: reads project-model decision registries, ADR body files, and the
 * body-format registry; writes diagnostics to stdout/stderr; exits with a
 * non-zero code when validation fails. It does not mutate project files, repair
 * invalid bodies, generate artifacts, or validate Requirement bodies.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const projectModelDir = path.join(rootDir, "docs", "reference", "project-model");
const registersDir = path.join(projectModelDir, "registers");
const decisionsDir = path.join(registersDir, "decisions");
const decisionBodiesDir = path.join(projectModelDir, "body", "decisions");
const bodyFormatRegistryPath = path.join(registersDir, "body-formats.registry.yml");
const adrBodyProfileId = "adr-functional-decision-body";

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
 * Lists all ADR body files under the governed decisions body root.
 *
 * @returns {string[]} Absolute paths to ADR body files.
 */
function listAdrBodyFiles() {
  if (!ensureFileExists(decisionBodiesDir, "ADR body directory")) return [];

  const files = [];
  for (const macroEntry of fs.readdirSync(decisionBodiesDir, { withFileTypes: true })) {
    if (!macroEntry.isDirectory()) continue;
    const macroDir = path.join(decisionBodiesDir, macroEntry.name);
    for (const bodyEntry of fs.readdirSync(macroDir, { withFileTypes: true })) {
      if (bodyEntry.isFile() && bodyEntry.name.endsWith("_body.md")) {
        files.push(path.join(macroDir, bodyEntry.name));
      }
    }
  }
  return files.sort((left, right) => relativeProjectPath(left).localeCompare(relativeProjectPath(right)));
}

/**
 * Gets the governed ADR body profile from the body-format registry.
 *
 * @returns {Record<string, unknown>|null} ADR body profile, or null when absent.
 */
function readAdrBodyProfile() {
  if (!ensureFileExists(bodyFormatRegistryPath, "Body-format registry")) return null;
  const registry = readYaml(bodyFormatRegistryPath);
  const profiles = Array.isArray(registry.body_format_profiles) ? registry.body_format_profiles : [];
  const profile = profiles.find((entry) => entry?.id === adrBodyProfileId);
  if (!profile) {
    errors.push(`body format registry is missing required ADR profile: ${adrBodyProfileId}`);
    return null;
  }
  return profile;
}

/**
 * Validates one ADR Markdown body against the governed ADR body profile.
 *
 * @param {{adr:Record<string, unknown>, registryPath:string, profile:Record<string, unknown>, expectedBodyPaths:Set<string>}} input - Validation input.
 * @returns {void}
 */
function validateAdrBody({ adr, registryPath, profile, expectedBodyPaths }) {
  const adrId = adr?.id;
  const macroRequirementId = adr?.macro_requirement_id;
  const recordContext = `${relativeProjectPath(registryPath)} ADR ${adrId || "#unknown"}`;

  if (!isPresent(adrId)) {
    errors.push(`${recordContext} is missing id.`);
    return;
  }

  if (!isPresent(adr.body_path)) {
    errors.push(`${recordContext} is missing body_path.`);
    return;
  }

  const bodyPath = resolveProjectPath(adr.body_path);
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
    if (!parsed.h1.title.startsWith(String(adrId))) {
      errors.push(`${bodyContext} H1 must start with ADR id ${adrId}.`);
    }
  }

  if (isPresent(macroRequirementId)) {
    const expectedDirectory = `docs/reference/project-model/body/decisions/${macroRequirementId}/`;
    if (!normalizeProjectPath(adr.body_path).startsWith(expectedDirectory)) {
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

const profile = readAdrBodyProfile();
const expectedBodyPaths = new Set();

if (profile) {
  for (const registryPath of listAdrRegistryFiles()) {
    const registry = readYaml(registryPath);
    const decisions = Array.isArray(registry.decisions) ? registry.decisions : [];
    for (const adr of decisions) {
      validateAdrBody({ adr, registryPath, profile, expectedBodyPaths });
    }
  }

  for (const bodyPath of listAdrBodyFiles()) {
    const relativeBodyPath = relativeProjectPath(bodyPath);
    if (!expectedBodyPaths.has(relativeBodyPath)) {
      errors.push(`ADR body file is not referenced by any ADR registry record: ${relativeBodyPath}`);
    }
  }
}

if (errors.length > 0) {
  console.error("ADR body format check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("ADR body format check passed.");
console.log("Implemented requirement: MR-0001REQ-0023");
console.log(`Profile: ${adrBodyProfileId}`);
console.log(`Registry: ${relativeProjectPath(bodyFormatRegistryPath)}`);
