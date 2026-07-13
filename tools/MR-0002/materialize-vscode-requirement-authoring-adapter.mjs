#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * @file VS Code requirement authoring adapter materializer.
 *
 * @implementsRequirement MR-0002ADR-0005REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Materializes and verifies the minimal VS Code workspace adapter required to
 * associate the core-generated Requirement authoring schema with governed
 * authoring request documents. The adapter preserves unrelated workspace
 * settings and extension recommendations and contains no copied canonical
 * Macro-requirement, Decision, Requirement, status or type value.
 *
 * Side effects:
 * - --write creates or updates only .vscode/settings.json and
 *   .vscode/extensions.json after the core schema materialization is current;
 * - --check reads those files and fails when the managed adapter fragment is
 *   absent, malformed, incompatible or stale;
 * - neither mode modifies .vscode/tasks.json, canonical registries or governed
 *   Markdown bodies.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_VSCODE_REQUIREMENT_AUTHORING_ADAPTER_ROOT
  ? path.resolve(process.env.TF_VSCODE_REQUIREMENT_AUTHORING_ADAPTER_ROOT)
  : defaultRootDir;

const schemaMaterializerProjectPath =
  "tools/MR-0002/materialize-requirement-authoring-schema.mjs";
const materializedSchemaProjectPath =
  ".vscode/schemas/requirement-authoring.schema.json";
const settingsProjectPath = ".vscode/settings.json";
const extensionsProjectPath = ".vscode/extensions.json";

const supportedSchemaDialect = "http://json-schema.org/draft-07/schema#";
const schemaAssociationKey =
  "./.vscode/schemas/requirement-authoring.schema.json";
const authoringRequestGlob = "**/*.requirement-authoring.yml";
const yamlExtensionId = "redhat.vscode-yaml";

/**
 * Requires a non-array object.
 *
 * @param {unknown} value - Candidate value.
 * @param {string} label - Diagnostic label.
 * @returns {Record<string, unknown>} Validated object.
 */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

/**
 * Requires an array.
 *
 * @param {unknown} value - Candidate value.
 * @param {string} label - Diagnostic label.
 * @returns {unknown[]} Validated array.
 */
function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

/**
 * Requires a non-empty string.
 *
 * @param {unknown} value - Candidate value.
 * @param {string} label - Diagnostic label.
 * @returns {string} Normalized string.
 */
function requireString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string.`);
  return normalized;
}

/**
 * Resolves a safe repository-relative path.
 *
 * @param {string} projectPath - Forward-slash repository path.
 * @returns {string} Absolute path under rootDir.
 */
function resolveProjectPath(projectPath) {
  const normalized = String(projectPath ?? "").replaceAll("\\", "/").trim();
  if (!normalized) throw new Error("Repository-relative path must not be empty.");
  if (
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Repository path must be relative: ${normalized}`);
  }

  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) => !segment || segment === "." || segment === "..",
    )
  ) {
    throw new Error(`Repository path is unsafe: ${normalized}`);
  }

  const absolutePath = path.resolve(rootDir, ...segments);
  if (
    absolutePath !== rootDir &&
    !absolutePath.startsWith(`${rootDir}${path.sep}`)
  ) {
    throw new Error(`Repository path resolves outside root: ${normalized}`);
  }
  return absolutePath;
}

/**
 * Parses one strict JSON object.
 *
 * @param {string} text - JSON text.
 * @param {string} label - Diagnostic label.
 * @returns {Record<string, unknown>} Parsed object.
 */
