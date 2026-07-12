#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Governed body header consistency checker.
 *
 * @implementsRequirement MR-0001ADR-0005REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0005REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0005
 * @macroRequirement MR-0001
 *
 * This checker validates that governed registry records use `title` as the
 * canonical human-readable title field and that each linked Markdown body
 * repeats that canonical title in exactly one H1 header derived from the
 * registry record id and title. It also runs deterministic negative fixtures so
 * the checker proves it catches invalid authoring states.
 *
 * Side effects: reads ThreatForge Project Model registries, governed
 * Markdown body files and fixture workspaces; writes JSON and Markdown reports
 * under artifacts/governed-body-headers; exits non-zero on
 * missing titles, legacy title fields, missing bodies, multiple H1 headers, H1
 * divergence or fixture coverage failures.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_GOVERNED_BODY_HEADERS_ROOT
  ? path.resolve(process.env.TF_GOVERNED_BODY_HEADERS_ROOT)
  : defaultRootDir;

const macroRequirementsRegistryProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_MACRO_REQUIREMENTS_REGISTRY_PATH ??
  "docs/reference/project-model/registers/macro-requirements.registry.yml";
const decisionsDirProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_DECISIONS_DIR ??
  "docs/reference/project-model/registers/decisions";
const requirementsDirProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_REQUIREMENTS_DIR ??
  "docs/reference/project-model/registers/requirements";
const reportDirProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_REPORT_DIR ??
  "artifacts/governed-body-headers";
const negativeFixturesRegistryProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_NEGATIVE_FIXTURES_REGISTRY_PATH ??
  "tools/MR-0001/fixtures/governed-body-headers/negative-fixtures.registry.yml";
const skipNegativeFixtures = process.env.TF_GOVERNED_BODY_HEADERS_SKIP_FIXTURES === "true";

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
 * Resolves a repository-relative path against a root directory.
 *
 * @param {string} baseRootDir - Absolute root path.
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
 * Escapes a string for use in a regular expression.
 *
 * @param {string} value - Raw string.
 * @returns {string} Escaped string.
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Creates a validation state object.
 *
 * @returns {{errors: string[], warnings: string[], governedRecords: Array<object>}} Empty validation state.
 */
function createState() {
  return { errors: [], warnings: [], governedRecords: [] };
}

/**
 * Reads all registry files in a directory matching a governed naming pattern.
 *
 * @param {string} baseRootDir - Absolute root path.
 * @param {string} dirProjectPath - Repository-relative registry directory.
 * @param {RegExp} filePattern - Registry file name pattern.
 * @param {{errors: string[]}} state - Validation state.
 * @returns {Array<{projectPath: string, registry: Record<string, unknown>}>>} Parsed registries.
 */
