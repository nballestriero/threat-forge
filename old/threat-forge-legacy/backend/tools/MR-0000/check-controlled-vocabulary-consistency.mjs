#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Controlled vocabulary consistency checker for governed registries and contracts.
 *
 * @implementsRequirement MR-0000REQ-0025
 * @derivedFromDecision MR-0000/ADR-0009
 * @macroRequirement MR-0000
 *
 * This checker validates the first governed controlled-vocabulary consistency
 * boundary before child-project gate execution and Knowledge Graph ingestion are
 * trusted. It uses the child-project governance status model as the owner for
 * check-run and gate-result status values, then compares that vocabulary with
 * the runtime Zod contract and the public OpenAPI schemas that expose the same
 * governed fields.
 *
 * Side effects: reads governed registry, runtime contract and OpenAPI files,
 * runs isolated negative fixtures, writes diagnostics to stdout/stderr, and
 * exits non-zero when governed values diverge. It does not execute child-project
 * gates, mutate child repositories, generate migrations, rewrite contracts,
 * inspect live storage rows, ingest a Knowledge Graph, or replace future broader
 * vocabulary ownership and terminology gates.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_CONTROLLED_VOCABULARY_ROOT
  ? path.resolve(process.env.TF_CONTROLLED_VOCABULARY_ROOT)
  : path.resolve(scriptDir, "..", "..", "..");
const negativeFixturesDir = process.env.TF_CONTROLLED_VOCABULARY_NEGATIVE_FIXTURES_DIR
  ? path.resolve(process.env.TF_CONTROLLED_VOCABULARY_NEGATIVE_FIXTURES_DIR)
  : path.join(scriptDir, "fixtures", "controlled-vocabulary-consistency", "negative");
const skipNegativeFixtures = process.env.TF_CONTROLLED_VOCABULARY_SKIP_NEGATIVE_FIXTURES === "1";
const errors = [];

const controlledFiles = {
  statusModel: "docs/reference/project-model/registers/child-project-governance/status-model.registry.yml",
  runtimeContract: "backend/src/MR-0003/child-project-management/child-project-management.contract.mjs",
  openApiContract: "docs/reference/api/openapi/threat-forge.openapi.yml",
};

const checkedMappings = [
  {
    ownerFamilyId: "gate_execution_result_status",
    governedField: "gate_result.status",
    runtimeLabel: "runtime contract field childProjectGateStatusSchema",
    openApiLabel: "OpenAPI schema ChildProjectGateResult.status",
    openApiSchemaPath: ["components", "schemas", "ChildProjectGateResult", "properties", "status", "enum"],
  },
  {
    ownerFamilyId: "gate_execution_result_status",
    governedField: "check_run.overall_status",
    runtimeLabel: "runtime contract field childProjectGateStatusSchema",
    openApiLabel: "OpenAPI schema ChildProjectCheckRun.overall_status",
    openApiSchemaPath: ["components", "schemas", "ChildProjectCheckRun", "properties", "overall_status", "enum"],
  },
];

/**
 * Reads UTF-8 text while stripping a possible byte-order mark.
 *
 * @param {string} filePath - Absolute path of the file to read.
 * @returns {string} File text with normalized line endings.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n");
}

/**
 * Normalizes a path-like value to repository display form.
 *
 * @param {string|null|undefined} value - Path-like value.
 * @returns {string} Normalized path text.
 */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Resolves a repository-relative path against the active root.
 *
 * @param {string} projectPath - Repository-relative path.
 * @returns {string} Absolute path.
 */
function resolveProjectPath(projectPath) {
  return path.join(rootDir, normalizeProjectPath(projectPath));
}

/**
 * Records a deterministic validation diagnostic.
 *
 * @param {string} message - Human-readable diagnostic.
 * @returns {void}
 */
