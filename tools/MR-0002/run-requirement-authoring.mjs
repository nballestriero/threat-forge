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

/**
 * @file Governed Requirement authoring request runner and CLI wizard.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0003
 * @implementsRequirement MR-0002ADR-0004REQ-0003GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0003GOV-0002
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Reads one IDE-independent *.requirement-authoring.yml request or collects the
 * same fields through an interactive CLI wizard. Every selectable value and
 * rule is resolved from the canonical Requirement authoring catalog. Preview is
 * read-only. Creation requires an explicit terminal confirmation, delegates the
 * document plan and transaction to the importable generator core, and executes
 * the complete ThreatForge check before the transaction is committed.
 *
 * Side effects:
 * - preview reads canonical sources and prints the complete plan only;
 * - create writes the Requirement registry record and Markdown body only after
 *   explicit confirmation and rolls both back when the post-install check fails;
 * - no commit or push is performed.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const configuredRootDir = process.env.TF_REQUIREMENT_AUTHORING_ROOT
  ? path.resolve(process.env.TF_REQUIREMENT_AUTHORING_ROOT)
  : defaultRootDir;

const requestSuffix = ".requirement-authoring.yml";
const catalogBuilderProjectPath =
  "tools/MR-0002/build-requirement-authoring-catalog.mjs";
const repoCheckProjectPath = "tools/repo-check.mjs";
const allowedRequestFields = new Set([
  "macro_requirement_id",
  "decision_id",
  "requirement_type",
  "parent_requirement_id",
  "title",
]);
const generatedRequestFields = new Set([
  "id",
  "status",
  "body_path",
]);

/** @param {unknown} value @param {string} label @returns {Record<string, unknown>} */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

/** @param {unknown} value @param {string} label @returns {unknown[]} */
function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value;
}

/** @param {unknown} value @param {string} label @returns {string} */
function requireString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}

/**
 * Resolves the repository root for one operation.
 *
 * @param {{rootDir?: string}} options - Operation options.
 * @returns {string} Absolute repository root.
 */
function resolveRootDir(options = {}) {
  return options.rootDir
    ? path.resolve(String(options.rootDir))
    : configuredRootDir;
}

/**
 * Resolves one safe repository-relative path.
 *
 * @param {string} projectPath - Repository-relative path.
 * @param {string} rootDir - Absolute repository root.
 * @returns {string} Absolute path contained by rootDir.
 */
function resolveProjectPath(projectPath, rootDir) {
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
 * Parses the explicit runner CLI contract.
 *
 * @param {string[]} argv - Arguments after the script path.
 * @returns {{mode: "preview"|"create"|"help", requestPath: string|null}}
 * Parsed command.
 */
function parseArgs(argv) {
  let preview = false;
  let create = false;
  let help = false;
  let requestPath = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--preview") {
      preview = true;
      continue;
    }
    if (arg === "--create") {
      create = true;
      continue;
    }
    if (arg === "--help") {
      help = true;
      continue;
    }
    if (arg === "--request") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--request requires a repository-relative path.");
      }
      requestPath = value;
      index += 1;
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (help) {
    if (preview || create || requestPath) {
      throw new Error("--help must be used alone.");
    }
    return { mode: "help", requestPath: null };
  }
  if (preview === create) {
    throw new Error("Exactly one mode is required: --preview or --create.");
  }
  return {
    mode: preview ? "preview" : "create",
    requestPath,
  };
}

/** @returns {string} */
function helpText() {
  return `Usage:
  node tools/MR-0002/run-requirement-authoring.mjs --preview [--request path/to/file.requirement-authoring.yml]
  node tools/MR-0002/run-requirement-authoring.mjs --create [--request path/to/file.requirement-authoring.yml]

When --request is omitted, the governed CLI wizard derives every selectable
Macro-requirement, Decision, Requirement type and parent Requirement from the
canonical authoring catalog. --preview never writes. --create prints the same
plan and asks the user to type create before the atomic write and repository
checks are executed.`;
}

/**
 * Loads the canonical authoring catalog through its governed CLI entry point.
 *
 * @param {{rootDir?: string}} [options] - Operation options.
 * @returns {Record<string, unknown>} Parsed canonical catalog.
 */
