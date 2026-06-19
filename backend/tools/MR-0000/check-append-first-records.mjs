#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

/**
 * @file Append-first semantic guard for governed project-model records.
 *
 * @implementsRequirement MR-0000REQ-0016GOV-0001
 * @derivedFromDecision MR-0000/ADR-0005
 * @macroRequirement MR-0000
 *
 * This tool compares protected project-model registry and graph records in the
 * working tree against their `HEAD` version. It performs semantic record
 * comparison after parsing the governed YAML subset instead of relying on line
 * diffs, so whitespace, comments, and line-ending differences do not count as
 * protected record changes. New protected records are allowed by default;
 * modifications and deletions of existing protected records fail closed until a
 * matching, schema-valid confirmation manifest authorizes the exact protected change.
 *
 * Side effects: reads protected registry and graph files from the working tree
 * and from Git `HEAD`; writes diagnostics to stdout/stderr; exits with a
 * non-zero status on protected modifications or deletions. It does not mutate
 * project files, create confirmations, repair records, generate artifacts, or
 * orchestrate the other project-model validators.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const implementedRequirementIds = [
  "MR-0000REQ-0016GOV-0001",
  "MR-0000REQ-0015GOV-0001",
  "MR-0000REQ-0015GOV-0002",
];
const confirmationManifestDirectory = "docs/reference/project-model/change-confirmations";
const confirmationManifestSchemaPath =
  "backend/tools/MR-0000/contracts/append-first-confirmation-manifest.schema.json";

const protectedSourceSpecs = [
  {
    id: "macro-requirements-registry",
    path: "docs/reference/project-model/registers/macro-requirements.registry.yml",
    collections: [{ key: "macro_requirements", idFields: ["id"] }],
  },
  {
    id: "graph-index",
    path: "docs/reference/project-model/registers/graph.index.yml",
    collections: [{ key: "graphs", idFields: ["graph_id"] }],
  },
  {
    id: "adr-governance-registry",
    path: "docs/reference/project-model/registers/decisions/adr-governance.registry.yml",
    collections: [
      { key: "decision_statuses", idFields: ["id"] },
      { key: "decision_types", idFields: ["id"] },
      { key: "adr_registry_fields", idFields: ["id"] },
      { key: "adr_body_sections", idFields: ["id"] },
    ],
  },
  {
    id: "body-formats-registry",
    path: "docs/reference/project-model/registers/body-formats.registry.yml",
    collections: [{ key: "body_format_profiles", idFields: ["id"] }],
  },
  {
    id: "graph-node-types-registry",
    path: "backend/tools/MR-0000/registries/graph-node-types.registry.yml",
    collections: [{ key: "node_type", idFields: ["id"] }],
  },
  {
    id: "spo-predicates-registry",
    path: "backend/tools/MR-0000/registries/spo-predicates.registry.yml",
    collections: [{ key: "spo_predicate", idFields: ["id"] }],
  },
  {
    id: "decision-registry",
    glob: "docs/reference/project-model/registers/decisions/*.decisions.registry.yml",
    collections: [{ key: "decisions", idFields: ["id"] }],
  },
  {
    id: "requirement-registry",
    glob: "docs/reference/project-model/registers/requirements/*.requirements.registry.yml",
    collections: [{ key: "requirements", idFields: ["id"] }],
  },
  {
    id: "project-model-graph",
    glob: "docs/reference/project-model/registers/graph/*.graph.yml",
    collections: [
      { key: "nodes", idFields: ["id"] },
      { key: "spo_relations", idFields: ["subject", "predicate", "object"] },
    ],
  },
];

const errors = [];
const additions = [];
const modifications = [];
const deletions = [];
const consumedConfirmationKeys = new Set();

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
 * Converts an absolute file path to a repository-relative display path.
 *
 * @param {string} filePath - Absolute path to display.
 * @returns {string} Repository-relative path using forward slashes.
 */
function relativeProjectPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
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
 * Returns repository paths tracked in Git HEAD.
 *
 * @returns {Set<string>} Repository-relative paths using forward slashes.
 */
function listHeadPaths() {
  try {
    const output = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return new Set(output.split(/\r?\n/u).filter(Boolean).map(normalizeProjectPath));
  } catch (error) {
    errors.push(`Unable to list Git HEAD paths: ${error.message}`);
    return new Set();
  }
}

/**
 * Reads a repository-relative file from Git HEAD.
 *
 * @param {string} projectPath - Repository-relative path.
 * @returns {string|null} File text from HEAD, or null when unavailable.
 */
function readHeadText(projectPath) {
  try {
    return execFileSync("git", ["show", `HEAD:${normalizeProjectPath(projectPath)}`], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).replace(/^\uFEFF/u, "");
  } catch {
    return null;
  }
}

