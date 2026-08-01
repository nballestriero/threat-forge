#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  mergeCommonAnalysisFindingEditorRouting,
  validateCommonAnalysisFindingEditorRouting,
} from "../MR-0005/lib/common-analysis-finding-editor-routing.mjs";
import {
  materializeCommonAnalysisFindingSchema,
} from "../MR-0005/lib/materialize-common-analysis-finding-schema.mjs";
import {
  buildSecurityRequirementAuthoringCreateTask,
  buildSecurityRequirementAuthoringPreviewTask,
  mergeSecurityRequirementAuthoringEditorSettings,
  securityRequirementAuthoringCreateTaskLabel,
  securityRequirementAuthoringPreviewTaskLabel,
  validateSecurityRequirementAuthoringEditorTasks,
  validateSecurityRequirementAuthoringEditorSettings,
} from "../MR-0001/lib/security-requirement-authoring-editor-assistance.mjs";
import {
  materializeSecurityRequirementAuthoringSchema,
} from "../MR-0001/materialize-security-requirement-authoring-schema.mjs";

/**
 * @file VS Code governed document authoring adapter materializer.
 *
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @implementsRequirement MR-0002ADR-0005REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0002
 * @implementsRequirement MR-0002ADR-0006REQ-0002GOV-0001
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0004
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0005/ADR-0002
 * @macroRequirement MR-0002
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Materializes the thin VS Code adapter for Macro-requirement, Decision,
 * Functional Requirement and Governance Requirement authoring. It associates
 * the generated request schema, recommends YAML support and exposes preview and
 * confirmed-create tasks for the active request file. No domain enum, relation
 * or body rule is owned by the workspace configuration.
 *
 * Side effects:
 * - --write updates only managed fragments in .vscode/settings.json,
 *   .vscode/extensions.json and .vscode/tasks.json;
 * - both modes require the separately registered governed-document, Common
 *   Finding and Security Requirement schema projections to be current;
 * - --check fails when any managed projection is missing, stale or unsafe;
 * - neither mode changes canonical registries or governed Markdown bodies.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_VSCODE_GOVERNED_DOCUMENT_AUTHORING_ADAPTER_ROOT
  ? path.resolve(process.env.TF_VSCODE_GOVERNED_DOCUMENT_AUTHORING_ADAPTER_ROOT)
  : defaultRootDir;

const schemaMaterializerProjectPath =
  "tools/MR-0002/materialize-governed-document-authoring-schema.mjs";
const authoringRunnerProjectPath =
  "tools/MR-0002/run-governed-document-authoring.mjs";
const governedMarkdownInstallerProjectPath =
  "tools/MR-0002/install-vscode-governed-markdown-assistance.mjs";
const materializedSchemaProjectPath =
  ".vscode/schemas/governed-document-authoring.schema.json";
const settingsProjectPath = ".vscode/settings.json";
const extensionsProjectPath = ".vscode/extensions.json";
const tasksProjectPath = ".vscode/tasks.json";
const schemaAssociationKey = `./${materializedSchemaProjectPath}`;
const authoringRequestGlob = "**/*.governed-document-authoring.yml";
const yamlExtensionId = "redhat.vscode-yaml";
const previewTaskLabel = "ThreatForge: preview governed document authoring";
const createTaskLabel = "ThreatForge: create governed document authoring";
const installMarkdownAssistanceTaskLabel =
  "ThreatForge: install governed Markdown assistance";