export function loadRequirementAuthoringCatalog(options = {}) {
  const rootDir = resolveRootDir(options);
  const builderPath = path.resolve(
    scriptDir,
    "build-requirement-authoring-catalog.mjs",
  );
  if (!fs.existsSync(builderPath)) {
    throw new Error(
      `Requirement authoring catalog builder is missing: ${catalogBuilderProjectPath}`,
    );
  }
  const result = spawnSync(process.execPath, [builderPath], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TF_REQUIREMENT_AUTHORING_CATALOG_ROOT: rootDir,
    },
  });
  if (result.error || result.status !== 0) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(
      `Requirement authoring catalog builder failed` +
        (diagnostics ? `: ${diagnostics}` : "."),
    );
  }
  if (String(result.stderr ?? "").trim()) {
    throw new Error(
      `Requirement authoring catalog builder emitted unexpected stderr: ${String(result.stderr).trim()}`,
    );
  }
  try {
    return requireObject(
      JSON.parse(String(result.stdout ?? "")),
      "Requirement authoring catalog",
    );
  } catch (error) {
    throw new Error(
      `Requirement authoring catalog output is not valid JSON: ${error.message}`,
    );
  }
}

/**
 * Normalizes the catalog subset required by the runner.
 *
 * @param {Record<string, unknown>} catalog - Canonical authoring catalog.
 * @returns {{types: Array<Record<string, unknown>>, macros: Array<Record<string, unknown>>}}
 * Normalized searchable catalog.
 */
function normalizeCatalog(catalog) {
  if (
    requireString(catalog.catalog_id, "catalog.catalog_id") !==
    "requirement-authoring-catalog"
  ) {
    throw new Error(`Unsupported catalog_id: ${catalog.catalog_id}`);
  }

  const types = requireArray(
    catalog.requirement_types,
    "catalog.requirement_types",
  ).map((value) => {
    const type = requireObject(value, "catalog Requirement type");
    const name = requireString(type.value, "Requirement type value");
    if (typeof type.requires_parent_requirement !== "boolean") {
      throw new Error(
        `${name}.requires_parent_requirement must be boolean.`,
      );
    }
    return {
      ...type,
      value: name,
      meaning: requireString(type.meaning, `${name}.meaning`),
      requires_parent_requirement: type.requires_parent_requirement,
      allowed_parent_requirement_types: requireArray(
        type.allowed_parent_requirement_types,
        `${name}.allowed_parent_requirement_types`,
      ).map((entry) =>
        requireString(
          entry,
          `${name}.allowed_parent_requirement_types entry`,
        ),
      ),
    };
  });

  const macros = requireArray(
    catalog.macro_requirements,
    "catalog.macro_requirements",
  ).map((value) => {
    const macro = requireObject(value, "catalog Macro-requirement");
    const macroId = requireString(macro.id, "Macro-requirement id");
    const decisions = requireArray(
      macro.decisions,
      `${macroId}.decisions`,
    ).map((decisionValue) => {
      const decision = requireObject(
        decisionValue,
        `${macroId} Decision`,
      );
      const decisionId = requireString(
        decision.id,
        `${macroId} Decision id`,
      );
      const requirements = requireArray(
        decision.requirements,
        `${macroId}/${decisionId}.requirements`,
      ).map((requirementValue) => {
        const requirement = requireObject(
          requirementValue,
          `${macroId}/${decisionId} Requirement`,
        );
        return {
          ...requirement,
          id: requireString(requirement.id, "Requirement id"),
          title: requireString(
            requirement.title,
            `${requirement.id}.title`,
          ),
          requirement_type: requireString(
            requirement.requirement_type,
            `${requirement.id}.requirement_type`,
          ),
        };
      });
      return {
        ...decision,
        id: decisionId,
        title: requireString(
          decision.title,
          `${macroId}/${decisionId}.title`,
        ),
        requirements,
      };
    });
    return {
      ...macro,
      id: macroId,
      title: requireString(macro.title, `${macroId}.title`),
      decisions,
    };
  });

  return { types, macros };
}

/**
 * Validates one authoring request against the canonical catalog.
 *
 * @param {Record<string, unknown>} request - Parsed request mapping.
 * @param {Record<string, unknown>} catalog - Canonical authoring catalog.
 * @returns {{macroRequirementId: string, decisionId: string, requirementType: string, parentRequirementId: string|null, title: string}}
 * Canonical request.
 */
