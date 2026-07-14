#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * @file VS Code requirement authoring adapter materializer.
 *
 * @implementsRequirement MR-0002ADR-0005REQ-0002
 * @implementsRequirement MR-0002ADR-0005REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Materializes and verifies the thin VS Code adapter for governed Requirement
 * authoring. The adapter associates the core-generated request schema, keeps the
 * YAML extension recommendation current, and exposes separate preview and
 * confirmed-create tasks that delegate all dynamic selection, validation,
 * preview, confirmation, atomic writing and post-write checks to the core CLI.
 *
 * Side effects:
 * - --write atomically creates or updates only .vscode/settings.json,
 *   .vscode/extensions.json and the managed Requirement authoring fragment in
 *   .vscode/tasks.json;
 * - --check reads those files and fails when the managed adapter fragment is
 *   absent, malformed, unsafe or stale;
 * - neither mode modifies canonical registries or governed Markdown bodies.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_VSCODE_REQUIREMENT_AUTHORING_ADAPTER_ROOT
  ? path.resolve(process.env.TF_VSCODE_REQUIREMENT_AUTHORING_ADAPTER_ROOT)
  : defaultRootDir;

const schemaMaterializerProjectPath =
  "tools/MR-0002/materialize-requirement-authoring-schema.mjs";
const requirementAuthoringRunnerProjectPath =
  "tools/MR-0002/run-requirement-authoring.mjs";
const materializedSchemaProjectPath =
  ".vscode/schemas/requirement-authoring.schema.json";
const settingsProjectPath = ".vscode/settings.json";
const extensionsProjectPath = ".vscode/extensions.json";
const tasksProjectPath = ".vscode/tasks.json";

const supportedSchemaDialect = "http://json-schema.org/draft-07/schema#";
const schemaAssociationKey =
  "./.vscode/schemas/requirement-authoring.schema.json";
const authoringRequestGlob = "**/*.requirement-authoring.yml";
const yamlExtensionId = "redhat.vscode-yaml";
const previewTaskLabel = "ThreatForge: preview requirement authoring";
const createTaskLabel = "ThreatForge: create requirement authoring";
const legacyTaskLabels = new Set([
  "ThreatForge: create functional requirement dry-run",
  "ThreatForge: create governance requirement dry-run",
]);
const managedTaskLabels = new Set([
  previewTaskLabel,
  createTaskLabel,
]);
const legacyInputIds = new Set([
  "threatForgeMrId",
  "threatForgeAdrId",
  "threatForgeFunctionalRequirementTitle",
  "threatForgeParentRequirementId",
  "threatForgeGovernanceRequirementTitle",
]);
const implementationTraceTag = ["@implements", "Requirement"].join("");
const tasksHeader = `/**
 * @file ThreatForge local VS Code task catalog.
 *
 * ${implementationTraceTag} MR-0002ADR-0005REQ-0001
 * ${implementationTraceTag} MR-0002ADR-0005REQ-0001GOV-0001
 * ${implementationTraceTag} MR-0002ADR-0005REQ-0002
 * ${implementationTraceTag} MR-0002ADR-0005REQ-0002GOV-0001
 * ${implementationTraceTag} MR-0002ADR-0001REQ-0001
 * ${implementationTraceTag} MR-0002ADR-0001REQ-0001GOV-0001
 * ${implementationTraceTag} MR-0002ADR-0003REQ-0001
 * ${implementationTraceTag} MR-0002ADR-0003REQ-0001GOV-0001
 * ${implementationTraceTag} MR-0002ADR-0003REQ-0002
 * ${implementationTraceTag} MR-0002ADR-0003REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0002/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0003
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 */`;

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
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
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
  if (!normalized) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}

/**
 * Resolves a safe repository-relative path.
 *
 * @param {string} projectPath - Forward-slash repository path.
 * @returns {string} Absolute path under rootDir.
 */
