#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  createTargetProject,
  targetProjectGeneratorRequirementIds,
} from "./lib/target-project-generator.mjs";

/**
 * @file Target Project creation command-line adapter.
 *
 * @implementsRequirement MR-0004ADR-0001REQ-0001
 * @implementsRequirement MR-0004ADR-0001REQ-0002
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Maps explicit command-line input to the shared Target Project generation
 * service without owning template, validation or filesystem domain rules.
 */

function slugFromDestination(destinationRoot) {
  const basename = path.basename(path.resolve(destinationRoot));
  const slug = basename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return slug || "target-project";
}

function titleFromProjectId(projectId) {
  return projectId
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function currentUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

export function parseCreateTargetProjectArguments(args) {
  if (args.includes("--help") || args.includes("-h")) return { help: true };
  if (args.length % 2 !== 0) throw new Error("Every Target Project option requires a value.");
  const allowed = new Set([
    "--destination-root",
    "--project-id",
    "--project-title",
    "--author",
    "--decision-date",
  ]);
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const name = String(args[index]);
    const value = String(args[index + 1] ?? "").trim();
    if (!allowed.has(name)) throw new Error(`Unsupported Target Project option: ${name}`);
    if (!value) throw new Error(`${name} requires a non-empty value.`);
    if (values.has(name)) throw new Error(`Duplicate Target Project option: ${name}`);
    values.set(name, value);
  }

  const destinationRoot = values.get("--destination-root") ?? "";
  if (!destinationRoot) throw new Error("--destination-root is required.");
  const projectId = values.get("--project-id") ?? slugFromDestination(destinationRoot);
  return {
    help: false,
    destinationRoot,
    projectId,
    projectTitle: values.get("--project-title") ?? titleFromProjectId(projectId),
    author: values.get("--author") ?? "ThreatForge",
    decisionDate: values.get("--decision-date") ?? currentUtcDate(),
  };
}

export function createTargetProjectUsage() {
  return [
    "Usage:",
    "  node tools/MR-0004/create-target-project.mjs --destination-root <path> [options]",
    "",
    "Options:",
    "  --project-id <kebab-case>",
    "  --project-title <title>",
    "  --author <name>",
    "  --decision-date <YYYY-MM-DD>",
  ].join("\n");
}

async function main() {
  let options;
  try {
    options = parseCreateTargetProjectArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(createTargetProjectUsage());
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    console.log(createTargetProjectUsage());
    return;
  }

  try {
    const result = createTargetProject(options);
    console.log("Target Project creation succeeded.");
    for (const requirementId of targetProjectGeneratorRequirementIds) {
      console.log(`Implemented requirement: ${requirementId}`);
    }
    console.log(`Destination: ${result.destination_root}`);
    console.log(`Project id: ${result.project_id}`);
    console.log(`Files created: ${result.files.length}`);
    console.log(`Validation: ${result.validation.status}`);
  } catch (error) {
    console.error(`Target Project creation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === directExecutionUrl) {
  main().catch((error) => {
    console.error(`Target Project creation could not run: ${error.message}`);
    process.exitCode = 2;
  });
}