const managedTaskLabels = new Set([
  previewTaskLabel,
  createTaskLabel,
  securityRequirementAuthoringPreviewTaskLabel,
  securityRequirementAuthoringCreateTaskLabel,
  installMarkdownAssistanceTaskLabel,
]);
const implementationTraceTag = ["@implements", "Requirement"].join("");
const tasksHeader = `/**
 * @file ThreatForge local VS Code task catalog.
 *
 * ${implementationTraceTag} MR-0002ADR-0005REQ-0001
 * ${implementationTraceTag} MR-0002ADR-0005REQ-0001GOV-0001
 * ${implementationTraceTag} MR-0002ADR-0005REQ-0003
 * ${implementationTraceTag} MR-0002ADR-0005REQ-0003GOV-0001
 * ${implementationTraceTag} MR-0002ADR-0001REQ-0001
 * ${implementationTraceTag} MR-0002ADR-0001REQ-0001GOV-0001
 * ${implementationTraceTag} MR-0002ADR-0003REQ-0001
 * ${implementationTraceTag} MR-0002ADR-0003REQ-0001GOV-0001
 * ${implementationTraceTag} MR-0002ADR-0003REQ-0002
 * ${implementationTraceTag} MR-0002ADR-0003REQ-0002GOV-0001
 * ${implementationTraceTag} MR-0002ADR-0006REQ-0002
 * ${implementationTraceTag} MR-0002ADR-0006REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0002/ADR-0001
 * @derivedFromDecision MR-0002/ADR-0003
 * @derivedFromDecision MR-0002/ADR-0006
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 */`;

/** @param {unknown} value @param {string} label @returns {Record<string, unknown>} */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}
/** @param {unknown} value @param {string} label @returns {unknown[]} */
function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}
/** @param {unknown} value @param {string} label @returns {string} */
function requireString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string.`);
  return normalized;
}
/** @param {string} projectPath */
function resolveProjectPath(projectPath) {
  const normalized = String(projectPath ?? "").replaceAll("\\", "/").trim();
  if (!normalized) throw new Error("Repository-relative path must not be empty.");
  if (path.isAbsolute(normalized) || path.win32.isAbsolute(normalized) || path.posix.isAbsolute(normalized)) {
    throw new Error(`Repository path must be relative: ${normalized}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Repository path is unsafe: ${normalized}`);
  }
  const absolute = path.resolve(rootDir, ...segments);
  if (absolute !== rootDir && !absolute.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`Repository path resolves outside root: ${normalized}`);
  }
  return absolute;
}

/** @param {string} text */
function stripJsonComments(text) {
  const source = String(text ?? "").replace(/^\uFEFF/u, "");
  let result = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (current === "\n") { lineComment = false; result += "\n"; } else result += " ";
      continue;
    }
    if (blockComment) {
      if (current === "*" && next === "/") { blockComment = false; result += "  "; index += 1; }
      else result += current === "\n" ? "\n" : " ";
      continue;
    }
    if (inString) {
      result += current;
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === '"') inString = false;
      continue;
    }
    if (current === '"') { inString = true; result += current; continue; }
    if (current === "/" && next === "/") { lineComment = true; result += "  "; index += 1; continue; }
    if (current === "/" && next === "*") { blockComment = true; result += "  "; index += 1; continue; }
    result += current;
  }
  if (blockComment) throw new Error("JSONC contains an unterminated block comment.");
  return result;
}

/** @param {string} text */
function removeTrailingCommas(text) {
  let result = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    if (inString) {
      result += current;
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === '"') inString = false;
      continue;
    }
    if (current === '"') { inString = true; result += current; continue; }
    if (current === ",") {
      let lookahead = index + 1;
      while (/\s/u.test(text[lookahead] ?? "")) lookahead += 1;
      if (text[lookahead] === "}" || text[lookahead] === "]") continue;
    }
    result += current;
  }
  return result;
}

/** @param {string} text @param {string} label */
function parseJsonc(text, label) {
  try {
    return requireObject(JSON.parse(removeTrailingCommas(stripJsonComments(text))), label);
  } catch (error) {
    throw new Error(`${label} is not valid JSONC: ${error.message}`);
  }
}

/** @param {unknown} value */
function orderKeys(value) {
  if (Array.isArray(value)) return value.map(orderKeys);
  if (!value || typeof value !== "object") return value;
  const ordered = {};
  for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right, "en"))) {
    ordered[key] = orderKeys(value[key]);
  }
  return ordered;
}
function formatJson(value) { return `${JSON.stringify(orderKeys(value), null, 2)}\n`; }
function formatTasks(value) { return `${tasksHeader}\n${JSON.stringify(value, null, 2)}\n`; }

/** @param {string} projectPath @param {Record<string, unknown>} fallback */
function readJsoncFile(projectPath, fallback) {
  const absolute = resolveProjectPath(projectPath);
  return fs.existsSync(absolute) ? parseJsonc(fs.readFileSync(absolute, "utf8"), projectPath) : structuredClone(fallback);
}

/** @param {string} projectPath @param {string} text */
function writeAtomically(projectPath, text) {
  const absolute = resolveProjectPath(projectPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const temporary = path.join(path.dirname(absolute), `.${path.basename(absolute)}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(temporary, text, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, absolute);
  } catch (error) {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
    throw new Error(`Cannot atomically materialize ${projectPath}: ${error.message}`);
  }
}

