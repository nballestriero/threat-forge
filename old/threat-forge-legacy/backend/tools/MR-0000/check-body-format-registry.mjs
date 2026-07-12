#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

/**
 * @file Deterministic body-format registry schema checker.
 *
 * @implementsRequirement MR-0001REQ-0011
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0000
 * @macroRequirement MR-0001
 *
 * This tool validates the governed body-format registry through an explicit
 * JSON Schema contract and small deterministic semantic checks that JSON Schema
 * cannot express ergonomically for this repository. It is intentionally limited
 * to the registry structure; Markdown body parsing and ADR/Requirement body
 * conformance are separate controls derived from MR-0001REQ-0010, MR-0001REQ-0005,
 * and MR-0001REQ-0014.
 *
 * Side effects: reads project-model registry and schema files, writes diagnostics
 * to stdout/stderr, and exits with a non-zero code when validation fails. It does
 * not mutate project files, generate artifacts, infer body profiles, or repair
 * invalid records.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const projectModelDir = path.join(rootDir, "docs", "reference", "project-model");
const registersDir = path.join(projectModelDir, "registers");
const contractsDir = path.join(scriptDir, "contracts");

const bodyFormatRegistryPath = path.join(registersDir, "body-formats.registry.yml");
const bodyFormatRegistrySchemaPath = path.join(contractsDir, "body-format-registry.schema.json");

const errors = [];

/**
 * Reads UTF-8 text from a file while stripping a possible byte-order mark.
 *
 * @param {string} filePath - Absolute path of the file to read.
 * @returns {string} File contents without a leading UTF-8 BOM.
 * @throws {Error} When the file cannot be read.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
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
 * This parser deliberately supports only the simple mapping, sequence, scalar,
 * and block forms used by project-model registries. It avoids introducing a YAML
 * dependency in this micropasso so AJV remains the only new runtime dependency.
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
 * Formats an AJV instance path for readable diagnostics.
 *
 * @param {string} instancePath - JSON pointer path from AJV.
 * @returns {string} Human-readable path.
 */
function formatInstancePath(instancePath) {
  return instancePath || "<root>";
}

/**
 * Validates the registry object against the JSON Schema contract.
 *
 * @param {Record<string, unknown>} registry - Parsed body-format registry.
 * @param {Record<string, unknown>} schema - JSON Schema contract.
 * @returns {void}
 */
function validateSchema(registry, schema) {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  if (validate(registry)) return;

  for (const diagnostic of validate.errors ?? []) {
    errors.push(
      `body format registry schema violation at ${formatInstancePath(diagnostic.instancePath)}: ${diagnostic.message}`,
    );
  }
}

/**
 * Validates semantic body-format constraints that are easier to express in code.
 *
 * @param {Record<string, unknown>} registry - Parsed body-format registry.
 * @returns {void}
 */
function validateSemanticRules(registry) {
  const profiles = Array.isArray(registry.body_format_profiles) ? registry.body_format_profiles : [];
  const profileIds = new Set();

  for (const [index, profile] of profiles.entries()) {
    const context = `body_format_profiles[${index}]`;

    if (profileIds.has(profile.id)) {
      errors.push(`${context} duplicates body format profile id: ${profile.id}`);
    }
    profileIds.add(profile.id);

    try {
      // eslint-disable-next-line no-new
      new RegExp(profile.h1_rule?.pattern ?? "");
    } catch (error) {
      errors.push(`${context}.h1_rule.pattern is not a valid JavaScript regular expression: ${error.message}`);
    }

    const requiredSections = new Set(profile.required_sections ?? []);
    const orderSections = new Set(profile.required_section_order ?? []);
    const optionalSections = new Set(profile.optional_sections ?? []);

    for (const section of requiredSections) {
      if (!orderSections.has(section)) {
        errors.push(`${context}.required_section_order must include required section: ${section}`);
      }
      if (optionalSections.has(section)) {
        errors.push(`${context}.optional_sections must not repeat required section: ${section}`);
      }
    }

    for (const section of orderSections) {
      if (!requiredSections.has(section)) {
        errors.push(`${context}.required_section_order contains non-required section: ${section}`);
      }
    }
  }
}

if (ensureFileExists(bodyFormatRegistryPath, "Body-format registry") && ensureFileExists(bodyFormatRegistrySchemaPath, "Body-format registry schema")) {
  const registry = parseYaml(readText(bodyFormatRegistryPath));
  const schema = JSON.parse(readText(bodyFormatRegistrySchemaPath));

  validateSchema(registry, schema);
  validateSemanticRules(registry);
}

if (errors.length > 0) {
  console.error("Body format registry check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Body format registry check passed.");
console.log("Implemented requirement: MR-0001REQ-0011");
console.log(`Registry: ${relativeProjectPath(bodyFormatRegistryPath)}`);
console.log(`Schema: ${relativeProjectPath(bodyFormatRegistrySchemaPath)}`);
