#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readGovernedYamlFile } from "../MR-0001/lib/governed-yaml.mjs";
import {
  applyGeneratedDocument,
  planGeneratedDocument,
} from "./create-governed-document.mjs";
import {
  createRepositoryProjectionMaterializationSession,
} from "./lib/repository-projection-materialization.mjs";

/**
 * @file Governed document authoring request runner.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Reads one IDE-independent *.governed-document-authoring.yml request, resolves
 * every field and relation through the canonical catalog, prints the complete
 * deterministic plan and applies it only after explicit confirmation. The
 * registered repository projections and the complete repository gate execute
 * inside the rollback-capable transaction.
 *
 * Side effects:
 * - preview reads canonical sources and prints the plan only;
 * - create writes all planned governed artifacts after explicit confirmation;
 * - a failed post-write gate rolls back every affected artifact;
 * - no commit or push is performed.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const configuredRootDir = process.env.TF_GOVERNED_DOCUMENT_AUTHORING_ROOT
  ? path.resolve(process.env.TF_GOVERNED_DOCUMENT_AUTHORING_ROOT)
  : defaultRootDir;
const requestSuffix = ".governed-document-authoring.yml";
const catalogBuilderProjectPath =
  "tools/MR-0002/build-governed-document-authoring-catalog.mjs";
const repoCheckProjectPath = "tools/repo-check.mjs";
const generatedRequestFields = new Set([
  "id",
  "status",
  "date",
  "body_path",
  "decisions_registry_path",
  "requirements_registry_path",
  "requirement_type",
]);
const commonRequestFields = new Set(["document_type", "title", "body"]);
const typeSpecificFields = Object.freeze({
  "macro-requirement": new Set(["macro_requirement_type"]),
  decision: new Set(["macro_requirement_id", "decision_type", "author"]),
  "functional-requirement": new Set(["macro_requirement_id", "decision_id"]),
  "governance-requirement": new Set([
    "macro_requirement_id",
    "decision_id",
    "parent_requirement_id",
  ]),
});

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
/** @param {{rootDir?: string}} options */
function resolveRootDir(options = {}) {
  return options.rootDir ? path.resolve(String(options.rootDir)) : configuredRootDir;
}
/** @param {string} projectPath @param {string} rootDir */
function resolveProjectPath(projectPath, rootDir) {
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
  const relative = path.relative(rootDir, absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Repository path resolves outside root: ${normalized}`);
  }
  return absolute;
}

/** @param {string[]} argv */
function parseArgs(argv) {
  let mode = null;
  let requestPath = null;
  let help = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--preview" || arg === "--create") {
      const candidate = arg.slice(2);
      if (mode) throw new Error("Exactly one mode is required: --preview or --create.");
      mode = candidate;
      continue;
    }
    if (arg === "--request") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--request requires a repository-relative path.");
      requestPath = value;
      index += 1;
      continue;
    }
    if (arg === "--help") {
      help = true;
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }
  if (help) {
    if (mode || requestPath) throw new Error("--help must be used alone.");
    return { mode: "help", requestPath: null };
  }
  if (!mode) throw new Error("Exactly one mode is required: --preview or --create.");
  if (!requestPath) throw new Error("--request is required.");
  return { mode, requestPath };
}

function helpText() {
  return `Usage:\n  node tools/MR-0002/run-governed-document-authoring.mjs --preview --request path/to/file.governed-document-authoring.yml\n  node tools/MR-0002/run-governed-document-authoring.mjs --create --request path/to/file.governed-document-authoring.yml\n\nThe request document supports Macro-requirement, Decision, Functional Requirement and Governance Requirement authoring. Preview never writes. Create prints the same plan and requires the exact confirmation token create before the atomic transaction and complete repository gate.`;
}

/** @param {{rootDir?: string}} [options] */
export function loadGovernedDocumentAuthoringCatalog(options = {}) {
  const rootDir = resolveRootDir(options);
  const builderPath = resolveProjectPath(catalogBuilderProjectPath, rootDir);
  if (!fs.existsSync(builderPath)) throw new Error(`Authoring catalog builder is missing: ${catalogBuilderProjectPath}`);
  const result = spawnSync(process.execPath, [builderPath], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, TF_GOVERNED_DOCUMENT_AUTHORING_CATALOG_ROOT: rootDir },
  });
  if (result.error || result.status !== 0 || String(result.stderr ?? "").trim()) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(`Governed document authoring catalog builder failed${diagnostics ? `: ${diagnostics}` : "."}`);
  }
  return requireObject(JSON.parse(result.stdout), "Governed document authoring catalog");
}

/** @param {Record<string, unknown>} catalog @param {string} documentTypeId */
function documentTypeById(catalog, documentTypeId) {
  const type = requireArray(catalog.document_types, "catalog.document_types")
    .map((value) => requireObject(value, "catalog document type"))
    .find((entry) => entry.id === documentTypeId);
  if (!type) throw new Error(`Unknown governed document_type: ${documentTypeId}`);
  return type;
}

/** @param {Record<string, unknown>} documentType @param {string} fieldName @param {string} value */
function validateControlledField(documentType, fieldName, value) {
  const field = requireArray(documentType.record_fields, `${documentType.id}.record_fields`)
    .map((entry) => requireObject(entry, `${documentType.id} field`))
    .find((entry) => entry.name === fieldName);
  if (!field) throw new Error(`${documentType.id} has no canonical field ${fieldName}.`);
  const values = requireArray(field.controlled_values, `${fieldName}.controlled_values`)
    .map((entry) => requireObject(entry, `${fieldName} controlled value`))
    .map((entry) => entry.value);
  if (!values.includes(value)) throw new Error(`${fieldName} must be one of: ${values.join(", ")}.`);
}

/** @param {Record<string, unknown>} documentType @param {Record<string, unknown>} body */
function validateBodyShape(documentType, body) {
  const sections = requireArray(documentType.body_sections, `${documentType.id}.body_sections`)
    .map((entry) => requireObject(entry, `${documentType.id} body section`))
    .filter((entry) => entry.content_kind !== "controlled_scalar_label");
  const allowed = new Set(sections.map((entry) => entry.input_name));
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) throw new Error(`${documentType.id} body contains unsupported field ${key}.`);
  }
  for (const section of sections) {
    if (section.required && !Object.prototype.hasOwnProperty.call(body, section.input_name)) {
      throw new Error(`${documentType.id} body is missing required field ${section.input_name}.`);
    }
  }
}

/**
 * Validates one request against the current canonical catalog.
 *
 * @param {Record<string, unknown>} request
 * @param {Record<string, unknown>} catalog
 * @returns {Record<string, unknown>}
 */
export function validateGovernedDocumentAuthoringRequest(request, catalog) {
  const input = requireObject(request, "Governed document authoring request");
  for (const key of Object.keys(input)) {
    if (generatedRequestFields.has(key)) throw new Error(`Authoring request must not declare generated field ${key}.`);
  }
  const documentTypeId = requireString(input.document_type, "document_type");
  const specific = typeSpecificFields[documentTypeId];
  if (!specific) throw new Error(`Unknown governed document_type: ${documentTypeId}`);
  const allowed = new Set([...commonRequestFields, ...specific]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) throw new Error(`${documentTypeId} request contains unsupported field ${key}.`);
  }
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) throw new Error(`${documentTypeId} request is missing ${key}.`);
  }
  const title = requireString(input.title, "title");
  if (/\r|\n/u.test(title)) throw new Error("title must be a single line.");
  const canonicalCatalog = requireObject(catalog, "Governed document authoring catalog");
  if (canonicalCatalog.catalog_id !== "governed-document-authoring-catalog") {
    throw new Error(`Unsupported catalog_id: ${canonicalCatalog.catalog_id}`);
  }
  const documentType = documentTypeById(canonicalCatalog, documentTypeId);
  const body = requireObject(input.body, "body");
  validateBodyShape(documentType, body);

  const canonical = { document_type: documentTypeId, title, body };
  if (documentTypeId === "macro-requirement") {
    canonical.macro_requirement_type = requireString(input.macro_requirement_type, "macro_requirement_type");
    validateControlledField(documentType, "macro_requirement_type", canonical.macro_requirement_type);
    return canonical;
  }

  const macroRequirementId = requireString(input.macro_requirement_id, "macro_requirement_id");
  const macro = requireArray(canonicalCatalog.macro_requirements, "catalog.macro_requirements")
    .map((value) => requireObject(value, "catalog Macro-requirement"))
    .find((entry) => entry.id === macroRequirementId);
  if (!macro) throw new Error(`Unknown canonical Macro-requirement: ${macroRequirementId}`);
  canonical.macro_requirement_id = macroRequirementId;

  if (documentTypeId === "decision") {
    canonical.decision_type = requireString(input.decision_type, "decision_type");
    canonical.author = requireString(input.author, "author");
    if (/\r|\n/u.test(canonical.author)) throw new Error("author must be a single line.");
    validateControlledField(documentType, "decision_type", canonical.decision_type);
    return canonical;
  }

  const decisionId = requireString(input.decision_id, "decision_id");
  const decision = requireArray(macro.decisions, `${macroRequirementId}.decisions`)
    .map((value) => requireObject(value, `${macroRequirementId} Decision`))
    .find((entry) => entry.id === decisionId);
  if (!decision) throw new Error(`Decision ${decisionId} does not belong to ${macroRequirementId}.`);
  canonical.decision_id = decisionId;

  if (documentTypeId === "governance-requirement") {
    const parentId = requireString(input.parent_requirement_id, "parent_requirement_id");
    const parent = requireArray(decision.requirements, `${macroRequirementId}/${decisionId}.requirements`)
      .map((value) => requireObject(value, `${macroRequirementId}/${decisionId} Requirement`))
      .find((entry) => entry.id === parentId && entry.requirement_type === "functional");
    if (!parent) throw new Error(`Functional parent ${parentId} does not belong to ${macroRequirementId}/${decisionId}.`);
    canonical.parent_requirement_id = parentId;
  }
  return canonical;
}

/** @param {string} requestProjectPath @param {{rootDir?: string}} [options] */
export function readGovernedDocumentAuthoringRequest(requestProjectPath, options = {}) {
  const normalized = String(requestProjectPath ?? "").replaceAll("\\", "/").trim();
  if (!normalized.endsWith(requestSuffix)) throw new Error(`Authoring request path must end with ${requestSuffix}.`);
  const absolute = resolveProjectPath(normalized, resolveRootDir(options));
  return requireObject(readGovernedYamlFile(absolute), normalized);
}

/** @param {Record<string, unknown>} request @param {Record<string, unknown>} catalog @param {{rootDir?: string, mode?: "preview"|"create", today?: string}} [options] */
export function planGovernedDocumentAuthoring(request, catalog, options = {}) {
  const mode = options.mode ?? "preview";
  if (mode !== "preview" && mode !== "create") throw new Error(`Unsupported authoring mode: ${mode}`);
  const canonicalRequest = validateGovernedDocumentAuthoringRequest(request, catalog);
  return {
    request: canonicalRequest,
    documentPlan: planGeneratedDocument(canonicalRequest, catalog, {
      rootDir: resolveRootDir(options),
      today: options.today,
    }),
  };
}

/** @param {Record<string, unknown>} authoringPlan */
export function formatGovernedDocumentAuthoringPlan(authoringPlan) {
  const plan = requireObject(authoringPlan, "Governed document authoring plan");
  const request = requireObject(plan.request, "authoring plan request");
  const documentPlan = requireObject(plan.documentPlan, "authoring document plan");
  return [
    "Governed document authoring planned.",
    `Document type: ${request.document_type}`,
    ...(request.macro_requirement_id ? [`Macro-requirement: ${request.macro_requirement_id}`] : []),
    ...(request.decision_id ? [`Decision: ${request.decision_id}`] : []),
    ...(request.parent_requirement_id ? [`Parent Requirement: ${request.parent_requirement_id}`] : []),
    `ID: ${documentPlan.id}`,
    `Registry: ${documentPlan.registryPath}`,
    `Body: ${documentPlan.bodyPath}`,
    "Produced artifacts:",
    ...requireArray(documentPlan.changes, "documentPlan.changes").map((change) => `- ${change.projectPath}`),
    "",
    "Registry record:",
    "",
    String(documentPlan.recordBlock).trimEnd(),
    "",
    "Body preview:",
    "",
    String(documentPlan.bodyText).trimEnd(),
  ].join("\n");
}

/** @param {string} rootDir */
function runRepositoryCheck(rootDir) {
  const checkPath = resolveProjectPath(repoCheckProjectPath, rootDir);
  const result = spawnSync(process.execPath, [checkPath], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TF_AUTHORING_ROOT: rootDir,
      TF_GOVERNED_DOCUMENT_AUTHORING_ROOT: rootDir,
      TF_GOVERNED_DOCUMENT_AUTHORING_CATALOG_ROOT: rootDir,
      TF_GOVERNED_DOCUMENT_AUTHORING_SCHEMA_ROOT: rootDir,
      TF_GOVERNED_DOCUMENT_AUTHORING_MATERIALIZER_ROOT: rootDir,
      TF_VSCODE_GOVERNED_DOCUMENT_AUTHORING_ADAPTER_ROOT: rootDir,
    },
  });
  if (result.error || result.status !== 0) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(`Post-creation ThreatForge check failed${diagnostics ? `:\n${diagnostics}` : "."}`);
  }
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/** @param {Record<string, unknown>} authoringPlan @param {{rootDir?: string, verify?: (plan: Record<string, unknown>) => unknown}} [options] */
export function applyGovernedDocumentAuthoring(authoringPlan, options = {}) {
  const plan = requireObject(authoringPlan, "Governed document authoring plan");
  const rootDir = resolveRootDir(options);
  let verification;
  const applied = applyGeneratedDocument(requireObject(plan.documentPlan, "document plan"), {
    rootDir,
    afterInstall: () => {
      if (typeof options.verify === "function") {
        verification = options.verify(plan);
        return;
      }

      const materializationSession = createRepositoryProjectionMaterializationSession({
        rootDir,
        stdio: "pipe",
      });
      try {
        const materialization = materializationSession.execute();
        const gate = runRepositoryCheck(rootDir);
        materializationSession.release();
        verification = { ...gate, materialization };
      } catch (error) {
        if (
          materializationSession.getState() !== "released" &&
          materializationSession.getState() !== "rolled_back"
        ) {
          materializationSession.rollback();
        }
        throw error;
      }
    },
  });
  return { ...applied, verification };
}

async function main() {
  let terminal;
  try {
    const command = parseArgs(process.argv.slice(2));
    if (command.mode === "help") {
      console.log(helpText());
      return 0;
    }
    const catalog = loadGovernedDocumentAuthoringCatalog();
    const request = readGovernedDocumentAuthoringRequest(command.requestPath);
    const plan = planGovernedDocumentAuthoring(request, catalog, { mode: command.mode });
    console.log(formatGovernedDocumentAuthoringPlan(plan));
    if (command.mode === "preview") {
      console.log("\nMode: preview");
      console.log("No repository file was modified.");
      return 0;
    }
    terminal = createInterface({ input: process.stdin, output: process.stdout });
    const confirmation = String(await terminal.question('\nType create to confirm, or press Enter to cancel: ')).trim();
    if (confirmation !== "create") throw new Error('Creation cancelled: explicit confirmation "create" was not provided.');
    const result = applyGovernedDocumentAuthoring(plan);
    const verification = result.verification && typeof result.verification === "object" ? result.verification : {};
    if (String(verification.stdout ?? "").trim()) console.log(`\n${String(verification.stdout).trimEnd()}`);
    if (String(verification.stderr ?? "").trim()) console.error(`\n${String(verification.stderr).trimEnd()}`);
    console.log("\nMode: create");
    console.log(`${result.documentType} ${result.id} created and verified.`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(`\n${helpText()}`);
    return 1;
  } finally {
    terminal?.close();
  }
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) process.exitCode = await main();