function buildManagedTask(mode) {
  if (mode === "preview-security-requirement") {
    return buildSecurityRequirementAuthoringPreviewTask();
  }
  if (mode === "create-security-requirement") {
    return buildSecurityRequirementAuthoringCreateTask();
  }
  if (mode === "install-markdown-assistance") {
    return {
      label: installMarkdownAssistanceTaskLabel,
      type: "process",
      command: "node",
      args: [governedMarkdownInstallerProjectPath, "--install"],
      options: { cwd: "${workspaceFolder}" },
      problemMatcher: [],
      presentation: {
        reveal: "always",
        panel: "shared",
        clear: true,
        focus: true,
      },
    };
  }
  const preview = mode === "preview";
  return {
    label: preview ? previewTaskLabel : createTaskLabel,
    type: "process",
    command: "node",
    args: [
      authoringRunnerProjectPath,
      preview ? "--preview" : "--create",
      "--request",
      "${relativeFile}",
    ],
    options: { cwd: "${workspaceFolder}" },
    problemMatcher: [],
    presentation: { reveal: "always", panel: "shared", clear: true, focus: true },
  };
}

/** @param {Record<string, unknown>} existing */
export function mergeGovernedDocumentAuthoringTasks(existing, options = {}) {
  const securityActivationState = String(
    options.securityActivationState ?? "inactive",
  );
  const tasks = existing.tasks === undefined ? [] : requireArray(existing.tasks, "tasks.tasks");
  const inputs = existing.inputs === undefined ? [] : requireArray(existing.inputs, "tasks.inputs");
  const replaceable = managedTaskLabels;
  let insertionIndex = tasks.length;
  const preserved = [];
  for (let index = 0; index < tasks.length; index += 1) {
    const task = requireObject(tasks[index], `tasks.tasks[${index}]`);
    const label = requireString(task.label, `tasks.tasks[${index}].label`);
    if (replaceable.has(label)) { insertionIndex = Math.min(insertionIndex, preserved.length); continue; }
    preserved.push(task);
  }
  preserved.splice(
    insertionIndex,
    0,
    buildManagedTask("preview"),
    buildManagedTask("create"),
    buildManagedTask("preview-security-requirement"),
    ...(securityActivationState === "active"
      ? [buildManagedTask("create-security-requirement")]
      : []),
    buildManagedTask("install-markdown-assistance"),
  );
  inputs.forEach((value, index) => requireObject(value, `tasks.inputs[${index}]`));
  return { ...existing, version: existing.version ?? "2.0.0", tasks: preserved };
}

function mergeSettings(existing) {
  const schemas = existing["yaml.schemas"] === undefined
    ? {}
    : requireObject(
      existing["yaml.schemas"],
      "settings.yaml.schemas",
    );
  const mergedSchemas = { ...schemas };
  mergedSchemas[schemaAssociationKey] = [authoringRequestGlob];

  return mergeSecurityRequirementAuthoringEditorSettings(
    mergeCommonAnalysisFindingEditorRouting({
      ...existing,
      "yaml.schemas": mergedSchemas,
    }),
  );
}
function mergeExtensions(existing) {
  const recommendations = existing.recommendations === undefined
    ? []
    : requireArray(existing.recommendations, "extensions.recommendations").map((value) => requireString(value, "extension recommendation"));
  return { ...existing, recommendations: [...new Set([...recommendations, yamlExtensionId])].sort() };
}

