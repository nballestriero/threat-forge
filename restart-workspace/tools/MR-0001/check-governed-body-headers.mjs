#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Governed body header consistency checker.
 *
 * @implementsRequirement MR-0001ADR-0005REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0005
 * @macroRequirement MR-0001
 *
 * This checker validates that governed registry records use `title` as the
 * canonical human-readable title field and that each linked Markdown body
 * repeats that canonical title in exactly one H1 header derived from the
 * registry record id and title.
 *
 * Side effects: reads restart-workspace Project Model registries and governed
 * Markdown body files; writes JSON and Markdown reports under
 * restart-workspace/artifacts/governed-body-headers; exits non-zero on missing
 * titles, legacy title fields, missing bodies, multiple H1 headers or H1
 * divergence.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..", "..");
const rootDir = process.env.TF_GOVERNED_BODY_HEADERS_ROOT
  ? path.resolve(process.env.TF_GOVERNED_BODY_HEADERS_ROOT)
  : defaultRootDir;

const macroRequirementsRegistryProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_MACRO_REQUIREMENTS_REGISTRY_PATH ??
  "restart-workspace/docs/reference/project-model/registers/macro-requirements.registry.yml";
const decisionsDirProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_DECISIONS_DIR ??
  "restart-workspace/docs/reference/project-model/registers/decisions";
const requirementsDirProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_REQUIREMENTS_DIR ??
  "restart-workspace/docs/reference/project-model/registers/requirements";
const reportDirProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_REPORT_DIR ??
  "restart-workspace/artifacts/governed-body-headers";

const errors = [];
const warnings = [];
const governedRecords = [];

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
 * Converts an absolute path inside the repository to a stable project path.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {string} Repository-relative path with forward slashes.
 */
function toProjectPath(filePath) {
  return normalizeProjectPath(path.relative(rootDir, filePath));
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
 * Escapes a string for use in a regular expression.
 *
 * @param {string} value - Raw string.
 * @returns {string} Escaped string.
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Reads all registry files in a directory matching a governed naming pattern.
 *
 * @param {string} dirProjectPath - Repository-relative registry directory.
 * @param {RegExp} filePattern - Registry file name pattern.
 * @returns {Array<{projectPath: string, registry: Record<string, unknown>}>>} Parsed registries.
 */
function readRegistryDirectory(dirProjectPath, filePattern) {
  const dirPath = resolveProjectPath(dirProjectPath);
  if (!fs.existsSync(dirPath)) {
    errors.push(`Registry directory is missing: ${dirProjectPath}`);
    return [];
  }

  const registries = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile() || !filePattern.test(entry.name)) continue;
    const projectPath = normalizeProjectPath(path.posix.join(dirProjectPath, entry.name));
    registries.push({ projectPath, registry: readYaml(path.join(dirPath, entry.name)) });
  }
  return registries;
}

/**
 * Adds a governed record candidate to the validation set.
 *
 * @param {string} sourceProjectPath - Registry path containing the record.
 * @param {string} recordType - Human-readable record type.
 * @param {Record<string, unknown>} record - Parsed registry record.
 */
function collectRecord(sourceProjectPath, recordType, record) {
  const id = String(record?.id ?? "").trim();
  const title = String(record?.title ?? "").trim();
  const legacyName = String(record?.name ?? "").trim();
  const bodyPath = normalizeProjectPath(record?.body_path);

  if (!id) {
    errors.push(`${sourceProjectPath} contains ${recordType} record without id.`);
    return;
  }

  if (legacyName) {
    errors.push(`${id} uses legacy name field; governed title records must use title.`);
  }

  if (!title) {
    errors.push(`${id} is missing title.`);
  }

  if (!bodyPath) {
    errors.push(`${id} is missing body_path.`);
    return;
  }

  governedRecords.push({ id, title, bodyPath, recordType, sourceProjectPath });
}

/**
 * Loads governed records with body paths from macro, decision and requirement registries.
 */