export function validateRequirementAuthoringRequest(request, catalog) {
  const input = requireObject(request, "Requirement authoring request");
  const keys = Object.keys(input);

  for (const key of keys) {
    if (generatedRequestFields.has(key)) {
      throw new Error(
        `Requirement authoring request must not declare generated field ${key}.`,
      );
    }
    if (!allowedRequestFields.has(key)) {
      throw new Error(
        `Requirement authoring request contains unsupported field ${key}.`,
      );
    }
  }

  const normalizedCatalog = normalizeCatalog(
    requireObject(catalog, "Requirement authoring catalog"),
  );
  const macroRequirementId = requireString(
    input.macro_requirement_id,
    "macro_requirement_id",
  );
  const decisionId = requireString(input.decision_id, "decision_id");
  const requirementTypeName = requireString(
    input.requirement_type,
    "requirement_type",
  );
  const title = requireString(input.title, "title");

  if (/\r|\n/u.test(title)) {
    throw new Error("title must be a single line.");
  }

  const macro = normalizedCatalog.macros.find(
    (entry) => entry.id === macroRequirementId,
  );
  if (!macro) {
    throw new Error(
      `Unknown canonical Macro-requirement: ${macroRequirementId}`,
    );
  }

  const decision = macro.decisions.find(
    (entry) => entry.id === decisionId,
  );
  if (!decision) {
    throw new Error(
      `Decision ${decisionId} does not belong to ${macroRequirementId}.`,
    );
  }

  const requirementType = normalizedCatalog.types.find(
    (entry) => entry.value === requirementTypeName,
  );
  if (!requirementType) {
    throw new Error(
      `Unknown or abstract canonical requirement_type: ${requirementTypeName}`,
    );
  }

  const parentValue = input.parent_requirement_id;
  if (!requirementType.requires_parent_requirement) {
    if (Object.prototype.hasOwnProperty.call(input, "parent_requirement_id")) {
      throw new Error(
        `${requirementTypeName} must not declare parent_requirement_id.`,
      );
    }
    return {
      macroRequirementId,
      decisionId,
      requirementType: requirementTypeName,
      parentRequirementId: null,
      title,
    };
  }

  const parentRequirementId = requireString(
    parentValue,
    `parent_requirement_id for ${requirementTypeName}`,
  );
  const parent = decision.requirements.find(
    (entry) => entry.id === parentRequirementId,
  );
  if (!parent) {
    throw new Error(
      `Parent Requirement ${parentRequirementId} does not belong to ${macroRequirementId}/${decisionId}.`,
    );
  }
  if (
    !requirementType.allowed_parent_requirement_types.includes(
      parent.requirement_type,
    )
  ) {
    throw new Error(
      `${requirementTypeName} cannot use parent type ${parent.requirement_type}; allowed: ${requirementType.allowed_parent_requirement_types.join(", ")}`,
    );
  }

  return {
    macroRequirementId,
    decisionId,
    requirementType: requirementTypeName,
    parentRequirementId,
    title,
  };
}

/**
 * Reads one repository-local authoring request file.
 *
 * @param {string} requestProjectPath - Repository-relative request path.
 * @param {{rootDir?: string}} [options] - Operation options.
 * @returns {Record<string, unknown>} Parsed request mapping.
 */
export function readRequirementAuthoringRequest(
  requestProjectPath,
  options = {},
) {
  const normalizedPath = String(requestProjectPath ?? "")
    .replaceAll("\\", "/")
    .trim();
  if (!normalizedPath.endsWith(requestSuffix)) {
    throw new Error(
      `Requirement authoring request path must end with ${requestSuffix}.`,
    );
  }

  const rootDir = resolveRootDir(options);
  const absolutePath = resolveProjectPath(normalizedPath, rootDir);
  return requireObject(
    readGovernedYamlFile(absolutePath),
    normalizedPath,
  );
}

/**
 * Builds the canonical generator plan for one request.
 *
 * @param {Record<string, unknown>} request - Authoring request.
 * @param {Record<string, unknown>} catalog - Canonical authoring catalog.
 * @param {{rootDir?: string, mode?: "preview"|"create"}} [options] - Planning options.
 * @returns {{request: ReturnType<typeof validateRequirementAuthoringRequest>, documentPlan: ReturnType<typeof planGeneratedDocument>}}
 * Complete authoring plan.
 */
export function planRequirementAuthoring(
  request,
  catalog,
  options = {},
) {
  const canonicalRequest = validateRequirementAuthoringRequest(
    request,
    catalog,
  );
  const mode = options.mode ?? "preview";
  if (mode !== "preview" && mode !== "create") {
    throw new Error(`Unsupported Requirement authoring mode: ${mode}`);
  }

  const generatorArgs = {
    "requirement-type": canonicalRequest.requirementType,
    mr: canonicalRequest.macroRequirementId,
    title: canonicalRequest.title,
    "dry-run": mode === "preview",
  };
  if (canonicalRequest.parentRequirementId) {
    generatorArgs.parent = canonicalRequest.parentRequirementId;
  } else {
    generatorArgs.adr = canonicalRequest.decisionId;
  }

  return {
    request: canonicalRequest,
    documentPlan: planGeneratedDocument(generatorArgs, {
      rootDir: resolveRootDir(options),
    }),
  };
}