function addError(message) {
  errors.push(message);
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
 * Parses a simple scalar value from the governed YAML subset.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string|number|boolean|null|unknown[]|Record<string, unknown>} Parsed scalar.
 */
function parseScalar(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? inner.split(",").map((entry) => stripQuotes(entry.trim())) : [];
  }
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
 * Returns an array value or an empty array for invalid input.
 *
 * @param {unknown} value - Candidate array.
 * @returns {unknown[]} Array value or empty array.
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Converts an array of values to a stable set of non-empty strings.
 *
 * @param {unknown[]} values - Values to normalize.
 * @returns {Set<string>} Normalized string set.
 */
function toValueSet(values) {
  return new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean));
}

/**
 * Finds a status family by id inside the governed status-model registry.
 *
 * @param {Record<string, unknown>} statusModel - Parsed status-model registry.
 * @param {string} familyId - Status family id.
 * @returns {Record<string, unknown>|null} Status family record, or null.
 */
function findStatusFamily(statusModel, familyId) {
  return asArray(statusModel.status_families).find((family) => String(family?.id ?? "") === familyId) ?? null;
}

/**
 * Extracts expected runtime values from a status family.
 *
 * @param {Record<string, unknown>} family - Status family record.
 * @returns {Set<string>} Canonical plus declared transitional runtime values.
 */
function expectedRuntimeValues(family) {
  return toValueSet([
    ...asArray(family.values).map((value) => value?.id),
    ...asArray(family.transitional_runtime_values),
  ]);
}

/**
 * Extracts a z.enum([...]) value list from the child project runtime contract.
 *
 * @param {string} contractText - Runtime contract source text.
 * @param {string} exportName - Exported schema constant name.
 * @returns {Set<string>} Extracted enum values.
 */