function collectGovernedRecords() {
  const macroRegistryPath = resolveProjectPath(macroRequirementsRegistryProjectPath);
  if (!fs.existsSync(macroRegistryPath)) {
    errors.push(`Macro-requirements registry is missing: ${macroRequirementsRegistryProjectPath}`);
  } else {
    const registry = readYaml(macroRegistryPath);
    if (!Array.isArray(registry.macro_requirements)) {
      errors.push("Macro-requirements registry must define a macro_requirements array.");
    } else {
      for (const record of registry.macro_requirements) {
        collectRecord(macroRequirementsRegistryProjectPath, "macro-requirement", record);
      }
    }
  }

  for (const { projectPath, registry } of readRegistryDirectory(decisionsDirProjectPath, /^MR-\d{4}\.decisions\.registry\.yml$/u)) {
    if (!Array.isArray(registry.decisions)) {
      errors.push(`${projectPath} must define a decisions array.`);
      continue;
    }
    for (const record of registry.decisions) {
      collectRecord(projectPath, "decision", record);
    }
  }

  for (const { projectPath, registry } of readRegistryDirectory(requirementsDirProjectPath, /^MR-\d{4}\.requirements\.registry\.yml$/u)) {
    if (!Array.isArray(registry.requirements)) {
      errors.push(`${projectPath} must define a requirements array.`);
      continue;
    }
    for (const record of registry.requirements) {
      collectRecord(projectPath, "requirement", record);
    }
  }
}

/**
 * Validates the Markdown H1 for a collected governed record.
 *
 * @param {{id: string, title: string, bodyPath: string, recordType: string, sourceProjectPath: string}} record - Governed record data.
 */
function validateBodyHeader(record) {
  const absoluteBodyPath = resolveProjectPath(record.bodyPath);
  if (!fs.existsSync(absoluteBodyPath)) {
    errors.push(`${record.id} body file is missing: ${record.bodyPath}`);
    return;
  }

  const text = readText(absoluteBodyPath).replace(/\r\n/gu, "\n");
  const h1Lines = [];
  let insideFence = false;
  const lines = text.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    if (/^```/u.test(line.trim())) {
      insideFence = !insideFence;
      continue;
    }
    if (!insideFence && /^#(?!#)\s+/u.test(line)) {
      h1Lines.push({ line, index: index + 1 });
    }
  }

  if (h1Lines.length === 0) {
    errors.push(`${record.bodyPath} has no H1 header for ${record.id}.`);
    return;
  }

  if (h1Lines.length > 1) {
    errors.push(`${record.bodyPath} has multiple H1 headers for ${record.id}.`);
    return;
  }

  const expectedHeader = `# ${record.id} — ${record.title}`;
  const actualHeader = h1Lines[0].line;

  if (actualHeader !== expectedHeader) {
    errors.push(
      `${record.bodyPath}:${h1Lines[0].index} H1 mismatch for ${record.id}. Expected ${JSON.stringify(
        expectedHeader,
      )}, found ${JSON.stringify(actualHeader)}.`,
    );
  }

  if (/^#\s+.+\s-\s.+$/u.test(actualHeader)) {
    errors.push(`${record.bodyPath}:${h1Lines[0].index} uses legacy hyphen separator; use em dash.`);
  }

  const titlePattern = new RegExp(`^#\\s+${escapeRegExp(record.id)}\\s+—\\s+${escapeRegExp(record.title)}$`, "u");
  if (!titlePattern.test(actualHeader)) {
    return;
  }
}

/**
 * Writes machine-readable and Markdown reports for this checker.
 */
function writeReports() {
  const reportDir = resolveProjectPath(reportDirProjectPath);
  fs.mkdirSync(reportDir, { recursive: true });

  const report = {
    implemented_requirement: "MR-0001ADR-0005REQ-0002GOV-0001",
    macro_requirements_registry: macroRequirementsRegistryProjectPath,
    decisions_dir: decisionsDirProjectPath,
    requirements_dir: requirementsDirProjectPath,
    records_checked: governedRecords.length,
    warnings,
    errors,
  };

  fs.writeFileSync(path.join(reportDir, "governed-body-headers.report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const markdown = [
    "# Governed body headers report",
    "",
    `Implemented requirement: ${report.implemented_requirement}`,
    `Records checked: ${report.records_checked}`,
    `Warnings: ${warnings.length}`,
    `Errors: ${errors.length}`,
    "",
    "## Warnings",
    "",
    ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ["None."]),
    "",
    "## Errors",
    "",
    ...(errors.length ? errors.map((error) => `- ${error}`) : ["None."]),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(reportDir, "governed-body-headers.report.md"), markdown, "utf8");
}

collectGovernedRecords();
for (const record of governedRecords) {
  validateBodyHeader(record);
}
writeReports();

if (errors.length > 0) {
  console.error("Governed body header check failed.");
  console.error(`Implemented requirement: MR-0001ADR-0005REQ-0002GOV-0001`);
  console.error(`Records checked: ${governedRecords.length}`);
  console.error(`Warnings: ${warnings.length}`);
  console.error(`Errors: ${errors.length}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Governed body header check passed.");
console.log(`Implemented requirement: MR-0001ADR-0005REQ-0002GOV-0001`);
console.log(`Records checked: ${governedRecords.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);