/**
 * Selects one catalog entry through a numeric terminal choice.
 *
 * @param {string} label - Selection label.
 * @param {Array<{label: string, value: unknown}>} choices - Available choices.
 * @param {(question: string) => Promise<string>} ask - Prompt function.
 * @param {(line: string) => void} write - Output function.
 * @returns {Promise<unknown>} Selected value.
 */
async function selectChoice(label, choices, ask, write) {
  if (choices.length === 0) {
    throw new Error(`${label} has no canonical selectable value.`);
  }
  write(`\n${label}:`);
  choices.forEach((choice, index) => {
    write(`  ${index + 1}. ${choice.label}`);
  });
  const answer = String(
    await ask(`Select ${label} [1-${choices.length}]: `),
  ).trim();
  if (!/^\d+$/u.test(answer)) {
    throw new Error(`${label} selection must be a number.`);
  }
  const selectedIndex = Number.parseInt(answer, 10) - 1;
  if (selectedIndex < 0 || selectedIndex >= choices.length) {
    throw new Error(`${label} selection is outside the available range.`);
  }
  return choices[selectedIndex].value;
}

/**
 * Collects one request through the canonical CLI wizard.
 *
 * @param {Record<string, unknown>} catalog - Canonical authoring catalog.
 * @param {{ask: (question: string) => Promise<string>, write?: (line: string) => void}} io - Prompt adapter.
 * @returns {Promise<Record<string, unknown>>} Request mapping.
 */
export async function collectInteractiveRequirementAuthoringRequest(
  catalog,
  io,
) {
  if (!io || typeof io.ask !== "function") {
    throw new Error("Interactive authoring requires an ask function.");
  }
  const write = typeof io.write === "function"
    ? io.write
    : (line) => console.log(line);
  const normalizedCatalog = normalizeCatalog(
    requireObject(catalog, "Requirement authoring catalog"),
  );

  const macro = await selectChoice(
    "Macro-requirement",
    normalizedCatalog.macros.map((entry) => ({
      label: `${entry.id} — ${entry.title}`,
      value: entry,
    })),
    io.ask,
    write,
  );
  const decision = await selectChoice(
    "Decision",
    macro.decisions.map((entry) => ({
      label: `${entry.id} — ${entry.title}`,
      value: entry,
    })),
    io.ask,
    write,
  );
  const requirementType = await selectChoice(
    "Requirement type",
    normalizedCatalog.types.map((entry) => ({
      label: `${entry.value} — ${entry.meaning}`,
      value: entry,
    })),
    io.ask,
    write,
  );

  let parentRequirementId;
  if (requirementType.requires_parent_requirement) {
    const candidates = decision.requirements.filter((entry) =>
      requirementType.allowed_parent_requirement_types.includes(
        entry.requirement_type,
      ),
    );
    const parent = await selectChoice(
      "Parent Requirement",
      candidates.map((entry) => ({
        label: `${entry.id} — ${entry.title}`,
        value: entry,
      })),
      io.ask,
      write,
    );
    parentRequirementId = parent.id;
  }

  const title = requireString(await io.ask("Requirement title: "), "title");
  const request = {
    macro_requirement_id: macro.id,
    decision_id: decision.id,
    requirement_type: requirementType.value,
    title,
  };
  if (parentRequirementId) {
    request.parent_requirement_id = parentRequirementId;
  }
  validateRequirementAuthoringRequest(request, catalog);
  return request;
}

/**
 * Formats the complete generated plan for preview and confirmation.
 *
 * @param {{request: ReturnType<typeof validateRequirementAuthoringRequest>, documentPlan: ReturnType<typeof planGeneratedDocument>}} authoringPlan - Plan.
 * @returns {string} Human-readable plan.
 */
