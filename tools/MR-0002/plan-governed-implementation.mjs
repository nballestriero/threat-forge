#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file ThreatForge governed implementation artifact planner.
 *
 * @implementsRequirement MR-0002ADR-0001REQ-0001
 * @implementsRequirement MR-0002ADR-0001REQ-0001GOV-0001
 * @derivedFromDecision MR-0002/ADR-0001
 * @macroRequirement MR-0002
 *
 * This read-only command validates a governed Requirement and the minimal
 * metadata of a proposed implementation artifact, then prints a deterministic
 * plan. It never creates files, updates registries or invokes Git mutations.
 *
 * Side effects: reads Requirement registries and repository paths; writes only
 * to stdout/stderr; exits non-zero for invalid input.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_IMPLEMENTATION_PLANNER_ROOT
  ? path.resolve(process.env.TF_IMPLEMENTATION_PLANNER_ROOT)
  : path.resolve(scriptDir, "..", "..");
const requirementsDirProjectPath =
  process.env.TF_IMPLEMENTATION_PLANNER_REQUIREMENTS_DIR ??
  "docs/reference/project-model/registers/requirements";

export const artifactTypes = new Map([
  ["tool", { traceType: "tool", code: true }],
  ["source-module", { traceType: "source_module", code: true }],
  ["test", { traceType: "verification_artifact", code: true }],
  ["fixture", { traceType: "fixture", code: false }],
]);
const codeExtensions = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const fixtureExtensions = new Set([".json", ".md", ".txt", ".yaml", ".yml", ...codeExtensions]);
const requirementIdPattern = /^(MR-\d{4})(ADR-\d{4})REQ-\d{4}(?:GOV-\d{4})?$/u;

/**
 * Parses the supported command-line options.
 *
 * @param {string[]} argv - Arguments after the Node executable and script path.
 * @returns {{requirement: string, artifactType: string, title: string, projectPath: string, dryRun: boolean}}
 *   Normalized option object.
 */
function parseArguments(argv) {
  const values = {
    requirement: "",
    artifactType: "",
    title: "",
    projectPath: "",
    dryRun: false,
  };
  const valueOptions = new Map([
    ["--requirement", "requirement"],
    ["--artifact-type", "artifactType"],
    ["--title", "title"],
    ["--path", "projectPath"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") {
      values.dryRun = true;
      continue;
    }

    const field = valueOptions.get(argument);
    if (!field) throw new Error(`Unsupported argument: ${argument}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for argument: ${argument}`);
    }
    values[field] = value.trim();
    index += 1;
  }

  for (const [argument, field] of valueOptions) {
    if (!values[field]) throw new Error(`Missing required argument: ${argument}`);
  }
  if (!values.dryRun) throw new Error("Only explicit --dry-run mode is supported.");
  return values;
}

/**
 * Loads all Requirement ids declared by MR-specific governed registries.
 *
 * @returns {Set<string>} Known Requirement ids.
 */
function loadRequirementIds(baseRootDir = rootDir) {
  const requirementsDir = path.join(baseRootDir, requirementsDirProjectPath);
  if (!fs.existsSync(requirementsDir)) {
    throw new Error(`Requirement registry directory is missing: ${requirementsDirProjectPath}`);
  }

  const ids = new Set();
  for (const entry of fs.readdirSync(requirementsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/^MR-\d{4}\.requirements\.registry\.yml$/u.test(entry.name)) continue;
    const text = fs.readFileSync(path.join(requirementsDir, entry.name), "utf8").replace(/^\uFEFF/u, "");
    for (const match of text.matchAll(/^\s*-\s+id:\s*([A-Za-z0-9-]+)\s*$/gmu)) {
      ids.add(match[1]);
    }
  }
  return ids;
}

/**
 * Validates and normalizes a repository-relative proposed artifact path.
 *
 * @param {string} rawPath - User-provided path.
 * @param {{code: boolean}} artifactType - Selected artifact type contract.
 * @returns {string} Forward-slash normalized project path.
 */