function readRegistryDirectory(baseRootDir, dirProjectPath, filePattern, state) {
  const dirPath = resolveProjectPath(baseRootDir, dirProjectPath);
  if (!fs.existsSync(dirPath)) {
    state.errors.push(`Registry directory is missing: ${dirProjectPath}`);
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
 * @param {{errors: string[], governedRecords: Array<object>}} state - Validation state.
 */
function collectRecord(sourceProjectPath, recordType, record, state) {
  const id = String(record?.id ?? "").trim();
  const title = String(record?.title ?? "").trim();
  const legacyName = String(record?.name ?? "").trim();
  const bodyPath = normalizeProjectPath(record?.body_path);

  if (!id) {
    state.errors.push(`${sourceProjectPath} contains ${recordType} record without id.`);
    return;
  }

  if (legacyName) {
    state.errors.push(`${id} uses legacy name field; governed title records must use title.`);
  }

  if (!title) {
    state.errors.push(`${id} is missing title.`);
  }

  if (!bodyPath) {
    state.errors.push(`${id} is missing body_path.`);
    return;
  }

  state.governedRecords.push({ id, title, bodyPath, recordType, sourceProjectPath });
}

/**
 * Loads governed records with body paths from macro, decision and requirement registries.
 *
 * @param {string} baseRootDir - Absolute root path.
 * @param {{errors: string[], governedRecords: Array<object>}} state - Validation state.
 */
function collectGovernedRecords(baseRootDir, state) {
  const macroRegistryPath = resolveProjectPath(baseRootDir, macroRequirementsRegistryProjectPath);
  if (!fs.existsSync(macroRegistryPath)) {
    state.errors.push(`Macro-requirements registry is missing: ${macroRequirementsRegistryProjectPath}`);
  } else {
    const registry = readYaml(macroRegistryPath);
    if (!Array.isArray(registry.macro_requirements)) {
      state.errors.push("Macro-requirements registry must define a macro_requirements array.");
    } else {
      for (const record of registry.macro_requirements) {
        collectRecord(macroRequirementsRegistryProjectPath, "macro-requirement", record, state);
      }
    }
  }

  for (const { projectPath, registry } of readRegistryDirectory(
    baseRootDir,
    decisionsDirProjectPath,
    /^MR-\d{4}\.decisions\.registry\.yml$/u,
    state,
  )) {
    if (!Array.isArray(registry.decisions)) {
      state.errors.push(`${projectPath} must define a decisions array.`);
      continue;
    }
    for (const record of registry.decisions) {
      collectRecord(projectPath, "decision", record, state);
    }
  }

  for (const { projectPath, registry } of readRegistryDirectory(
    baseRootDir,
    requirementsDirProjectPath,
    /^MR-\d{4}\.requirements\.registry\.yml$/u,
    state,
  )) {
    if (!Array.isArray(registry.requirements)) {
      state.errors.push(`${projectPath} must define a requirements array.`);
      continue;
    }
    for (const record of registry.requirements) {
      collectRecord(projectPath, "requirement", record, state);
    }
  }
}

/**
 * Validates the Markdown H1 for a collected governed record.
 *
 * @param {string} baseRootDir - Absolute root path.
 * @param {{id: string, title: string, bodyPath: string, recordType: string, sourceProjectPath: string}} record - Governed record data.
 * @param {{errors: string[]}} state - Validation state.
 */
function validateBodyHeader(baseRootDir, record, state) {
  const absoluteBodyPath = resolveProjectPath(baseRootDir, record.bodyPath);
  if (!fs.existsSync(absoluteBodyPath)) {
    state.errors.push(`${record.id} body file is missing: ${record.bodyPath}`);
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
    state.errors.push(`${record.bodyPath} has no H1 header for ${record.id}.`);
    return;
  }

  if (h1Lines.length > 1) {
    state.errors.push(`${record.bodyPath} has multiple H1 headers for ${record.id}.`);
    return;
  }

  const expectedHeader = `# ${record.id} — ${record.title}`;
  const actualHeader = h1Lines[0].line;

  if (actualHeader !== expectedHeader) {
    state.errors.push(
      `${record.bodyPath}:${h1Lines[0].index} H1 mismatch for ${record.id}. Expected ${JSON.stringify(
        expectedHeader,
      )}, found ${JSON.stringify(actualHeader)}.`,
    );
  }

  if (/^#\s+.+\s-\s.+$/u.test(actualHeader)) {
    state.errors.push(`${record.bodyPath}:${h1Lines[0].index} uses legacy hyphen separator; use em dash.`);
  }

  const titlePattern = new RegExp(`^#\\s+${escapeRegExp(record.id)}\\s+—\\s+${escapeRegExp(record.title)}$`, "u");
  if (!titlePattern.test(actualHeader)) {
    return;
  }
}

/**
 * Runs the governed body header validation against one root directory.
 *
 * @param {string} baseRootDir - Root path to validate.
 * @returns {{errors: string[], warnings: string[], governedRecords: Array<object>}} Validation result.
 */
function runHeaderValidation(baseRootDir) {
  const state = createState();
  collectGovernedRecords(baseRootDir, state);
  for (const record of state.governedRecords) {
    validateBodyHeader(baseRootDir, record, state);
  }
  return state;
}

/**
 * Runs negative fixtures and checks that each one fails with the declared diagnostic.
 *
 * @returns {{checked: number, results: Array<object>, errors: string[]}} Fixture validation result.
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
    const result = runHeaderValidation(fixtureRoot);
    const matched = result.errors.some((error) => error.includes(expectedError));
    const fixtureResult = {
      id,
      root_path: rootPath,
      expected_error_contains: expectedError,
      observed_error_count: result.errors.length,
      matched,
    };
    results.push(fixtureResult);

    if (result.errors.length === 0) {
      fixtureErrors.push(`${id} negative fixture unexpectedly passed.`);
      continue;
    }

    if (!matched) {
      fixtureErrors.push(`${id} negative fixture did not emit expected diagnostic: ${expectedError}`);
    }
  }

  return { checked: results.length, results, errors: fixtureErrors };
}

const validation = runHeaderValidation(rootDir);
const negativeFixtures = runNegativeFixtures();
for (const error of negativeFixtures.errors) validation.errors.push(error);

/**
 * Writes machine-readable and Markdown reports for this checker.
 */
function writeReports() {
  const reportDir = resolveProjectPath(rootDir, reportDirProjectPath);
  fs.mkdirSync(reportDir, { recursive: true });

  const report = {
    implemented_requirements: [
      "MR-0001ADR-0005REQ-0002GOV-0001",
      "MR-0001ADR-0005REQ-0002GOV-0002",
    ],
    macro_requirements_registry: macroRequirementsRegistryProjectPath,
    decisions_dir: decisionsDirProjectPath,
    requirements_dir: requirementsDirProjectPath,
    negative_fixtures_registry: negativeFixturesRegistryProjectPath,
    records_checked: validation.governedRecords.length,
    negative_fixtures_checked: negativeFixtures.checked,
    negative_fixture_results: negativeFixtures.results,
    warnings: validation.warnings,
    errors: validation.errors,
  };

  fs.writeFileSync(path.join(reportDir, "governed-body-headers.report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const markdown = [
    "# Governed body headers report",
    "",
    `Implemented requirements: ${report.implemented_requirements.join(", ")}`,
    `Records checked: ${report.records_checked}`,
    `Negative fixtures checked: ${report.negative_fixtures_checked}`,
    `Warnings: ${validation.warnings.length}`,
    `Errors: ${validation.errors.length}`,
    "",
    "## Negative fixtures",
    "",
    ...(negativeFixtures.results.length
      ? negativeFixtures.results.map(
          (fixture) => `- ${fixture.id}: expected ${JSON.stringify(fixture.expected_error_contains)}; matched: ${fixture.matched}`,
        )
      : ["None."]),
    "",
    "## Warnings",
    "",
    ...(validation.warnings.length ? validation.warnings.map((warning) => `- ${warning}`) : ["None."]),
    "",
    "## Errors",
    "",
    ...(validation.errors.length ? validation.errors.map((error) => `- ${error}`) : ["None."]),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(reportDir, "governed-body-headers.report.md"), markdown, "utf8");
}

writeReports();

if (validation.errors.length > 0) {
  console.error("Governed body header check failed.");
  console.error("Implemented requirement: MR-0001ADR-0005REQ-0002GOV-0001");
  console.error("Implemented requirement: MR-0001ADR-0005REQ-0002GOV-0002");
  console.error(`Records checked: ${validation.governedRecords.length}`);
  console.error(`Negative fixtures checked: ${negativeFixtures.checked}`);
  console.error(`Warnings: ${validation.warnings.length}`);
  console.error(`Errors: ${validation.errors.length}`);
  for (const error of validation.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Governed body header check passed.");
console.log("Implemented requirement: MR-0001ADR-0005REQ-0002GOV-0001");
console.log("Implemented requirement: MR-0001ADR-0005REQ-0002GOV-0002");
console.log(`Records checked: ${validation.governedRecords.length}`);
console.log(`Negative fixtures checked: ${negativeFixtures.checked}`);
console.log(`Warnings: ${validation.warnings.length}`);
console.log(`Errors: ${validation.errors.length}`);