function runSchemaMaterializer(mode) {
  const tool = resolveProjectPath(schemaMaterializerProjectPath);
  const result = spawnSync(process.execPath, [tool, `--${mode}`], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TF_GOVERNED_DOCUMENT_AUTHORING_MATERIALIZER_ROOT: rootDir,
      TF_GOVERNED_DOCUMENT_AUTHORING_SCHEMA_ROOT: rootDir,
      TF_GOVERNED_DOCUMENT_AUTHORING_CATALOG_ROOT: rootDir,
    },
  });
  if (result.error || result.status !== 0) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(`Governed document authoring schema materializer failed${diagnostics ? `: ${diagnostics}` : "."}`);
  }
}

/**
 * Materializes or checks the canonical Common Finding editor schema.
 *
 * @param {"write"|"check"} mode - Explicit materialization mode.
 * @returns {void}
 */
function runCommonAnalysisFindingSchemaMaterializer(mode) {
  materializeCommonAnalysisFindingSchema({
    rootDir,
    mode,
  });
}

/** @param {Record<string, unknown>} tasks */
export function validateGovernedDocumentAuthoringTasks(tasks, options = {}) {
  const securityActivationState = String(
    options.securityActivationState ?? "inactive",
  );
  if (requireString(tasks.version, "tasks.version") !== "2.0.0") throw new Error("VS Code tasks.version must be 2.0.0.");
  const byLabel = new Map();
  for (const [index, value] of requireArray(tasks.tasks, "tasks.tasks").entries()) {
    const task = requireObject(value, `tasks.tasks[${index}]`);
    const label = requireString(task.label, `tasks.tasks[${index}].label`);
    if (byLabel.has(label)) throw new Error(`Duplicate VS Code task label: ${label}`);
    byLabel.set(label, task);
  }
  for (const mode of [
    "preview",
    "create",
    "preview-security-requirement",
    ...(securityActivationState === "active"
      ? ["create-security-requirement"]
      : []),
    "install-markdown-assistance",
  ]) {
    const expected = buildManagedTask(mode);
    const task = byLabel.get(expected.label);
    if (!task) throw new Error(`Missing managed VS Code task: ${expected.label}`);
    if (JSON.stringify(task) !== JSON.stringify(expected)) throw new Error(`${expected.label} differs from the generated adapter projection.`);
  }
}

function validateSettings(settings) {
  const schemas = requireObject(
    settings["yaml.schemas"],
    "settings.yaml.schemas",
  );
  const association = requireArray(
    schemas[schemaAssociationKey],
    `settings.yaml.schemas[${schemaAssociationKey}]`,
  );

  if (
    association.length !== 1 ||
    association[0] !== authoringRequestGlob
  ) {
    throw new Error(
      "Governed document authoring schema association is stale.",
    );
  }

  return {
    commonFinding: validateCommonAnalysisFindingEditorRouting(settings),
    securityRequirement:
      validateSecurityRequirementAuthoringEditorSettings(settings),
  };
}
function validateExtensions(extensions) {
  const recommendations = requireArray(extensions.recommendations, "extensions.recommendations");
  if (!recommendations.includes(yamlExtensionId)) throw new Error(`Missing recommended extension: ${yamlExtensionId}`);
}