export function formatRequirementAuthoringPlan(authoringPlan) {
  const plan = requireObject(authoringPlan, "Requirement authoring plan");
  const request = requireObject(plan.request, "Requirement authoring plan request");
  const documentPlan = requireObject(
    plan.documentPlan,
    "Requirement authoring document plan",
  );
  return [
    "Governed Requirement authoring planned.",
    `Macro-requirement: ${request.macroRequirementId}`,
    `Decision: ${request.decisionId}`,
    `Requirement type: ${request.requirementType}`,
    ...(request.parentRequirementId
      ? [`Parent Requirement: ${request.parentRequirementId}`]
      : []),
    `ID: ${documentPlan.id}`,
    `Registry: ${documentPlan.registryPath}`,
    `Body: ${documentPlan.bodyPath}`,
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

/**
 * Runs the canonical complete repository check.
 *
 * @param {string} rootDir - Repository root.
 * @returns {{stdout: string, stderr: string}} Check output.
 */
function runRepositoryCheck(rootDir) {
  const checkPath = resolveProjectPath(repoCheckProjectPath, rootDir);
  if (!fs.existsSync(checkPath)) {
    throw new Error(
      `Post-creation ThreatForge check is missing: ${repoCheckProjectPath}`,
    );
  }
  const result = spawnSync(process.execPath, [checkPath], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TF_AUTHORING_ROOT: rootDir,
      TF_REQUIREMENT_AUTHORING_ROOT: rootDir,
      TF_REQUIREMENT_AUTHORING_CATALOG_ROOT: rootDir,
      TF_REQUIREMENT_AUTHORING_SCHEMA_ROOT: rootDir,
      TF_REQUIREMENT_AUTHORING_MATERIALIZER_ROOT: rootDir,
      TF_VSCODE_REQUIREMENT_AUTHORING_ADAPTER_ROOT: rootDir,
    },
  });
  if (result.error || result.status !== 0) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(
      `Post-creation ThreatForge check failed` +
        (diagnostics ? `:\n${diagnostics}` : "."),
    );
  }
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * Applies one confirmed authoring plan and verifies it before commit.
 *
 * @param {{request: ReturnType<typeof validateRequirementAuthoringRequest>, documentPlan: ReturnType<typeof planGeneratedDocument>}} authoringPlan - Plan.
 * @param {{rootDir?: string, verify?: (plan: Record<string, unknown>) => unknown}} [options] - Apply options.
 * @returns {{id: string, registryPath: string, bodyPath: string, verification: unknown}}
 * Applied and verified document.
 */
export function applyRequirementAuthoring(authoringPlan, options = {}) {
  const plan = requireObject(authoringPlan, "Requirement authoring plan");
  const documentPlan = requireObject(
    plan.documentPlan,
    "Requirement authoring document plan",
  );
  const rootDir = resolveRootDir(options);
  let verification;

  const applied = applyGeneratedDocument(documentPlan, {
    rootDir,
    afterInstall: () => {
      verification = typeof options.verify === "function"
        ? options.verify(plan)
        : runRepositoryCheck(rootDir);
    },
  });

  return {
    ...applied,
    verification,
  };
}

/** @returns {Promise<number>} */
async function main() {
  let terminal;
  try {
    const command = parseArgs(process.argv.slice(2));
    if (command.mode === "help") {
      console.log(helpText());
      return 0;
    }

    const catalog = loadRequirementAuthoringCatalog();
    let request;
    if (command.requestPath) {
      request = readRequirementAuthoringRequest(command.requestPath);
    } else {
      terminal = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      request = await collectInteractiveRequirementAuthoringRequest(
        catalog,
        {
          ask: (question) => terminal.question(question),
          write: (line) => console.log(line),
        },
      );
    }

    const authoringPlan = planRequirementAuthoring(
      request,
      catalog,
      { mode: command.mode },
    );
    console.log(formatRequirementAuthoringPlan(authoringPlan));

    if (command.mode === "preview") {
      console.log("\nMode: preview");
      console.log("No repository file was modified.");
      return 0;
    }

    if (!terminal) {
      terminal = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    }
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

    const result = applyRequirementAuthoring(authoringPlan);
    const verification = result.verification &&
      typeof result.verification === "object"
      ? result.verification
      : {};
    const stdout = String(verification.stdout ?? "").trimEnd();
    const stderr = String(verification.stderr ?? "").trimEnd();
    if (stdout) {
      console.log("\n" + stdout);
    }
    if (stderr) {
      console.error("\n" + stderr);
    }
    console.log("\nMode: create");
    console.log("Governed Requirement created and verified.");
    return 0;
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    console.error("\n" + helpText());
    return 1;
  } finally {
    terminal?.close();
  }
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === directExecutionUrl) {
  process.exitCode = await main();
}