function parseJsonObject(text, label) {
  try {
    return requireObject(
      JSON.parse(String(text ?? "").replace(/^\uFEFF/u, "")),
      label,
    );
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

/**
 * Recursively orders object keys while preserving array order.
 *
 * @param {unknown} value - JSON value.
 * @returns {unknown} Stable JSON value.
 */
function orderJsonKeys(value) {
  if (Array.isArray(value)) return value.map(orderJsonKeys);
  if (!value || typeof value !== "object") return value;

  const ordered = {};
  for (const key of Object.keys(value).sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" }),
  )) {
    ordered[key] = orderJsonKeys(value[key]);
  }
  return ordered;
}

/**
 * Formats one deterministic strict JSON document.
 *
 * @param {Record<string, unknown>} value - JSON object.
 * @returns {string} Pretty JSON with one trailing newline.
 */
function formatJson(value) {
  return `${JSON.stringify(orderJsonKeys(value), null, 2)}\n`;
}

/**
 * Compares JSON values semantically.
 *
 * @param {unknown} left - First value.
 * @param {unknown} right - Second value.
 * @returns {boolean} True when stable JSON representations match.
 */
function jsonEqual(left, right) {
  return JSON.stringify(orderJsonKeys(left)) ===
    JSON.stringify(orderJsonKeys(right));
}

/**
 * Reads a required strict JSON object.
 *
 * @param {string} projectPath - Repository-relative path.
 * @param {string} label - Diagnostic label.
 * @returns {Record<string, unknown>} Parsed object.
 */
function readRequiredJson(projectPath, label) {
  const absolutePath = resolveProjectPath(projectPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${label} is missing: ${projectPath}. Run this tool with --write.`);
  }
  try {
    return parseJsonObject(fs.readFileSync(absolutePath, "utf8"), label);
  } catch (error) {
    throw new Error(`${label} cannot be read from ${projectPath}: ${error.message}`);
  }
}

/**
 * Reads an optional strict JSON object.
 *
 * @param {string} projectPath - Repository-relative path.
 * @param {string} label - Diagnostic label.
 * @returns {Record<string, unknown>} Existing object or an empty object.
 */
function readOptionalJson(projectPath, label) {
  const absolutePath = resolveProjectPath(projectPath);
  if (!fs.existsSync(absolutePath)) return {};
  try {
    return parseJsonObject(fs.readFileSync(absolutePath, "utf8"), label);
  } catch (error) {
    throw new Error(`${label} cannot be read from ${projectPath}: ${error.message}`);
  }
}

/**
 * Requires the core-generated schema to be current and compatible with the
 * documented VS Code YAML schema dialect.
 *
 * @returns {void}
 */
function verifyCurrentSchema() {
  const materializerPath = resolveProjectPath(schemaMaterializerProjectPath);
  if (!fs.existsSync(materializerPath)) {
    throw new Error(
      `Requirement authoring schema materializer is missing: ${schemaMaterializerProjectPath}`,
    );
  }

  const result = spawnSync(process.execPath, [materializerPath, "--check"], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TF_REQUIREMENT_AUTHORING_MATERIALIZER_ROOT: rootDir,
      TF_REQUIREMENT_AUTHORING_SCHEMA_ROOT: rootDir,
      TF_REQUIREMENT_AUTHORING_CATALOG_ROOT: rootDir,
    },
  });

  if (result.error) {
    throw new Error(
      `Cannot execute Requirement authoring schema check: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(
      `Requirement authoring schema is not current` +
        (diagnostics ? `: ${diagnostics}` : "."),
    );
  }

  const schema = readRequiredJson(
    materializedSchemaProjectPath,
    "Materialized Requirement authoring schema",
  );
  const dialect = requireString(
    schema.$schema,
    "Materialized Requirement authoring schema $schema",
  );
  if (dialect !== supportedSchemaDialect) {
    throw new Error(
      `Materialized Requirement authoring schema uses unsupported dialect ${dialect}; ` +
        `expected ${supportedSchemaDialect}.`,
    );
  }
}

/**
 * Returns a settings document with the governed schema association merged in.
 *
 * @param {Record<string, unknown>} existing - Existing workspace settings.
 * @returns {Record<string, unknown>} Merged settings.
 */
function mergeSettings(existing) {
  const merged = { ...existing };
  const existingSchemas = merged["yaml.schemas"] === undefined
    ? {}
    : requireObject(merged["yaml.schemas"], "settings.yaml.schemas");

  merged["yaml.schemas"] = {
    ...existingSchemas,
    [schemaAssociationKey]: [authoringRequestGlob],
  };
  return merged;
}

/**
 * Returns an extensions document with the YAML extension recommendation merged
 * in while preserving unrelated recommendations and properties.
 *
 * @param {Record<string, unknown>} existing - Existing extensions document.
 * @returns {Record<string, unknown>} Merged extensions document.
 */
function mergeExtensions(existing) {
  const merged = { ...existing };
  const currentRecommendations = merged.recommendations === undefined
    ? []
    : requireArray(merged.recommendations, "extensions.recommendations")
        .map((value, index) =>
          requireString(value, `extensions.recommendations[${index}]`),
        );

  merged.recommendations = [...new Set([
    ...currentRecommendations,
    yamlExtensionId,
  ])].sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" }),
  );
  return merged;
}