/** @param {"write"|"check"} mode */
export function materializeVsCodeGovernedDocumentAuthoringAdapter(mode) {
  if (mode !== "write" && mode !== "check") throw new Error(`Unsupported materialization mode: ${mode}`);
  runSchemaMaterializer("check");
  runCommonAnalysisFindingSchemaMaterializer("check");
  const securityRequirementSchema =
    materializeSecurityRequirementAuthoringSchema({
      rootDir,
      mode: "check",
    });
  const settings = mergeSettings(readJsoncFile(settingsProjectPath, {}));
  const extensions = mergeExtensions(readJsoncFile(extensionsProjectPath, { recommendations: [] }));
  const tasks = mergeGovernedDocumentAuthoringTasks(
    readJsoncFile(tasksProjectPath, { version: "2.0.0", tasks: [] }),
    { securityActivationState: securityRequirementSchema.activationState },
  );
  const expected = {
    settings: formatJson(settings),
    extensions: formatJson(extensions),
    tasks: formatTasks(tasks),
  };
  if (mode === "write") {
    writeAtomically(settingsProjectPath, expected.settings);
    writeAtomically(extensionsProjectPath, expected.extensions);
    writeAtomically(tasksProjectPath, expected.tasks);
  }
  const actualSettings = readJsoncFile(settingsProjectPath, {});
  const actualExtensions = readJsoncFile(extensionsProjectPath, { recommendations: [] });
  const actualTasks = readJsoncFile(tasksProjectPath, { version: "2.0.0", tasks: [] });
  const editorRouting = validateSettings(actualSettings);
  validateExtensions(actualExtensions);
  validateGovernedDocumentAuthoringTasks(actualTasks, {
    securityActivationState: securityRequirementSchema.activationState,
  });
  validateSecurityRequirementAuthoringEditorTasks(actualTasks, {
    activationState: securityRequirementSchema.activationState,
  });
  if (formatJson(actualSettings) !== expected.settings) throw new Error(`${settingsProjectPath} is stale.`);
  if (formatJson(actualExtensions) !== expected.extensions) throw new Error(`${extensionsProjectPath} is stale.`);
  if (formatTasks(actualTasks) !== expected.tasks) throw new Error(`${tasksProjectPath} is stale.`);
  return {
    mode,
    settingsStatus: "current",
    extensionsStatus: "current",
    tasksStatus: "current",
    previewTask: previewTaskLabel,
    createTask: createTaskLabel,
    installMarkdownAssistanceTask: installMarkdownAssistanceTaskLabel,
    schema: `./${materializedSchemaProjectPath}`,
    requestGlob: authoringRequestGlob,
    commonFindingSchema:
      editorRouting.commonFinding.schemaAssociationKey,
    commonFindingGlob:
      editorRouting.commonFinding.fileGlob,
    securityRequirementSchema:
      `./${securityRequirementSchema.path}`,
    securityRequirementGlob:
      editorRouting.securityRequirement.fileGlob,
    securityRequirementPreviewTask:
      securityRequirementAuthoringPreviewTaskLabel,
    securityRequirementActivationState:
      securityRequirementSchema.activationState,
    recommendedExtension: yamlExtensionId,
  };
}

function parseMode(args) {
  if (args.length !== 1) throw new Error("Exactly one explicit mode is required: --write or --check.");
  if (args[0] === "--write") return "write";
  if (args[0] === "--check") return "check";
  throw new Error(`Unsupported argument: ${args[0]}`);
}
function main() {
  const result = materializeVsCodeGovernedDocumentAuthoringAdapter(parseMode(process.argv.slice(2)));
  console.log("VS Code governed document authoring adapter materialization succeeded.");
  console.log(`Mode: ${result.mode}`);
  console.log(`Settings status: ${result.settingsStatus}`);
  console.log(`Extensions status: ${result.extensionsStatus}`);
  console.log(`Tasks status: ${result.tasksStatus}`);
  console.log(`Preview task: ${result.previewTask}`);
  console.log(`Create task: ${result.createTask}`);
  console.log(`Install Markdown assistance task: ${result.installMarkdownAssistanceTask}`);
  console.log(`Schema: ${result.schema}`);
  console.log(`Authoring request glob: ${result.requestGlob}`);
  console.log(`Common Finding schema: ${result.commonFindingSchema}`);
  console.log(`Common Finding glob: ${result.commonFindingGlob}`);
  console.log(`Security Requirement schema: ${result.securityRequirementSchema}`);
  console.log(`Security Requirement glob: ${result.securityRequirementGlob}`);
  console.log(`Security Requirement preview task: ${result.securityRequirementPreviewTask}`);
  console.log(`Security Requirement activation state: ${result.securityRequirementActivationState}`);
  console.log(`Recommended extension: ${result.recommendedExtension}`);
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) {
  try { main(); }
  catch (error) { console.error(`VS Code governed document authoring adapter materialization failed: ${error.message}`); process.exitCode = 1; }
}