function resolveProjectPath(projectPath) {
  const normalized = String(projectPath ?? "")
    .replaceAll("\\", "/")
    .trim();
  if (!normalized) {
    throw new Error("Repository-relative path must not be empty.");
  }
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
  const relativePath = path.relative(rootDir, absolutePath);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Repository path resolves outside root: ${normalized}`);
  }
  return absolutePath;
}

/**
 * Removes JavaScript-style comments without changing string content.
 *
 * @param {string} text - JSONC source.
 * @returns {string} Comment-free JSON-like text.
 */
function stripJsonComments(text) {
  const source = String(text ?? "").replace(/^\uFEFF/u, "");
  let result = "";
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      if (character === "\n") {
        inLineComment = false;
        result += "\n";
      } else {
        result += " ";
      }
      continue;
    }

    if (inBlockComment) {
      if (character === "*" && next === "/") {
        inBlockComment = false;
        result += "  ";
        index += 1;
      } else {
        result += character === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (inString) {
      result += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }
    if (character === "/" && next === "/") {
      inLineComment = true;
      result += "  ";
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      inBlockComment = true;
      result += "  ";
      index += 1;
      continue;
    }

    result += character;
  }

  if (inBlockComment) {
    throw new Error("JSONC contains an unterminated block comment.");
  }
  return result;
}

/**
 * Removes trailing commas outside JSON strings.
 *
 * @param {string} text - Comment-free JSON-like text.
 * @returns {string} Strict JSON text.
 */
function removeTrailingCommas(text) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      result += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }

    if (character === ",") {
      let lookahead = index + 1;
      while (/\s/u.test(text[lookahead] ?? "")) {
        lookahead += 1;
      }
      if (text[lookahead] === "}" || text[lookahead] === "]") {
        continue;
      }
    }

    result += character;
  }

  return result;
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
 * Parses one JSONC object.
 *
 * @param {string} text - JSONC text.
 * @param {string} label - Diagnostic label.
 * @returns {Record<string, unknown>} Parsed object.
 */
function parseJsoncObject(text, label) {
  try {
    return requireObject(
      JSON.parse(removeTrailingCommas(stripJsonComments(text))),
      label,
    );
  } catch (error) {
    throw new Error(`${label} is not valid JSONC: ${error.message}`);
  }
}

/**
 * Recursively orders object keys while preserving array order.
 *
 * @param {unknown} value - JSON value.
 * @returns {unknown} Stable JSON value.
 */
function orderJsonKeys(value) {
  if (Array.isArray(value)) {
    return value.map(orderJsonKeys);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

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
 * Formats the managed VS Code tasks JSONC document.
 *
 * @param {Record<string, unknown>} value - Tasks object.
 * @returns {string} Canonical JSONC text.
 */
function formatTasksJson(value) {
  return `${tasksHeader}\n${JSON.stringify(value, null, 2)}\n`;
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
 * Reads a required JSON or JSONC object.
 *
 * @param {string} projectPath - Repository-relative path.
 * @param {string} label - Diagnostic label.
 * @param {boolean} [jsonc] - Whether comments and trailing commas are accepted.
 * @returns {Record<string, unknown>} Parsed object.
 */
function readRequiredObject(projectPath, label, jsonc = false) {
  const absolutePath = resolveProjectPath(projectPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `${label} is missing: ${projectPath}. Run this tool with --write.`,
    );
  }
  try {
    const text = fs.readFileSync(absolutePath, "utf8");
    return jsonc
      ? parseJsoncObject(text, label)
      : parseJsonObject(text, label);
  } catch (error) {
    throw new Error(
      `${label} cannot be read from ${projectPath}: ${error.message}`,
    );
  }
}

/**
 * Reads an optional JSON or JSONC object.
 *
 * @param {string} projectPath - Repository-relative path.
 * @param {string} label - Diagnostic label.
 * @param {boolean} [jsonc] - Whether comments and trailing commas are accepted.
 * @returns {Record<string, unknown>} Existing object or an empty object.
 */
function readOptionalObject(projectPath, label, jsonc = false) {
  const absolutePath = resolveProjectPath(projectPath);
  if (!fs.existsSync(absolutePath)) {
    return {};
  }
  try {
    const text = fs.readFileSync(absolutePath, "utf8");
    return jsonc
      ? parseJsoncObject(text, label)
      : parseJsonObject(text, label);
  } catch (error) {
    throw new Error(
      `${label} cannot be read from ${projectPath}: ${error.message}`,
    );
  }
}

/**
 * Requires the core-generated schema and authoring runner to be current.
 *
 * @returns {void}
 */
function verifyCoreEntrypoints() {
  const materializerPath = resolveProjectPath(schemaMaterializerProjectPath);
  if (!fs.existsSync(materializerPath)) {
    throw new Error(
      `Requirement authoring schema materializer is missing: ${schemaMaterializerProjectPath}`,
    );
  }

  const runnerPath = resolveProjectPath(requirementAuthoringRunnerProjectPath);
  if (!fs.existsSync(runnerPath) || !fs.statSync(runnerPath).isFile()) {
    throw new Error(
      `Governed Requirement authoring runner is missing: ${requirementAuthoringRunnerProjectPath}`,
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
      "Requirement authoring schema is not current" +
        (diagnostics ? `: ${diagnostics}` : "."),
    );
  }

  const schema = readRequiredObject(
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
 * Returns an extensions document with the YAML recommendation merged in.
 *
 * @param {Record<string, unknown>} existing - Existing extensions document.
 * @returns {Record<string, unknown>} Merged extensions document.
 */
function mergeExtensions(existing) {
  const merged = { ...existing };
  const currentRecommendations = merged.recommendations === undefined
    ? []
    : requireArray(
        merged.recommendations,
        "extensions.recommendations",
      ).map((value, index) =>
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
 * Builds one managed authoring task.
 *
 * @param {"preview"|"create"} mode - Core runner mode.
 * @returns {Record<string, unknown>} VS Code task object.
 */
function buildManagedTask(mode) {
  const isPreview = mode === "preview";
  return {
    label: isPreview ? previewTaskLabel : createTaskLabel,
    type: "process",
    command: "node",
    args: [
      requirementAuthoringRunnerProjectPath,
      isPreview ? "--preview" : "--create",
    ],
    options: {
      cwd: "${workspaceFolder}",
    },
    problemMatcher: [],
    presentation: {
      reveal: "always",
      panel: "shared",
      clear: true,
      focus: true,
    },
  };
}

/**
 * Merges only the managed Requirement authoring task fragment.
 *
 * @param {Record<string, unknown>} existing - Existing tasks document.
 * @returns {Record<string, unknown>} Merged tasks document.
 */
export function mergeRequirementAuthoringTasks(existing) {
  const currentTasks = existing.tasks === undefined
    ? []
    : requireArray(existing.tasks, "tasks.tasks");
  const currentInputs = existing.inputs === undefined
    ? []
    : requireArray(existing.inputs, "tasks.inputs");
  const replaceableLabels = new Set([
    ...legacyTaskLabels,
    ...managedTaskLabels,
  ]);
  let insertionIndex = currentTasks.length;
  const preservedTasks = [];

  for (let index = 0; index < currentTasks.length; index += 1) {
    const task = requireObject(currentTasks[index], `tasks.tasks[${index}]`);
    const label = requireString(task.label, `tasks.tasks[${index}].label`);
    if (replaceableLabels.has(label)) {
      insertionIndex = Math.min(insertionIndex, preservedTasks.length);
      continue;
    }
    preservedTasks.push(task);
  }

  preservedTasks.splice(
    insertionIndex,
    0,
    buildManagedTask("preview"),
    buildManagedTask("create"),
  );

  const preservedInputs = currentInputs.filter((inputValue, index) => {
    const input = requireObject(inputValue, `tasks.inputs[${index}]`);
    const id = requireString(input.id, `tasks.inputs[${index}].id`);
    return !legacyInputIds.has(id);
  });

  const merged = {
    ...existing,
    version: existing.version ?? "2.0.0",
    tasks: preservedTasks,
  };
  if (existing.inputs !== undefined || preservedInputs.length > 0) {
    merged.inputs = preservedInputs;
  }
  return merged;
}

/**
 * Validates one exact managed task.
 *
 * @param {Record<string, unknown>} task - Task object.
 * @param {"preview"|"create"} mode - Expected runner mode.
 * @returns {void}
 */
function validateManagedTask(task, mode) {
  const expected = buildManagedTask(mode);
  const expectedLabel = requireString(expected.label, "expected task label");
  const label = requireString(task.label, `${expectedLabel}.label`);
  if (label !== expectedLabel) {
    throw new Error(`Unexpected managed task label: ${label}`);
  }
  if (requireString(task.type, `${label}.type`) !== "process") {
    throw new Error(`${label} must use process task type.`);
  }
  if (requireString(task.command, `${label}.command`) !== "node") {
    throw new Error(`${label} must invoke node.`);
  }

  const args = requireArray(task.args, `${label}.args`).map((value, index) =>
    requireString(value, `${label}.args[${index}]`),
  );
  const expectedArgs = expected.args;
  if (
    args.length !== expectedArgs.length ||
    args.some((value, index) => value !== expectedArgs[index])
  ) {
    throw new Error(
      `${label} must invoke only ${requirementAuthoringRunnerProjectPath} --${mode}.`,
    );
  }

  const options = requireObject(task.options, `${label}.options`);
  if (requireString(options.cwd, `${label}.options.cwd`) !== "${workspaceFolder}") {
    throw new Error(`${label} cwd must be \${workspaceFolder}.`);
  }

  requireArray(task.problemMatcher, `${label}.problemMatcher`);
  const presentation = requireObject(
    task.presentation,
    `${label}.presentation`,
  );
  if (presentation.focus !== true) {
    throw new Error(`${label} must focus its interactive terminal.`);
  }
}

/**
 * Validates the managed Requirement authoring task fragment.
 *
 * @param {Record<string, unknown>} tasksDocument - VS Code tasks document.
 * @returns {void}
 */
export function validateRequirementAuthoringTasks(tasksDocument) {
  if (requireString(tasksDocument.version, "tasks.version") !== "2.0.0") {
    throw new Error("VS Code tasks.version must be 2.0.0.");
  }

  const tasks = requireArray(tasksDocument.tasks, "tasks.tasks").map(
    (value, index) => requireObject(value, `tasks.tasks[${index}]`),
  );
  const byLabel = new Map();

  for (const task of tasks) {
    const label = requireString(task.label, "VS Code task label");
    if (byLabel.has(label)) {
      throw new Error(`Duplicate VS Code task label: ${label}`);
    }
    byLabel.set(label, task);

    if (legacyTaskLabels.has(label)) {
      throw new Error(`Legacy Requirement authoring task remains configured: ${label}`);
    }

    const args = Array.isArray(task.args)
      ? task.args.map((value) => String(value))
      : [];
    if (
      args.includes("tools/MR-0002/create-governed-document.mjs")
    ) {
      throw new Error(
        `${label} bypasses the governed Requirement authoring runner.`,
      );
    }
    if (
      args.includes(requirementAuthoringRunnerProjectPath) &&
      !managedTaskLabels.has(label)
    ) {
      throw new Error(
        `${label} invokes the Requirement authoring runner outside the managed preview/create tasks.`,
      );
    }
  }

  const previewTask = byLabel.get(previewTaskLabel);
  const createTask = byLabel.get(createTaskLabel);
  if (!previewTask) {
    throw new Error(`Missing managed VS Code task: ${previewTaskLabel}`);
  }
  if (!createTask) {
    throw new Error(`Missing managed VS Code task: ${createTaskLabel}`);
  }
  validateManagedTask(previewTask, "preview");
  validateManagedTask(createTask, "create");

  const inputs = tasksDocument.inputs === undefined
    ? []
    : requireArray(tasksDocument.inputs, "tasks.inputs");
  for (let index = 0; index < inputs.length; index += 1) {
    const input = requireObject(inputs[index], `tasks.inputs[${index}]`);
    const id = requireString(input.id, `tasks.inputs[${index}].id`);
    if (legacyInputIds.has(id)) {
      throw new Error(
        `Legacy static Requirement authoring input remains configured: ${id}`,
      );
    }
  }
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
 * Writes several workspace files as one rollback-capable transaction.
 *
 * @param {Array<{projectPath: string, text: string}>} changes - Files to replace.
 * @returns {void}
 */
function writeWorkspaceTransaction(changes) {
  if (changes.length === 0) {
    return;
  }

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
      if (!entry.hadOriginal) {
        continue;
      }
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
    throw new Error(
      `Cannot materialize VS Code adapter transaction: ${error.message}`,
    );
  }
}

/**
 * Materializes or verifies the thin VS Code authoring adapter.
 *
 * @param {"write"|"check"} mode - Explicit operation mode.
 * @returns {{mode: string, settingsStatus: string, extensionsStatus: string, tasksStatus: string}}
 * Operation result.
 */
export function materializeVsCodeRequirementAuthoringAdapter(mode) {
  if (mode !== "write" && mode !== "check") {
    throw new Error(`Unsupported materialization mode: ${mode}`);
  }

  verifyCoreEntrypoints();

  if (mode === "check") {
    const settings = readRequiredObject(
      settingsProjectPath,
      "VS Code workspace settings",
    );
    const extensions = readRequiredObject(
      extensionsProjectPath,
      "VS Code extension recommendations",
    );
    const tasks = readRequiredObject(
      tasksProjectPath,
      "VS Code task catalog",
      true,
    );
    validateSettings(settings);
    validateExtensions(extensions);
    validateRequirementAuthoringTasks(tasks);
    return {
      mode,
      settingsStatus: "current",
      extensionsStatus: "current",
      tasksStatus: "current",
    };
  }

  const currentSettings = readOptionalObject(
    settingsProjectPath,
    "VS Code workspace settings",
  );
  const currentExtensions = readOptionalObject(
    extensionsProjectPath,
    "VS Code extension recommendations",
  );
  const currentTasks = readOptionalObject(
    tasksProjectPath,
    "VS Code task catalog",
    true,
  );
  const expectedSettings = mergeSettings(currentSettings);
  const expectedExtensions = mergeExtensions(currentExtensions);
  const expectedTasks = mergeRequirementAuthoringTasks(currentTasks);

  validateSettings(expectedSettings);
  validateExtensions(expectedExtensions);
  validateRequirementAuthoringTasks(expectedTasks);

  const settingsCurrent = jsonEqual(currentSettings, expectedSettings);
  const extensionsCurrent = jsonEqual(currentExtensions, expectedExtensions);
  const tasksCurrent = jsonEqual(currentTasks, expectedTasks);
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
  if (!tasksCurrent) {
    changes.push({
      projectPath: tasksProjectPath,
      text: formatTasksJson(expectedTasks),
    });
  }

  writeWorkspaceTransaction(changes);

  const writtenSettings = readRequiredObject(
    settingsProjectPath,
    "VS Code workspace settings",
  );
  const writtenExtensions = readRequiredObject(
    extensionsProjectPath,
    "VS Code extension recommendations",
  );
  const writtenTasks = readRequiredObject(
    tasksProjectPath,
    "VS Code task catalog",
    true,
  );
  validateSettings(writtenSettings);
  validateExtensions(writtenExtensions);
  validateRequirementAuthoringTasks(writtenTasks);

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
    tasksStatus: tasksCurrent
      ? "current"
      : Object.keys(currentTasks).length === 0
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
  if (args[0] === "--write") {
    return "write";
  }
  if (args[0] === "--check") {
    return "check";
  }
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
  console.log(`Tasks status: ${result.tasksStatus}`);
  console.log(`Preview task: ${previewTaskLabel}`);
  console.log(`Create task: ${createTaskLabel}`);
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
