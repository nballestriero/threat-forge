#!/usr/bin/env node
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readGovernedYamlFile } from "../MR-0001/lib/governed-yaml.mjs";
import {
  assertSecurityRequirementCreationAllowed,
  planSecurityRequirementAuthoring,
} from "../MR-0001/lib/security-requirement-authoring-provider.mjs";
import {
  applyGovernedDocumentAuthoring,
  loadGovernedDocumentAuthoringCatalog,
} from "./run-governed-document-authoring.mjs";

/**
 * @file Security Requirement governed authoring request runner.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0001
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Provides an IDE-independent preview/create surface for the Security
 * Requirement provider. Preview is read-only. Create remains fail-closed unless
 * the canonical model is active, then delegates to the shared rollback-capable
 * authoring transaction and complete repository gate.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const requestSuffix = ".security-requirement-authoring.yml";

function resolveRootDir(options = {}) {
  return path.resolve(
    options.rootDir ??
      process.env.TF_SECURITY_REQUIREMENT_AUTHORING_ROOT ??
      defaultRootDir,
  );
}

function resolveProjectPath(rootDir, projectPath) {
  const normalized = String(projectPath ?? "")
    .replaceAll("\\", "/")
    .trim();
  if (
    !normalized ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Unsafe repository-relative path: ${normalized || "<empty>"}`);
  }
  const parts = normalized.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Unsafe repository-relative path: ${normalized}`);
  }
  const absolute = path.resolve(rootDir, ...parts);
  if (absolute !== rootDir && !absolute.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`Repository path escapes root: ${normalized}`);
  }
  return absolute;
}

function parseArgs(argv) {
  let mode = "";
  let requestPath = "";
  let help = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--preview" || argument === "--create") {
      if (mode) throw new Error("Exactly one mode is required.");
      mode = argument.slice(2);
      continue;
    }
    if (argument === "--request") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--request requires a repository-relative path.");
      }
      requestPath = value;
      index += 1;
      continue;
    }
    if (argument === "--help") {
      help = true;
      continue;
    }
    throw new Error(`Unsupported argument: ${argument}`);
  }
  if (help) {
    if (mode || requestPath) throw new Error("--help must be used alone.");
    return { mode: "help", requestPath: "" };
  }
  if (!mode) throw new Error("Exactly one mode is required: --preview or --create.");
  if (!requestPath) throw new Error("--request is required.");
  return { mode, requestPath };
}

function helpText() {
  return [
    "Usage:",
    "  node tools/MR-0002/run-security-requirement-authoring.mjs --preview --request path/to/file.security-requirement-authoring.yml",
    "  node tools/MR-0002/run-security-requirement-authoring.mjs --create --request path/to/file.security-requirement-authoring.yml",
    "",
    "Preview derives one SEC identity, canonical parent reference and accepted Finding references without writing.",
    "Create is available only while the Security Requirement model is canonically active and still requires explicit confirmation.",
  ].join("\n");
}

/**
 * Reads one Security Requirement authoring request.
 *
 * @param {string} requestProjectPath Repository-relative request path.
 * @param {{rootDir?: string}} [options] Context.
 * @returns {Record<string, unknown>} Parsed request.
 */
export function readSecurityRequirementAuthoringRequest(
  requestProjectPath,
  options = {},
) {
  const normalized = String(requestProjectPath ?? "")
    .replaceAll("\\", "/")
    .trim();
  if (!normalized.endsWith(requestSuffix)) {
    throw new Error(`Security authoring request path must end with ${requestSuffix}.`);
  }
  return readGovernedYamlFile(
    resolveProjectPath(resolveRootDir(options), normalized),
  );
}

/**
 * Formats the complete deterministic Security Requirement plan.
 *
 * @param {Record<string, unknown>} plan Plan.
 * @returns {string} Human-readable preview.
 */
export function formatSecurityRequirementAuthoringPlan(plan) {
  const documentPlan = plan.documentPlan ?? {};
  return [
    "Security Requirement authoring planned.",
    `Activation state: ${plan.activation_state}`,
    `Parent Functional Requirement: ${plan.request?.parent_requirement_id}`,
    `Accepted Common Findings: ${(plan.selected_finding_ids ?? []).join(", ")}`,
    `ID: ${documentPlan.id}`,
    `Registry: ${documentPlan.registryPath}`,
    `Body: ${documentPlan.bodyPath}`,
    "Produced artifacts:",
    ...(documentPlan.changes ?? []).map((change) => `- ${change.projectPath}`),
    "",
    "Registry record:",
    "",
    String(documentPlan.recordBlock ?? "").trimEnd(),
    "",
    "Body preview:",
    "",
    String(documentPlan.bodyText ?? "").trimEnd(),
  ].join("\n");
}

/**
 * Executes preview or create through injectable boundaries for verification.
 *
 * @param {{mode: "preview"|"create", request: Record<string, unknown>}} command Command.
 * @param {{rootDir?: string, catalog?: Record<string, unknown>, plan?: Function, apply?: Function}} [options]
 *   Runtime overrides.
 * @returns {Record<string, unknown>} Execution result.
 */
export function executeSecurityRequirementAuthoring(command, options = {}) {
  const rootDir = resolveRootDir(options);
  const activeCatalog = options.catalog ??
    loadGovernedDocumentAuthoringCatalog({ rootDir });
  const planner = options.plan ?? planSecurityRequirementAuthoring;
  const plan = planner(command.request, {
    rootDir,
    activeCatalog,
  });
  if (command.mode === "preview") {
    return { mode: "preview", plan, applied: false };
  }
  if (command.mode !== "create") {
    throw new Error(`Unsupported authoring mode: ${command.mode}`);
  }
  assertSecurityRequirementCreationAllowed(plan);
  const apply = options.apply ?? applyGovernedDocumentAuthoring;
  const result = apply(plan, { rootDir });
  return { mode: "create", plan, applied: true, result };
}

async function main() {
  let terminal;
  try {
    const command = parseArgs(process.argv.slice(2));
    if (command.mode === "help") {
      console.log(helpText());
      return 0;
    }
    const rootDir = resolveRootDir();
    const request = readSecurityRequirementAuthoringRequest(
      command.requestPath,
      { rootDir },
    );
    const activeCatalog = loadGovernedDocumentAuthoringCatalog({ rootDir });
    const plan = planSecurityRequirementAuthoring(request, {
      rootDir,
      activeCatalog,
    });
    console.log(formatSecurityRequirementAuthoringPlan(plan));
    if (command.mode === "preview") {
      console.log("\nMode: preview");
      console.log("No repository file was modified.");
      return 0;
    }

    assertSecurityRequirementCreationAllowed(plan);
    terminal = createInterface({ input: process.stdin, output: process.stdout });
    const confirmation = String(
      await terminal.question(
        '\nType create to confirm, or press Enter to cancel: ',
      ),
    ).trim();
    if (confirmation !== "create") {
      throw new Error(
        'Creation cancelled: explicit confirmation "create" was not provided.',
      );
    }
    const result = applyGovernedDocumentAuthoring(plan, { rootDir });
    const verification = result.verification ?? {};
    if (String(verification.stdout ?? "").trim()) {
      console.log(`\n${String(verification.stdout).trimEnd()}`);
    }
    if (String(verification.stderr ?? "").trim()) {
      console.error(`\n${String(verification.stderr).trimEnd()}`);
    }
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