/**
 * Validates the managed workspace settings fragment.
 *
 * @param {Record<string, unknown>} settings - Workspace settings.
 * @returns {void}
 */
function validateSettings(settings) {
  const schemas = requireObject(
    settings["yaml.schemas"],
    "settings.yaml.schemas",
  );
  const association = requireArray(
    schemas[schemaAssociationKey],
    `settings.yaml.schemas[${schemaAssociationKey}]`,
  ).map((value, index) =>
    requireString(
      value,
      `settings.yaml.schemas[${schemaAssociationKey}][${index}]`,
    ),
  );

  if (
    association.length !== 1 ||
    association[0] !== authoringRequestGlob
  ) {
    throw new Error(
      `Requirement authoring schema must be associated only with ${authoringRequestGlob}.`,
    );
  }

  const forbiddenFragments = [
    "docs/reference/project-model/registers/requirements",
    ".requirements.registry.yml",
  ];
  if (
    association.some((glob) =>
      forbiddenFragments.some((fragment) => glob.includes(fragment)),
    )
  ) {
    throw new Error(
      "Requirement authoring schema must not be associated with canonical Requirement registries.",
    );
  }
}

/**
 * Validates the managed extension recommendation fragment.
 *
 * @param {Record<string, unknown>} extensions - Extensions document.
 * @returns {void}
 */
function validateExtensions(extensions) {
  const recommendations = requireArray(
    extensions.recommendations,
    "extensions.recommendations",
  ).map((value, index) =>
    requireString(value, `extensions.recommendations[${index}]`),
  );

  const matches = recommendations.filter((value) => value === yamlExtensionId);
  if (matches.length !== 1) {
    throw new Error(
      `extensions.recommendations must contain ${yamlExtensionId} exactly once.`,
    );
  }
}

/**
 * Writes several JSON files as one rollback-capable transaction.
 *
 * @param {Array<{projectPath: string, text: string}>} changes - Files to replace.
 * @returns {void}
 */
function writeJsonTransaction(changes) {
  if (changes.length === 0) return;

  const prepared = changes.map((change, index) => {
    const targetPath = resolveProjectPath(change.projectPath);
    const directory = path.dirname(targetPath);
    fs.mkdirSync(directory, { recursive: true });
    const suffix = `${process.pid}.${Date.now()}.${index}`;
    const temporaryPath = path.join(
      directory,
      `.${path.basename(targetPath)}.${suffix}.tmp`,
    );
    const backupPath = path.join(
      directory,
      `.${path.basename(targetPath)}.${suffix}.bak`,
    );
    fs.writeFileSync(temporaryPath, change.text, {
      encoding: "utf8",
      flag: "wx",
    });
    return {
      ...change,
      targetPath,
      temporaryPath,
      backupPath,
      hadOriginal: fs.existsSync(targetPath),
      installed: false,
      backedUp: false,
    };
  });

  try {
    for (const entry of prepared) {
      if (!entry.hadOriginal) continue;
      fs.renameSync(entry.targetPath, entry.backupPath);
      entry.backedUp = true;
    }

    for (const entry of prepared) {
      fs.renameSync(entry.temporaryPath, entry.targetPath);
      entry.installed = true;
    }

    for (const entry of prepared) {
      if (entry.backedUp && fs.existsSync(entry.backupPath)) {
        fs.rmSync(entry.backupPath, { force: true });
      }
    }
  } catch (error) {
    for (const entry of [...prepared].reverse()) {
      try {
        if (entry.installed && fs.existsSync(entry.targetPath)) {
          fs.rmSync(entry.targetPath, { force: true });
        }
        if (entry.backedUp && fs.existsSync(entry.backupPath)) {
          fs.renameSync(entry.backupPath, entry.targetPath);
        }
        if (fs.existsSync(entry.temporaryPath)) {
          fs.rmSync(entry.temporaryPath, { force: true });
        }
      } catch {
        // Preserve the original transaction error.
      }
    }
    throw new Error(`Cannot materialize VS Code adapter transaction: ${error.message}`);
  }
}