function validateProjectPath(rawPath, artifactType, baseRootDir = rootDir) {
  const normalized = rawPath.replaceAll("\\", "/").trim();
  if (!normalized) throw new Error("Proposed path must not be empty.");
  if (path.isAbsolute(rawPath) || path.win32.isAbsolute(rawPath) || path.posix.isAbsolute(normalized)) {
    throw new Error("Proposed path must be relative to the repository root.");
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Proposed path must not contain empty, current-directory or parent-directory segments.");
  }
  if (segments[0] === "old") throw new Error("Proposed path must not target the legacy old/ directory.");

  const resolved = path.resolve(baseRootDir, ...segments);
  const rootPrefix = `${baseRootDir}${path.sep}`;
  if (resolved !== baseRootDir && !resolved.startsWith(rootPrefix)) {
    throw new Error("Proposed path resolves outside the repository root.");
  }

  const extension = path.posix.extname(normalized).toLowerCase();
  const allowedExtensions = artifactType.code ? codeExtensions : fixtureExtensions;
  if (!allowedExtensions.has(extension)) {
    throw new Error(`Proposed path extension is not supported for the selected artifact type: ${extension || "<none>"}`);
  }
  return normalized;
}

/**
 * Produces a deterministic verification command proposal.
 *
 * @param {string} artifactType - Canonical planner artifact type.
 * @param {string} projectPath - Validated repository-relative path.
 * @returns {string} Proposed verification command.
 */
function deriveVerificationCommand(artifactType, projectPath) {
  if (artifactType === "test") return `node --test ${projectPath}`;
  if ([".cjs", ".js", ".mjs"].includes(path.posix.extname(projectPath).toLowerCase())) {
    return `node --check ${projectPath}`;
  }
  return "node tools/repo-check.mjs";
}

/**
 * Builds a validated governed implementation plan without writing files.
 *
 * @param {{requirement: string, artifactType: string, title: string, projectPath: string, dryRun: boolean}} options
 *   Validated planning options.
 * @param {string} [baseRootDir] - Repository root used for validation.
 * @returns {{requirement: string, artifactType: string, traceType: string, title: string, projectPath: string, macroRequirementId: string, decisionId: string, decisionReference: string, verificationCommand: string}}
 *   Deterministic implementation plan.
 */
export function createGovernedImplementationPlan(options, baseRootDir = rootDir) {
  const requirementMatch = options.requirement.match(requirementIdPattern);
  if (!requirementMatch) throw new Error(`Invalid governed Requirement id: ${options.requirement}`);

  const knownRequirementIds = loadRequirementIds(baseRootDir);
  if (!knownRequirementIds.has(options.requirement)) {
    throw new Error(`Unknown governed Requirement id: ${options.requirement}`);
  }

  const artifactContract = artifactTypes.get(options.artifactType);
  if (!artifactContract) {
    throw new Error(`Unsupported artifact type: ${options.artifactType}. Supported values: ${[...artifactTypes.keys()].join(", ")}`);
  }
  if (/\r|\n/u.test(options.title)) throw new Error("Artifact title must be a single line.");

  const projectPath = validateProjectPath(options.projectPath, artifactContract, baseRootDir);
  const macroRequirementId = requirementMatch[1];
  const decisionId = requirementMatch[2];
  const decisionReference = `${macroRequirementId}/${decisionId}`;
  const verificationCommand = deriveVerificationCommand(options.artifactType, projectPath);

  return {
    requirement: options.requirement,
    artifactType: options.artifactType,
    traceType: artifactContract.traceType,
    title: options.title,
    projectPath,
    macroRequirementId,
    decisionId,
    decisionReference,
    verificationCommand,
  };
}

/**
 * Prints a validated read-only implementation plan.
 *
 * @param {ReturnType<typeof createGovernedImplementationPlan>} plan - Deterministic plan.
 * @returns {void}
 */
export function printGovernedImplementationPlan(plan) {
  console.log("Governed implementation plan");
  console.log(`Requirement: ${plan.requirement}`);
  console.log(`Macro-requirement: ${plan.macroRequirementId}`);
  console.log(`Decision: ${plan.decisionReference}`);
  console.log(`Artifact type: ${plan.artifactType}`);
  console.log(`Implementation trace artifact_type: ${plan.traceType}`);
  console.log(`Title: ${plan.title}`);
  console.log(`Proposed path: ${plan.projectPath}`);
  console.log("Planned source traceability:");
  console.log(`  @implementsRequirement ${plan.requirement}`);
  console.log(`  @derivedFromDecision ${plan.decisionReference}`);
  console.log(`  @macroRequirement ${plan.macroRequirementId}`);
  console.log(`Verification command: ${plan.verificationCommand}`);
  console.log("Mode: dry-run");
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === scriptPath;
if (isDirectExecution) {
  try {
    const options = parseArguments(process.argv.slice(2));
    printGovernedImplementationPlan(createGovernedImplementationPlan(options, rootDir));
  } catch (error) {
    console.error(`Governed implementation planning failed: ${error.message}`);
    process.exitCode = 1;
  }
}