function extractZodEnumValues(contractText, exportName) {
  const pattern = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*z\\.enum\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`, "u");
  const match = contractText.match(pattern);
  if (!match) {
    addError(`Runtime contract does not expose z.enum for ${exportName}: ${controlledFiles.runtimeContract}`);
    return new Set();
  }
  const values = [];
  const stringPattern = /["']([^"']+)["']/gu;
  for (const valueMatch of match[1].matchAll(stringPattern)) values.push(valueMatch[1]);
  return toValueSet(values);
}

/**
 * Reads a nested value from a parsed object by path segments.
 *
 * @param {unknown} value - Root value.
 * @param {string[]} segments - Path segments.
 * @returns {unknown} Nested value, or undefined.
 */
function getPath(value, segments) {
  let cursor = value;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

/**
 * Compares expected and actual controlled-value sets.
 *
 * @param {Set<string>} expected - Expected governed values.
 * @param {Set<string>} actual - Actual contract values.
 * @param {string} label - Source label for diagnostics.
 * @param {string} ownerFamilyId - Owning status family id.
 * @param {string} governedField - Governed field name.
 * @returns {void}
 */
function compareValueSets(expected, actual, label, ownerFamilyId, governedField) {
  for (const value of [...expected].sort()) {
    if (!actual.has(value)) {
      addError(`${label} is missing governed value: ${value} (owner ${ownerFamilyId}, field ${governedField})`);
    }
  }
  for (const value of [...actual].sort()) {
    if (!expected.has(value)) {
      addError(`${label} exposes unowned value: ${value} (owner ${ownerFamilyId}, field ${governedField})`);
    }
  }
}

/**
 * Requires all configured source files to exist.
 *
 * @returns {boolean} True when all configured files exist.
 */
function requireControlledFiles() {
  let allPresent = true;
  for (const projectPath of Object.values(controlledFiles)) {
    const filePath = resolveProjectPath(projectPath);
    if (!fs.existsSync(filePath)) {
      addError(`Controlled vocabulary source is missing: ${projectPath}`);
      allPresent = false;
    }
  }
  return allPresent;
}

/**
 * Validates controlled vocabulary consistency for current governed mappings.
 *
 * @returns {{ mappings: number, ownerValues: number }} Validation summary.
 */
function validateControlledVocabularies() {
  if (!requireControlledFiles()) return { mappings: 0, ownerValues: 0 };

  const statusModel = readYaml(resolveProjectPath(controlledFiles.statusModel));
  const runtimeContractText = readText(resolveProjectPath(controlledFiles.runtimeContract));
  const openApi = readYaml(resolveProjectPath(controlledFiles.openApiContract));
  const runtimeGateStatusValues = extractZodEnumValues(runtimeContractText, "childProjectGateStatusSchema");
  let ownerValues = 0;

  for (const mapping of checkedMappings) {
    const family = findStatusFamily(statusModel, mapping.ownerFamilyId);
    if (!family) {
      addError(`Status model is missing owner family: ${mapping.ownerFamilyId} (${controlledFiles.statusModel})`);
      continue;
    }

    const governedFieldNames = toValueSet(asArray(family.governed_field_names));
    if (!governedFieldNames.has(mapping.governedField)) {
      addError(`Status family ${mapping.ownerFamilyId} does not declare governed field: ${mapping.governedField}`);
    }

    const expectedValues = expectedRuntimeValues(family);
    ownerValues = Math.max(ownerValues, expectedValues.size);
    compareValueSets(expectedValues, runtimeGateStatusValues, mapping.runtimeLabel, mapping.ownerFamilyId, mapping.governedField);

    const openApiValues = toValueSet(asArray(getPath(openApi, mapping.openApiSchemaPath)));
    if (openApiValues.size === 0) {
      addError(`${mapping.openApiLabel} does not expose an enum at ${mapping.openApiSchemaPath.join(".")}: ${controlledFiles.openApiContract}`);
      continue;
    }
    compareValueSets(expectedValues, openApiValues, mapping.openApiLabel, mapping.ownerFamilyId, mapping.governedField);
  }

  return { mappings: checkedMappings.length, ownerValues };
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
 * Runs a single negative fixture through this checker in an isolated tree.
 *
 * @param {string} fixturePath - Fixture JSON path.
 * @returns {{ passed: boolean, id: string, diagnostic?: string }} Fixture result.
 */
function runNegativeFixture(fixturePath) {
  const fixture = JSON.parse(readText(fixturePath));
  const fixtureId = String(fixture.id ?? path.basename(fixturePath, ".json"));
  const expectedDiagnostic = String(fixture.expectedDiagnostic ?? "").trim();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `tf-controlled-vocabulary-${fixtureId}-`));

  try {
    writeFixtureFiles(tempRoot, fixture.files ?? {});
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: tempRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        TF_CONTROLLED_VOCABULARY_ROOT: tempRoot,
        TF_CONTROLLED_VOCABULARY_SKIP_NEGATIVE_FIXTURES: "1",
      },
    });

    const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (result.status === 0) return { passed: false, id: fixtureId, diagnostic: "fixture unexpectedly passed" };
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
 * Proves representative invalid vocabulary states fail closed.
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
    if (!result.passed) errors.push(`Negative fixture ${result.id} failed: ${result.diagnostic}`);
  }

  return fixturePaths.length;
}

const counts = validateControlledVocabularies();
const negativeFixtureCount = validateNegativeFixtures();

if (errors.length > 0) {
  console.error("Controlled vocabulary consistency check failed.");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Controlled vocabulary consistency check passed.");
console.log("Implemented requirement: MR-0000REQ-0025");
console.log(`Owner registry: ${controlledFiles.statusModel}`);
console.log(`Runtime contract: ${controlledFiles.runtimeContract}`);
console.log(`OpenAPI contract: ${controlledFiles.openApiContract}`);
console.log(`Mappings checked: ${counts.mappings}`);
console.log(`Owner runtime values: ${counts.ownerValues}`);
console.log(`Negative fixtures: ${negativeFixtureCount}`);
