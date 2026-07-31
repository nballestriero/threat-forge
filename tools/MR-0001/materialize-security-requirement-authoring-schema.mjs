#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildSecurityRequirementAuthoringEditorSchema,
  securityRequirementAuthoringEditorRuleIds,
  securityRequirementAuthoringSchemaProjectPath,
  validateSecurityRequirementAuthoringEditorSchema,
} from "./lib/security-requirement-authoring-editor-assistance.mjs";

/**
 * @file Security Requirement activation-candidate authoring schema materializer.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0001
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Materializes one deterministic YAML schema for Security Requirement authoring
 * requests. The schema is regenerated from canonical parent and Finding sources;
 * it does not activate the model and never writes canonical registries or bodies.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");

function failure(message) {
  const error = new Error(
    `[${securityRequirementAuthoringEditorRuleIds.materialization}] ${message}`,
  );
  error.rule_id = securityRequirementAuthoringEditorRuleIds.materialization;
  return error;
}

function resolveRootDir(input = {}) {
  return path.resolve(
    input.rootDir ??
      process.env.TF_SECURITY_REQUIREMENT_AUTHORING_EDITOR_ROOT ??
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
    throw failure(`Unsafe repository-relative path: ${normalized || "<empty>"}.`);
  }
  const parts = normalized.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw failure(`Unsafe repository-relative path: ${normalized}.`);
  }
  const absolute = path.resolve(rootDir, ...parts);
  if (absolute !== rootDir && !absolute.startsWith(`${rootDir}${path.sep}`)) {
    throw failure(`Repository path escapes root: ${normalized}.`);
  }
  return absolute;
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readCurrent(fileSystem, filePath) {
  if (!fileSystem.existsSync(filePath)) return null;
  try {
    return formatJson(JSON.parse(fileSystem.readFileSync(filePath, "utf8")));
  } catch (error) {
    throw failure(`Materialized Security authoring schema is invalid JSON: ${error.message}`);
  }
}

function writeAtomically(fileSystem, filePath, text) {
  const directory = path.dirname(filePath);
  fileSystem.mkdirSync(directory, { recursive: true });
  const temporary = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    fileSystem.writeFileSync(temporary, text, { encoding: "utf8", flag: "wx" });
    fileSystem.renameSync(temporary, filePath);
  } catch (error) {
    try {
      if (fileSystem.existsSync(temporary)) fileSystem.rmSync(temporary, { force: true });
    } catch {
      // Preserve the original materialization failure.
    }
    throw failure(`Cannot atomically materialize schema: ${error.message}`);
  }
}

/**
 * Materializes or checks the dedicated Security Requirement authoring schema.
 *
 * @param {{
 *   rootDir?: string,
 *   mode: "write"|"check",
 *   fileSystem?: typeof fs,
 *   buildSchema?: Function
 * }} input Operation.
 * @returns {{mode: string, status: string, path: string, schemaId: string, activationState: string, parentCandidates: number, findingCandidates: number}}
 */
export function materializeSecurityRequirementAuthoringSchema(input) {
  const mode = String(input?.mode ?? "");
  if (mode !== "write" && mode !== "check") {
    throw failure(`Unsupported materialization mode: ${mode || "<empty>"}.`);
  }
  const rootDir = resolveRootDir(input);
  const fileSystem = input?.fileSystem ?? fs;
  const buildSchema =
    input?.buildSchema ?? buildSecurityRequirementAuthoringEditorSchema;
  const schema = buildSchema({ rootDir });
  const validation = validateSecurityRequirementAuthoringEditorSchema(schema);
  const expected = formatJson(schema);
  const absolute = resolveProjectPath(
    rootDir,
    securityRequirementAuthoringSchemaProjectPath,
  );
  const current = readCurrent(fileSystem, absolute);

  if (mode === "check") {
    if (current === null) {
      throw failure(
        `Materialized Security Requirement authoring schema is missing: ${securityRequirementAuthoringSchemaProjectPath}.`,
      );
    }
    if (current !== expected) {
      throw failure(
        `Materialized Security Requirement authoring schema is stale: ${securityRequirementAuthoringSchemaProjectPath}.`,
      );
    }
    return {
      mode,
      status: "current",
      path: securityRequirementAuthoringSchemaProjectPath,
      schemaId: schema.$id,
      activationState: validation.activation_state,
      parentCandidates: validation.parent_candidates,
      findingCandidates: validation.finding_candidates,
    };
  }

  let status = "created";
  if (current === expected) {
    status = "current";
  } else {
    writeAtomically(fileSystem, absolute, expected);
    if (current !== null) status = "updated";
  }
  return {
    mode,
    status,
    path: securityRequirementAuthoringSchemaProjectPath,
    schemaId: schema.$id,
    activationState: validation.activation_state,
    parentCandidates: validation.parent_candidates,
    findingCandidates: validation.finding_candidates,
  };
}

function parseMode(args) {
  if (args.length !== 1) {
    throw failure("Exactly one explicit mode is required: --write or --check.");
  }
  if (args[0] === "--write") return "write";
  if (args[0] === "--check") return "check";
  throw failure(`Unsupported argument: ${args[0]}.`);
}

function main() {
  const result = materializeSecurityRequirementAuthoringSchema({
    mode: parseMode(process.argv.slice(2)),
  });
  console.log("Security Requirement authoring schema materialization succeeded.");
  console.log(`Mode: ${result.mode}`);
  console.log(`Status: ${result.status}`);
  console.log(`Path: ${result.path}`);
  console.log(`Schema id: ${result.schemaId}`);
  console.log(`Activation state: ${result.activationState}`);
  console.log(`Functional parent candidates: ${result.parentCandidates}`);
  console.log(`Accepted Finding candidates: ${result.findingCandidates}`);
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) {
  try {
    main();
  } catch (error) {
    console.error(
      `Security Requirement authoring schema materialization failed: ${error.message}`,
    );
    process.exitCode = 1;
  }
}
