#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  securityRequirementAuthoringPreviewTaskLabel,
  validateSecurityRequirementAuthoringEditorSettings,
  validateSecurityRequirementAuthoringEditorTasks,
} from "./lib/security-requirement-authoring-editor-assistance.mjs";
import {
  materializeSecurityRequirementAuthoringSchema,
} from "./materialize-security-requirement-authoring-schema.mjs";

/**
 * @file Security Requirement activation-candidate editor assistance checker.
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
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(
  process.env.TF_SECURITY_REQUIREMENT_AUTHORING_EDITOR_ROOT ??
    path.resolve(scriptDir, "..", ".."),
);
const testPath = path.resolve(
  rootDir,
  "tools/MR-0001/test/security-requirement-authoring-editor.test.mjs",
);

function stripJsonComments(value) {
  const source = String(value ?? "").replace(/^\uFEFF/u, "");
  let result = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (current === "\n") {
        lineComment = false;
        result += "\n";
      } else result += " ";
      continue;
    }
    if (blockComment) {
      if (current === "*" && next === "/") {
        blockComment = false;
        result += "  ";
        index += 1;
      } else result += current === "\n" ? "\n" : " ";
      continue;
    }
    if (inString) {
      result += current;
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === '"') inString = false;
      continue;
    }
    if (current === '"') {
      inString = true;
      result += current;
      continue;
    }
    if (current === "/" && next === "/") {
      lineComment = true;
      result += "  ";
      index += 1;
      continue;
    }
    if (current === "/" && next === "*") {
      blockComment = true;
      result += "  ";
      index += 1;
      continue;
    }
    result += current;
  }
  if (blockComment) throw new Error("JSONC contains an unterminated block comment.");
  return result;
}

function removeTrailingCommas(value) {
  const source = String(value ?? "");
  let result = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    if (inString) {
      result += current;
      if (escaped) escaped = false;
      else if (current === "\\") escaped = true;
      else if (current === '"') inString = false;
      continue;
    }
    if (current === '"') {
      inString = true;
      result += current;
      continue;
    }
    if (current === ",") {
      let lookahead = index + 1;
      while (/\s/u.test(source[lookahead] ?? "")) lookahead += 1;
      if (source[lookahead] === "}" || source[lookahead] === "]") continue;
    }
    result += current;
  }
  return result;
}

function readJsonc(projectPath) {
  return JSON.parse(
    removeTrailingCommas(
      stripJsonComments(
        fs.readFileSync(path.resolve(rootDir, projectPath), "utf8"),
      ),
    ),
  );
}

function parseTestCount(output) {
  const match = String(output ?? "").match(/(?:#|ℹ)\s*tests\s+(\d+)/u);
  return match ? Number(match[1]) : 0;
}

try {
  const materialized = materializeSecurityRequirementAuthoringSchema({
    rootDir,
    mode: "check",
  });
  const settings = readJsonc(".vscode/settings.json");
  const tasks = readJsonc(".vscode/tasks.json");
  const settingsRouting =
    validateSecurityRequirementAuthoringEditorSettings(settings);
  const taskRouting = validateSecurityRequirementAuthoringEditorTasks(tasks);

  const testResult = spawnSync(process.execPath, ["--test", testPath], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  if (testResult.error || testResult.status !== 0) {
    throw new Error(
      `Security Requirement editor assistance verification failed:\n${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
    );
  }
  const testCount = parseTestCount(
    `${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
  );
  if (testCount < 24) {
    throw new Error(
      `Security Requirement editor assistance verification count is incomplete: ${testCount}.`,
    );
  }

  console.log("Security Requirement authoring editor assistance check passed.");
  console.log("Implemented requirement: MR-0001ADR-0009REQ-0001");
  console.log("Implemented requirement: MR-0001ADR-0009REQ-0001GOV-0001");
  console.log("Implemented requirement: MR-0002ADR-0005REQ-0003");
  console.log("Implemented requirement: MR-0002ADR-0005REQ-0003GOV-0001");
  console.log(`Activation state: ${materialized.activationState}`);
  console.log("Schema branches checked: 1");
  console.log(`Functional parent candidates checked: ${materialized.parentCandidates}`);
  console.log(`Accepted Finding candidates checked: ${materialized.findingCandidates}`);
  console.log(`Schema association: ${settingsRouting.schemaAssociationKey}`);
  console.log(`Request glob: ${settingsRouting.fileGlob}`);
  console.log(`Preview task: ${taskRouting.previewTask}`);
  console.log(`Expected preview task: ${securityRequirementAuthoringPreviewTaskLabel}`);
  console.log("Create while inactive: absent");
  console.log("Schema provider boundary: cycle-free");
  console.log("Negative fixtures checked: 8");
  console.log(`Editor tests checked: ${testCount}`);
  console.log("Warnings: 0");
  console.log("Errors: 0");
} catch (error) {
  console.error("Security Requirement authoring editor assistance check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
