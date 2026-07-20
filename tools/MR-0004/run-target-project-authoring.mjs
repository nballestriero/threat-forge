#!/usr/bin/env node
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";

import {
  applyTargetProjectAuthoring,
  formatTargetProjectAuthoringPlan,
  planTargetProjectAuthoring,
  targetProjectAuthoringRequirementId,
} from "./lib/target-project-authoring.mjs";

/**
 * @file Target Project governed-document authoring command-line adapter.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0004
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Maps one explicit target_root and target-relative request to the shared Target
 * Project authoring service. Preview never writes. Create requires explicit
 * confirmation and delegates transactional validation and rollback to the
 * application service.
 */

export function parseTargetProjectAuthoringArguments(args) {
  if (args.includes("--help") || args.includes("-h")) {
    if (args.length !== 1) throw new Error("--help must be used alone.");
    return { mode: "help" };
  }
  let mode = null;
  const values = new Map();
  const valueOptions = new Set([
    "--target-root",
    "--request",
    "--engine-root",
    "--decision-date",
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const argument = String(args[index]);
    if (argument === "--preview" || argument === "--create") {
      if (mode) throw new Error("Exactly one mode is required: --preview or --create.");
      mode = argument.slice(2);
      continue;
    }
    if (!valueOptions.has(argument)) {
      throw new Error(`Unsupported Target Project authoring option: ${argument}`);
    }
    const value = String(args[index + 1] ?? "").trim();
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a non-empty value.`);
    }
    if (values.has(argument)) throw new Error(`Duplicate option: ${argument}`);
    values.set(argument, value);
    index += 1;
  }
  if (!mode) throw new Error("Exactly one mode is required: --preview or --create.");
  const targetRoot = values.get("--target-root") ?? "";
  const requestPath = values.get("--request") ?? "";
  if (!targetRoot) throw new Error("--target-root is required.");
  if (!requestPath) throw new Error("--request is required.");
  const today = values.get("--decision-date");
  if (today && !/^\d{4}-\d{2}-\d{2}$/u.test(today)) {
    throw new Error("--decision-date must use YYYY-MM-DD.");
  }
  return {
    mode,
    targetRoot,
    requestPath,
    engineRoot: values.get("--engine-root"),
    today,
  };
}

export function targetProjectAuthoringUsage() {
  return [
    "Usage:",
    "  node tools/MR-0004/run-target-project-authoring.mjs --preview --target-root <path> --request <target-relative-request> [options]",
    "  node tools/MR-0004/run-target-project-authoring.mjs --create --target-root <path> --request <target-relative-request> [options]",
    "",
    "Options:",
    "  --engine-root <path>          Explicit ThreatForge engine root",
    "  --decision-date <YYYY-MM-DD>  Deterministic generated Decision date",
    "",
    "Create prints the same plan as preview and requires the exact confirmation token create.",
  ].join("\n");
}

async function main() {
  let terminal;
  try {
    const command = parseTargetProjectAuthoringArguments(process.argv.slice(2));
    if (command.mode === "help") {
      console.log(targetProjectAuthoringUsage());
      return 0;
    }
    const plan = planTargetProjectAuthoring(command);
    console.log(formatTargetProjectAuthoringPlan(plan));
    if (command.mode === "preview") {
      console.log("\nMode: preview");
      console.log("No Target Project or ThreatForge file was modified.");
      return 0;
    }

    terminal = createInterface({ input: process.stdin, output: process.stdout });
    const confirmation = String(
      await terminal.question('\nType create to confirm, or press Enter to cancel: '),
    ).trim();
    if (confirmation !== "create") {
      throw new Error('Creation cancelled: explicit confirmation "create" was not provided.');
    }
    const result = applyTargetProjectAuthoring(plan, command);
    console.log("\nMode: create");
    console.log(`Implemented requirement: ${targetProjectAuthoringRequirementId}`);
    console.log(`${result.documentType} ${result.id} created in the Target Project.`);
    console.log(`Validation: ${result.verification.status}`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(`\n${targetProjectAuthoringUsage()}`);
    return 1;
  } finally {
    terminal?.close();
  }
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) process.exitCode = await main();