/**
 * Recursively lists working-tree files below a directory.
 *
 * @param {string} directory - Absolute directory path.
 * @returns {string[]} Repository-relative file paths.
 */
function listWorkingFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...listWorkingFiles(entryPath));
    } else if (entry.isFile()) {
      results.push(relativeProjectPath(entryPath));
    }
  }
  return results;
}

/**
 * Matches a repository-relative path against the supported one-star glob form.
 *
 * @param {string} projectPath - Repository-relative path.
 * @param {string} glob - Supported glob with a single `*` filename segment.
 * @returns {boolean} True when path matches.
 */
function matchesGlob(projectPath, glob) {
  const normalizedPath = normalizeProjectPath(projectPath);
  const normalizedGlob = normalizeProjectPath(glob);
  const starIndex = normalizedGlob.indexOf("*");
  if (starIndex === -1) return normalizedPath === normalizedGlob;
  const prefix = normalizedGlob.slice(0, starIndex);
  const suffix = normalizedGlob.slice(starIndex + 1);
  return normalizedPath.startsWith(prefix) && normalizedPath.endsWith(suffix);
}

/**
 * Expands a protected source specification to concrete current/base paths.
 *
 * @param {object} spec - Protected source specification.
 * @param {Set<string>} headPaths - Git HEAD path set.
 * @returns {string[]} Sorted repository-relative paths.
 */
function expandProtectedPaths(spec, headPaths) {
  if (spec.path) return [normalizeProjectPath(spec.path)];

  const glob = normalizeProjectPath(spec.glob);
  const directory = glob.slice(0, glob.indexOf("*"));
  const workingPaths = listWorkingFiles(resolveProjectPath(directory)).filter((projectPath) =>
    matchesGlob(projectPath, glob),
  );
  const basePaths = [...headPaths].filter((projectPath) => matchesGlob(projectPath, glob));
  return [...new Set([...workingPaths, ...basePaths])].sort((left, right) => left.localeCompare(right));
}

/**
 * Produces a stable record identity for a collection item.
 *
 * @param {Record<string, unknown>} record - Parsed record object.
 * @param {string[]} idFields - Fields that form the logical record identity.
 * @returns {string} Stable logical identity.
 */
function recordIdentity(record, idFields) {
  return idFields.map((field) => String(record?.[field] ?? "")).join("|");
}

/**
 * Sorts object keys recursively for deterministic semantic comparison.
 *
 * @param {unknown} value - Parsed record value.
 * @returns {unknown} Recursively normalized value.
 */
function sortForComparison(value) {
  if (Array.isArray(value)) return value.map(sortForComparison);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, sortForComparison(value[key])]),
    );
  }
  return value;
}

/**
 * Converts a parsed record to a deterministic semantic signature.
 *
 * @param {unknown} record - Parsed record.
 * @returns {string} Stable JSON signature.
 */
function recordSignature(record) {
  return JSON.stringify(sortForComparison(record));
}

/**
 * Lists the top-level fields whose semantic values changed between records.
 *
 * @param {Record<string, unknown>} baseRecord - Record from Git HEAD.
 * @param {Record<string, unknown>} currentRecord - Current working-tree record.
 * @returns {string[]} Sorted changed top-level field names.
 */