/**
 * Materializes or verifies the thin VS Code authoring adapter.
 *
 * @param {"write"|"check"} mode - Explicit operation mode.
 * @returns {{mode: string, settingsStatus: string, extensionsStatus: string}}
 * Operation result.
 */
export function materializeVsCodeRequirementAuthoringAdapter(mode) {
  if (mode !== "write" && mode !== "check") {
    throw new Error(`Unsupported materialization mode: ${mode}`);
  }

  verifyCurrentSchema();

  if (mode === "check") {
    const settings = readRequiredJson(
      settingsProjectPath,
      "VS Code workspace settings",
    );
    const extensions = readRequiredJson(
      extensionsProjectPath,
      "VS Code extension recommendations",
    );
    validateSettings(settings);
    validateExtensions(extensions);
    return {
      mode,
      settingsStatus: "current",
      extensionsStatus: "current",
    };
  }

  const currentSettings = readOptionalJson(
    settingsProjectPath,
    "VS Code workspace settings",
  );
  const currentExtensions = readOptionalJson(
    extensionsProjectPath,
    "VS Code extension recommendations",
  );
  const expectedSettings = mergeSettings(currentSettings);
  const expectedExtensions = mergeExtensions(currentExtensions);

  validateSettings(expectedSettings);
  validateExtensions(expectedExtensions);

  const settingsCurrent = jsonEqual(currentSettings, expectedSettings);
  const extensionsCurrent = jsonEqual(currentExtensions, expectedExtensions);
  const changes = [];

  if (!settingsCurrent) {
    changes.push({
      projectPath: settingsProjectPath,
      text: formatJson(expectedSettings),
    });
  }
  if (!extensionsCurrent) {
    changes.push({
      projectPath: extensionsProjectPath,
      text: formatJson(expectedExtensions),
    });
  }

  writeJsonTransaction(changes);

  const writtenSettings = readRequiredJson(
    settingsProjectPath,
    "VS Code workspace settings",
  );
  const writtenExtensions = readRequiredJson(
    extensionsProjectPath,
    "VS Code extension recommendations",
  );
  validateSettings(writtenSettings);
  validateExtensions(writtenExtensions);

  return {
    mode,
    settingsStatus: settingsCurrent
      ? "current"
      : Object.keys(currentSettings).length === 0
        ? "created"
        : "updated",
    extensionsStatus: extensionsCurrent
      ? "current"
      : Object.keys(currentExtensions).length === 0
        ? "created"
        : "updated",
  };
}

/**
 * Parses the explicit CLI mode.
 *
 * @param {string[]} args - Arguments after the script path.
 * @returns {"write"|"check"} Selected mode.
 */
function parseMode(args) {
  if (args.length !== 1) {
    throw new Error(
      "Exactly one explicit mode is required: --write or --check.",
    );
  }
  if (args[0] === "--write") return "write";
  if (args[0] === "--check") return "check";
  throw new Error(`Unsupported argument: ${args[0]}`);
}

/**
 * Executes the CLI.
 *
 * @returns {void}
 */
function main() {
  const mode = parseMode(process.argv.slice(2));
  const result = materializeVsCodeRequirementAuthoringAdapter(mode);

  console.log("VS Code Requirement authoring adapter materialization succeeded.");
  console.log(`Mode: ${result.mode}`);
  console.log(`Settings status: ${result.settingsStatus}`);
  console.log(`Extensions status: ${result.extensionsStatus}`);
  console.log(`Schema: ${schemaAssociationKey}`);
  console.log(`Authoring request glob: ${authoringRequestGlob}`);
  console.log(`Recommended extension: ${yamlExtensionId}`);
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === directExecutionUrl) {
  try {
    main();
  } catch (error) {
    console.error(
      `VS Code Requirement authoring adapter materialization failed: ${error.message}`,
    );
    process.exitCode = 1;
  }
}
