#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Governed documentation authoring generator.
 *
 * @implementsRequirement MR-0001ADR-0005REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0005
 * @macroRequirement MR-0001
 *
 * This CLI creates governed requirement body files and matching requirement
 * registry records from a small set of author-provided inputs. The registry
 * remains the canonical structured source for the title; the generated body
 * repeats the identifier and title in its H1 so later checks can validate that
 * body and registry remain coherent.
 *
 * Side effects: in normal mode, appends one record to the selected MR
 * requirements registry and creates one governed Markdown body file. In
 * --dry-run mode, prints the planned record and body path without writing.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_AUTHORING_ROOT
  ? path.resolve(process.env.TF_AUTHORING_ROOT)
  : defaultRootDir;

const requirementsRegistryPattern =
  "docs/reference/project-model/registers/requirements/{MR}.requirements.registry.yml";
const requirementsBodyPattern =
  "docs/reference/project-model/body/requirements/{MR}/{ID}_body.md";

/**
 * Displays command usage.
 *
 * @returns {string} Help text.
 */
function helpText() {
  return `Usage:
  node tools/MR-0001/create-governed-document.mjs \\
    --kind functional-requirement \\
    --mr MR-0001 \\
    --adr ADR-0005 \\
    --title "Titolo del requisito" [--dry-run]

  node tools/MR-0001/create-governed-document.mjs \\
    --kind governance-requirement \\
    --mr MR-0001 \\
    --parent MR-0001ADR-0005REQ-0001 \\
    --title "Titolo del requisito GOV" [--dry-run]

Supported kinds:
  functional-requirement, requirement, req
  governance-requirement, governance, gov

The generator currently targets the governed requirements registry model.
It creates deterministic IDs, appends the registry record and creates the
matching Markdown body with an H1 derived from the generated ID and title.`;
}

/**
 * Parses command line arguments as --key value / --flag pairs.
 *
 * @param {string[]} args - Raw process arguments after node and script path.
 * @returns {Record<string, string|boolean>} Parsed argument map.
 */
function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
    const key = arg.slice(2);
    if (key === "dry-run" || key === "help") {
      parsed[key] = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

/**
 * Normalizes path separators to repository-stable forward slashes.
 *
 * @param {string|null|undefined} value - Path-like text.
 * @returns {string} Normalized path text.
 */
function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Resolves a repository-relative path against the repository root.
 *
 * @param {string} projectPath - Repository-relative path.
 * @returns {string} Absolute path.
 */
function resolveProjectPath(projectPath) {
  return path.join(rootDir, normalizeProjectPath(projectPath));
}

/**
 * Reads UTF-8 text while removing a possible byte-order mark.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {string} File text.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
}

/**
 * Writes UTF-8 text after ensuring the parent directory exists.
 *
 * @param {string} filePath - Absolute file path.
 * @param {string} text - Text to write.
 * @returns {void}
 */
function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

/**
 * Escapes a string for use inside a regular expression.
 *
 * @param {string} value - Raw text.
 * @returns {string} Escaped regular expression text.
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Formats a string as a safe double-quoted YAML scalar.
 *
 * @param {string} value - Raw scalar text.
 * @returns {string} YAML scalar.
 */
function yamlString(value) {
  return JSON.stringify(String(value));
}

/**
 * Normalizes generator kind aliases to canonical kind values.
 *
 * @param {string} value - User-provided kind.
 * @returns {"functional-requirement"|"governance-requirement"} Canonical kind.
 */
function normalizeKind(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["functional-requirement", "requirement", "req", "functional"].includes(normalized)) {
    return "functional-requirement";
  }
  if (["governance-requirement", "governance", "gov", "specialized"].includes(normalized)) {
    return "governance-requirement";
  }
  throw new Error(`Unsupported --kind value: ${value}`);
}

/**
 * Extracts requirement-like records from the current YAML registry text.
 *
 * @param {string} registryText - Requirements registry YAML text.
 * @returns {Array<Record<string, string>>} Parsed shallow records.
 */