function changedTopLevelFields(baseRecord, currentRecord) {
  const fieldNames = new Set([...Object.keys(baseRecord ?? {}), ...Object.keys(currentRecord ?? {})]);
  return [...fieldNames]
    .filter((fieldName) => recordSignature(baseRecord?.[fieldName]) !== recordSignature(currentRecord?.[fieldName]))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Indexes protected records for a source path and collection specification.
 *
 * @param {string} text - YAML text.
 * @param {object} spec - Protected source specification.
 * @param {string} projectPath - Repository-relative path for diagnostics.
 * @returns {Map<string, object>} Record identity to parsed record.
 */
function indexProtectedRecords(text, spec, projectPath) {
  const parsed = parseYaml(text);
  const records = new Map();

  for (const collectionSpec of spec.collections) {
    const collection = parsed?.[collectionSpec.key];
    if (!Array.isArray(collection)) {
      errors.push(
        `Protected collection missing or not a list: ${projectPath}#${collectionSpec.key}`,
      );
      continue;
    }

    for (const record of collection) {
      const identity = recordIdentity(record, collectionSpec.idFields);
      if (!identity || identity.includes("||") || identity.startsWith("|") || identity.endsWith("|")) {
        errors.push(
          `Protected record missing identity fields (${collectionSpec.idFields.join(", ")}): ${projectPath}#${collectionSpec.key}`,
        );
        continue;
      }
      const scopedIdentity = `${collectionSpec.key}:${identity}`;
      if (records.has(scopedIdentity)) {
        errors.push(`Duplicate protected record identity: ${projectPath}#${scopedIdentity}`);
        continue;
      }
      records.set(scopedIdentity, record);
    }
  }

  return records;
}

/**
 * Compares a protected source path between HEAD and working tree.
 *
 * @param {object} spec - Protected source specification.
 * @param {string} projectPath - Repository-relative source path.
 */
function compareProtectedSource(spec, projectPath) {
  const currentPath = resolveProjectPath(projectPath);
  const currentExists = fs.existsSync(currentPath);
  const baseText = readHeadText(projectPath);

  if (baseText !== null && !currentExists) {
    deletions.push({ projectPath, recordId: "<entire protected file>" });
    return;
  }

  if (!currentExists) return;

  const currentText = readText(currentPath);
  const baseRecords = baseText === null ? new Map() : indexProtectedRecords(baseText, spec, projectPath);
  const currentRecords = indexProtectedRecords(currentText, spec, projectPath);

  for (const [recordId, baseRecord] of baseRecords) {
    if (!currentRecords.has(recordId)) {
      deletions.push({ projectPath, recordId });
      continue;
    }

    const currentRecord = currentRecords.get(recordId);
    if (recordSignature(baseRecord) !== recordSignature(currentRecord)) {
      modifications.push({
        projectPath,
        recordId,
        fields: changedTopLevelFields(baseRecord, currentRecord),
      });
    }
  }

  for (const [recordId] of currentRecords) {
    if (!baseRecords.has(recordId)) {
      additions.push({ projectPath, recordId });
    }
  }
}

/**
 * Formats AJV validation errors for diagnostics.
 *
 * @param {Array<object>|null|undefined} validationErrors - AJV error list.
 * @returns {string} Human-readable validation error summary.
 */
function formatAjvErrors(validationErrors) {
  return (validationErrors ?? [])
    .map((validationError) => {
      const instancePath = validationError.instancePath || "/";
      return `${instancePath} ${validationError.message}`;
    })
    .join("; ");
}

/**
 * Loads a JSON schema contract from a repository-relative path.
 *
 * @param {string} projectPath - Repository-relative schema path.
 * @returns {Record<string, unknown>|null} Parsed schema object, or null on error.
 */
function loadJsonSchema(projectPath) {
  try {
    return JSON.parse(readText(resolveProjectPath(projectPath)));
  } catch (error) {
    errors.push(`Unable to load JSON schema ${projectPath}: ${error.message}`);
    return null;
  }
}

/**
 * Lists YAML confirmation manifests from the canonical self-contained storage directory.
 *
 * @returns {string[]} Repository-relative manifest paths.
 */
function listConfirmationManifestPaths() {
  return listWorkingFiles(resolveProjectPath(confirmationManifestDirectory))
    .filter((projectPath) => /\.ya?ml$/u.test(projectPath))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Converts a manifest record_identity object to the append-first guard identity suffix.
 *
 * @param {Record<string, unknown>} recordIdentityValue - Manifest record identity.
 * @returns {string} Logical identity suffix used by the append-first guard.
 */
function manifestRecordIdentity(recordIdentityValue) {
  if (recordIdentityValue?.record_id) return String(recordIdentityValue.record_id);
  return [recordIdentityValue?.subject, recordIdentityValue?.predicate, recordIdentityValue?.object]
    .map((value) => String(value ?? ""))
    .join("|");
}

/**
 * Builds the matching key for a manifest confirmed change.
 *
 * @param {Record<string, unknown>} change - Parsed manifest confirmed change.
 * @returns {string} Stable protected change key.
 */
function manifestChangeKey(change) {
  const sourcePath = normalizeProjectPath(change.source_path);
  const recordIdentityValue = manifestRecordIdentity(change.record_identity ?? {});
  return `${sourcePath}#${change.collection}:${recordIdentityValue}#${change.change_type}`;
}

/**
 * Builds the matching key for an actual protected change.
 *
 * @param {object} change - Actual protected change.
 * @param {"modify"|"delete"} changeType - Protected change type.
 * @returns {string} Stable protected change key.
 */
function actualChangeKey(change, changeType) {
  return `${change.projectPath}#${change.recordId}#${changeType}`;
}

/**
 * Loads and validates self-contained confirmation manifests.
 *
 * @param {Set<string>} headPaths - Git HEAD path set.
 * @returns {{confirmationsByKey: Map<string, object>, activeConfirmationKeys: Set<string>, manifestCount: number}} Loaded confirmation data.
 */
function loadConfirmationManifests(headPaths) {
  const schema = loadJsonSchema(confirmationManifestSchemaPath);
  const confirmationsByKey = new Map();
  const activeConfirmationKeys = new Set();
  const confirmationIds = new Set();
  const manifestPaths = listConfirmationManifestPaths();

  if (!schema) return { confirmationsByKey, activeConfirmationKeys, manifestCount: manifestPaths.length };

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validateManifest = ajv.compile(schema);

  for (const projectPath of manifestPaths) {
    let manifest;
    try {
      manifest = parseYaml(readText(resolveProjectPath(projectPath)));
    } catch (error) {
      errors.push(`Unable to parse confirmation manifest ${projectPath}: ${error.message}`);
      continue;
    }

    if (!validateManifest(manifest)) {
      errors.push(`Invalid confirmation manifest ${projectPath}: ${formatAjvErrors(validateManifest.errors)}`);
      continue;
    }

    if (confirmationIds.has(manifest.confirmation_id)) {
      errors.push(`Duplicate confirmation_id in manifest: ${manifest.confirmation_id}`);
      continue;
    }
    confirmationIds.add(manifest.confirmation_id);

    const currentText = readText(resolveProjectPath(projectPath));
    const headText = headPaths.has(projectPath) ? readHeadText(projectPath) : null;
    const isActiveManifest = headText !== currentText;

    for (const change of manifest.confirmed_changes ?? []) {
      const key = manifestChangeKey(change);
      if (confirmationsByKey.has(key)) {
        errors.push(`Duplicate confirmed protected change in manifests: ${key}`);
        continue;
      }
      confirmationsByKey.set(key, { manifestPath: projectPath, manifest, change });
      if (isActiveManifest) activeConfirmationKeys.add(key);
    }
  }

  return { confirmationsByKey, activeConfirmationKeys, manifestCount: manifestPaths.length };
}

/**
 * Returns true when two string arrays contain the same sorted values.
 *
 * @param {string[]} left - Left values.
 * @param {string[]} right - Right values.
 * @returns {boolean} True when arrays match exactly.
 */
function sameStringSet(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

/**
 * Applies confirmation manifests to a protected modify/delete change.
 *
 * @param {object} change - Actual protected change.
 * @param {"modify"|"delete"} changeType - Protected change type.
 * @param {Map<string, object>} confirmationsByKey - Confirmation entries keyed by actual change.
 * @returns {boolean} True when the change is explicitly confirmed.
 */
function isChangeConfirmed(change, changeType, confirmationsByKey) {
  const key = actualChangeKey(change, changeType);
  const confirmation = confirmationsByKey.get(key);
  if (!confirmation) return false;

  if (changeType === "modify") {
    const confirmedFields = (confirmation.change.fields ?? []).map(String);
    if (!sameStringSet(change.fields ?? [], confirmedFields)) {
      errors.push(
        `Confirmation field mismatch for ${key}: actual fields [${(change.fields ?? []).join(", ")}], manifest fields [${confirmedFields.join(", ")}]`,
      );
      return false;
    }
  }

  consumedConfirmationKeys.add(key);
  return true;
}

const headPaths = listHeadPaths();
const { confirmationsByKey, activeConfirmationKeys, manifestCount } = loadConfirmationManifests(headPaths);
let protectedSourceCount = 0;

for (const spec of protectedSourceSpecs) {
  const paths = expandProtectedPaths(spec, headPaths);
  protectedSourceCount += paths.length;
  for (const projectPath of paths) {
    compareProtectedSource(spec, projectPath);
  }
}

for (const change of modifications) {
  if (!isChangeConfirmed(change, "modify", confirmationsByKey)) {
    errors.push(`Protected record modified without confirmation: ${change.projectPath}#${change.recordId}`);
  }
}

for (const change of deletions) {
  if (!isChangeConfirmed(change, "delete", confirmationsByKey)) {
    errors.push(`Protected record deleted without confirmation: ${change.projectPath}#${change.recordId}`);
  }
}

for (const key of activeConfirmationKeys) {
  if (!consumedConfirmationKeys.has(key)) {
    errors.push(`Active confirmation manifest entry does not match any current protected change: ${key}`);
  }
}

if (errors.length > 0) {
  console.error("Append-first protected record check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  for (const requirementId of implementedRequirementIds) {
    console.error(`Implemented requirement: ${requirementId}`);
  }
  process.exit(1);
}

console.log("Append-first protected record check passed.");
for (const requirementId of implementedRequirementIds) {
  console.log(`Implemented requirement: ${requirementId}`);
}
console.log("Mode: working tree vs HEAD");
console.log(`Protected sources: ${protectedSourceCount}`);
console.log(`Allowed additions detected: ${additions.length}`);
console.log(`Confirmation manifests discovered: ${manifestCount}`);
console.log(`Confirmed protected changes consumed: ${consumedConfirmationKeys.size}`);