function parseRequirementRecords(registryText) {
  const records = [];
  const matches = registryText.matchAll(/^  - id: ([^\n]+)([\s\S]*?)(?=^  - id: |\s*$)/gmu);
  for (const match of matches) {
    const record = { id: match[1].trim().replace(/^['"]|['"]$/gu, "") };
    const block = match[2] ?? "";
    for (const line of block.split("\n")) {
      const field = line.match(/^    ([a-zA-Z0-9_]+):\s*(.*)$/u);
      if (field) {
        record[field[1]] = field[2].trim().replace(/^['"]|['"]$/gu, "");
      }
    }
    records.push(record);
  }
  return records;
}

/**
 * Finds the next numeric suffix for records matching a deterministic prefix.
 *
 * @param {Array<Record<string, string>>} records - Existing requirement records.
 * @param {string} prefix - ID prefix before the four-digit counter.
 * @returns {string} Next four-digit suffix.
 */
function nextFourDigitSuffix(records, prefix) {
  const expression = new RegExp(`^${escapeRegExp(prefix)}(\\d{4})$`, "u");
  let maximum = 0;
  for (const record of records) {
    const match = String(record.id ?? "").match(expression);
    if (match) maximum = Math.max(maximum, Number.parseInt(match[1], 10));
  }
  return String(maximum + 1).padStart(4, "0");
}

/**
 * Builds a repository-relative requirements registry path for the MR.
 *
 * @param {string} mrId - Macro-requirement identifier.
 * @returns {string} Repository-relative registry path.
 */
function buildRequirementsRegistryPath(mrId) {
  return requirementsRegistryPattern.replaceAll("{MR}", mrId);
}

/**
 * Builds a repository-relative requirement body path.
 *
 * @param {string} mrId - Macro-requirement identifier.
 * @param {string} id - Generated requirement identifier.
 * @returns {string} Repository-relative body path.
 */
function buildRequirementBodyPath(mrId, id) {
  return requirementsBodyPattern.replaceAll("{MR}", mrId).replaceAll("{ID}", id);
}

/**
 * Creates the next functional requirement ID for a MR/ADR pair.
 *
 * @param {Array<Record<string, string>>} records - Existing records.
 * @param {string} mrId - Macro-requirement identifier.
 * @param {string} adrId - Decision identifier.
 * @returns {string} Generated requirement ID.
 */
function buildFunctionalRequirementId(records, mrId, adrId) {
  const prefix = `${mrId}${adrId}REQ-`;
  return `${prefix}${nextFourDigitSuffix(records, prefix)}`;
}

/**
 * Creates the next governance requirement ID for a parent requirement.
 *
 * @param {Array<Record<string, string>>} records - Existing records.
 * @param {string} parentId - Parent requirement identifier.
 * @returns {string} Generated governance requirement ID.
 */
function buildGovernanceRequirementId(records, parentId) {
  const prefix = `${parentId}GOV-`;
  return `${prefix}${nextFourDigitSuffix(records, prefix)}`;
}

/**
 * Builds a YAML record for a generated functional requirement.
 *
 * @param {{id: string, title: string, mrId: string, bodyPath: string}} input - Record data.
 * @returns {string} YAML block.
 */
function buildFunctionalRequirementRecord(input) {
  return [
    `  - id: ${input.id}`,
    `    title: ${yamlString(input.title)}`,
    "    status: draft",
    "    requirement_type: functional",
    `    macro_requirement_id: ${input.mrId}`,
    `    body_path: ${input.bodyPath}`,
    "",
  ].join("\n");
}

/**
 * Builds a YAML record for a generated governance requirement.
 *
 * @param {{id: string, title: string, mrId: string, parentId: string, bodyPath: string}} input - Record data.
 * @returns {string} YAML block.
 */
function buildGovernanceRequirementRecord(input) {
  return [
    `  - id: ${input.id}`,
    `    title: ${yamlString(input.title)}`,
    "    status: draft",
    "    requirement_type: governance",
    `    macro_requirement_id: ${input.mrId}`,
    `    parent_requirement_id: ${input.parentId}`,
    `    body_path: ${input.bodyPath}`,
    "",
  ].join("\n");
}

/**
 * Builds the Markdown body template for a generated functional requirement.
 *
 * @param {{id: string, title: string}} input - Body data.
 * @returns {string} Markdown body text.
 */
function buildFunctionalRequirementBody(input) {
  return `# ${input.id} — ${input.title}

## Intento

TODO: descrivere perche questo requisito esiste e quale problema risolve.

## Obbligo funzionale

TODO: descrivere l'obbligo funzionale in modo piccolo, verificabile e non ambiguo.

## Ambito

TODO: indicare cosa e incluso e cosa e escluso.

## Acceptance

TODO: indicare le condizioni minime per considerare soddisfatto il requisito.
`;
}

/**
 * Builds the Markdown body template for a generated governance requirement.
 *
 * @param {{id: string, title: string, parentId: string}} input - Body data.
 * @returns {string} Markdown body text.
 */
function buildGovernanceRequirementBody(input) {
  return `# ${input.id} — ${input.title}

## Intento

TODO: descrivere quale proprieta governata deve essere garantita per ${input.parentId}.

## Obbligo di governance

TODO: descrivere la regola verificabile che specializza il requisito padre.

## Controlli minimi

TODO: indicare i controlli deterministici minimi richiesti.

## Failure mode

TODO: indicare quando il controllo deve fallire e quando puo produrre solo warning.
`;
}

/**
 * Appends a generated record to the requirements registry text.
 *
 * @param {string} registryText - Existing registry text.
 * @param {string} recordBlock - YAML record block to append.
 * @returns {string} Updated registry text.
 */
function appendRequirementRecord(registryText, recordBlock) {
  const trimmed = registryText.replace(/\s*$/u, "\n");
  if (!/^requirements:\s*$/mu.test(trimmed)) {
    throw new Error("Requirements registry does not contain a requirements: section.");
  }
  return `${trimmed}${recordBlock}`;
}

/**
 * Validates required common authoring arguments.
 *
 * @param {Record<string, string|boolean>} args - Parsed argument map.
 * @returns {{kind: "functional-requirement"|"governance-requirement", mrId: string, title: string, dryRun: boolean}} Common authoring data.
 */
function readCommonInput(args) {
  const kind = normalizeKind(String(args.kind ?? ""));
  const mrId = String(args.mr ?? "").trim();
  const title = String(args.title ?? "").trim();
  const dryRun = Boolean(args["dry-run"]);

  if (!/^MR-\d{4}$/u.test(mrId)) throw new Error("--mr must look like MR-0001.");
  if (!title) throw new Error("--title is required.");
  if (/\n/u.test(title)) throw new Error("--title must be a single line.");

  return { kind, mrId, title, dryRun };
}

/**
 * Creates a planned generated document without writing it yet.
 *
 * @param {Record<string, string|boolean>} args - Parsed argument map.
 * @returns {{id: string, bodyPath: string, registryPath: string, recordBlock: string, bodyText: string, kind: string}} Planned document.
 */
function planGeneratedDocument(args) {
  const { kind, mrId, title } = readCommonInput(args);
  const registryPath = buildRequirementsRegistryPath(mrId);
  const registryAbsolutePath = resolveProjectPath(registryPath);

  if (!fs.existsSync(registryAbsolutePath)) {
    throw new Error(`Requirements registry not found: ${registryPath}`);
  }

  const registryText = readText(registryAbsolutePath);
  const records = parseRequirementRecords(registryText);

  if (kind === "functional-requirement") {
    const adrId = String(args.adr ?? "").trim();
    if (!/^ADR-\d{4}$/u.test(adrId)) throw new Error("--adr must look like ADR-0005.");
    const id = buildFunctionalRequirementId(records, mrId, adrId);
    const bodyPath = buildRequirementBodyPath(mrId, id);
    return {
      id,
      kind,
      bodyPath,
      registryPath,
      recordBlock: buildFunctionalRequirementRecord({ id, title, mrId, bodyPath }),
      bodyText: buildFunctionalRequirementBody({ id, title }),
    };
  }

  const parentId = String(args.parent ?? "").trim();
  if (!parentId) throw new Error("--parent is required for governance requirements.");
  const parent = records.find((record) => record.id === parentId);
  if (!parent) throw new Error(`Parent requirement not found in ${registryPath}: ${parentId}`);
  const id = buildGovernanceRequirementId(records, parentId);
  const bodyPath = buildRequirementBodyPath(mrId, id);
  return {
    id,
    kind,
    bodyPath,
    registryPath,
    recordBlock: buildGovernanceRequirementRecord({ id, title, mrId, parentId, bodyPath }),
    bodyText: buildGovernanceRequirementBody({ id, title, parentId }),
  };
}

/**
 * Writes a generated governed document and its registry record.
 *
 * @param {{id: string, bodyPath: string, registryPath: string, recordBlock: string, bodyText: string}} plan - Planned document.
 * @returns {void}
 */
function applyGeneratedDocument(plan) {
  const registryAbsolutePath = resolveProjectPath(plan.registryPath);
  const bodyAbsolutePath = resolveProjectPath(plan.bodyPath);

  if (fs.existsSync(bodyAbsolutePath)) {
    throw new Error(`Body already exists and will not be overwritten: ${plan.bodyPath}`);
  }

  const registryText = readText(registryAbsolutePath);
  if (registryText.includes(`id: ${plan.id}`)) {
    throw new Error(`Generated id already exists in registry: ${plan.id}`);
  }

  writeText(registryAbsolutePath, appendRequirementRecord(registryText, plan.recordBlock));
  writeText(bodyAbsolutePath, plan.bodyText);
}

/**
 * Runs the authoring generator command.
 *
 * @returns {number} Process exit code.
 */
function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log(helpText());
      return 0;
    }

    const { dryRun } = readCommonInput(args);
    const plan = planGeneratedDocument(args);

    console.log("Governed document generation planned.");
    console.log(`Kind: ${plan.kind}`);
    console.log(`ID: ${plan.id}`);
    console.log(`Registry: ${plan.registryPath}`);
    console.log(`Body: ${plan.bodyPath}`);

    if (dryRun) {
      console.log("Mode: dry-run");
      console.log("\nRegistry record:\n");
      console.log(plan.recordBlock.trimEnd());
      console.log("\nBody preview:\n");
      console.log(plan.bodyText.trimEnd());
      return 0;
    }

    applyGeneratedDocument(plan);
    console.log("Mode: write");
    console.log("Governed document generated.");
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("\n" + helpText());
    return 1;
  }
}

process.exitCode = main();
