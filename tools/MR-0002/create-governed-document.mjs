#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  loadDocumentationFieldValueCatalog,
  resolveDocumentationFieldValue,
} from "../MR-0001/lib/documentation-field-values.mjs";
import { readGovernedYamlFile } from "../MR-0001/lib/governed-yaml.mjs";

/**
 * @file Governed documentation authoring generator.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0003
 * @implementsRequirement MR-0002ADR-0004REQ-0003GOV-0002
 * @implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @implementationStatus implemented
 * @macroRequirement MR-0002
 *
 * Plans and atomically applies one governed Requirement registry record and
 * matching Markdown body. The planning and application functions are
 * importable by IDE-independent authoring consumers, while direct execution
 * preserves the existing CLI contract.
 *
 * Side effects:
 * - planGeneratedDocument reads canonical registries and taxonomies only;
 * - applyGeneratedDocument replaces the registry and creates the body as one
 *   rollback-capable transaction;
 * - direct CLI execution writes only when --dry-run is absent.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const configuredRootDir = process.env.TF_AUTHORING_ROOT
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
  node tools/MR-0002/create-governed-document.mjs \\
    --requirement-type functional \\
    --mr MR-0002 \\
    --adr ADR-0004 \\
    --title "Titolo del requisito" [--dry-run]

  node tools/MR-0002/create-governed-document.mjs \\
    --requirement-type governance \\
    --mr MR-0002 \\
    --parent MR-0002ADR-0004REQ-0001 \\
    --title "Titolo del requisito GOV" [--dry-run]

Requirement types and lifecycle values are resolved from:
  docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml

The generator creates deterministic IDs, appends the governed registry record
and creates the matching Markdown body with an H1 derived from the generated
identifier and title.`;
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
 * Requires a non-array object.
 *
 * @param {unknown} value - Candidate value.
 * @param {string} label - Diagnostic label.
 * @returns {Record<string, unknown>} Object value.
 */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value;
}

/**
 * Requires an array.
 *
 * @param {unknown} value - Candidate value.
 * @param {string} label - Diagnostic label.
 * @returns {Array<unknown>} Array value.
 */
function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value;
}

/**
 * Requires a non-empty string.
 *
 * @param {unknown} value - Candidate value.
 * @param {string} label - Diagnostic label.
 * @returns {string} Normalized string.
 */
function requireString(value, label) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return normalized;
}

/**
 * Requires non-empty text while preserving its original whitespace.
 *
 * @param {unknown} value - Candidate text.
 * @param {string} label - Diagnostic label.
 * @returns {string} Original text.
 */
function requireText(value, label) {
  const text = String(value ?? "");

  if (!text.trim()) {
    throw new Error(`${label} must be non-empty text.`);
  }

  return text;
}

/**
 * Resolves the root used by one planning or application call.
 *
 * @param {{rootDir?: string}} options - Optional operation settings.
 * @returns {string} Absolute root directory.
 */
function resolveRootDir(options = {}) {
  return options.rootDir
    ? path.resolve(String(options.rootDir))
    : configuredRootDir;
}

/**
 * Normalizes and validates one repository-relative path.
 *
 * @param {string} projectPath - Repository-relative path.
 * @param {string} operationRoot - Absolute operation root.
 * @returns {string} Absolute path contained by operationRoot.
 */
function resolveProjectPath(projectPath, operationRoot) {
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

  const absolutePath = path.resolve(operationRoot, ...segments);
  const relativePath = path.relative(operationRoot, absolutePath);

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
 * Reads UTF-8 text while removing a possible byte-order mark.
 *
 * @param {typeof fs} fileSystem - File-system implementation.
 * @param {string} filePath - Absolute file path.
 * @returns {string} File text.
 */
function readText(fileSystem, filePath) {
  return fileSystem
    .readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/u, "");
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
 * Finds the next numeric suffix for records matching a deterministic prefix.
 *
 * @param {Array<Record<string, unknown>>} records - Existing Requirement records.
 * @param {string} prefix - ID prefix before the four-digit counter.
 * @returns {string} Next four-digit suffix.
 */
function nextFourDigitSuffix(records, prefix) {
  const expression = new RegExp(
    `^${escapeRegExp(prefix)}(\\d{4})$`,
    "u",
  );
  let maximum = 0;

  for (const record of records) {
    const match = String(record.id ?? "").match(expression);

    if (match) {
      maximum = Math.max(
        maximum,
        Number.parseInt(match[1], 10),
      );
    }
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
 * Builds a repository-relative Requirement body path.
 *
 * @param {string} mrId - Macro-requirement identifier.
 * @param {string} id - Generated Requirement identifier.
 * @returns {string} Repository-relative body path.
 */
function buildRequirementBodyPath(mrId, id) {
  return requirementsBodyPattern
    .replaceAll("{MR}", mrId)
    .replaceAll("{ID}", id);
}

/**
 * Creates the next functional Requirement ID for an MR/ADR pair.
 *
 * @param {Array<Record<string, unknown>>} records - Existing records.
 * @param {string} mrId - Macro-requirement identifier.
 * @param {string} adrId - Decision identifier.
 * @returns {string} Generated Requirement ID.
 */
function buildFunctionalRequirementId(records, mrId, adrId) {
  const prefix = `${mrId}${adrId}REQ-`;
  return `${prefix}${nextFourDigitSuffix(records, prefix)}`;
}

/**
 * Creates the next governance Requirement ID for a parent Requirement.
 *
 * @param {Array<Record<string, unknown>>} records - Existing records.
 * @param {string} parentId - Parent Requirement identifier.
 * @returns {string} Generated governance Requirement ID.
 */
function buildGovernanceRequirementId(records, parentId) {
  const prefix = `${parentId}GOV-`;
  return `${prefix}${nextFourDigitSuffix(records, prefix)}`;
}

/**
 * Builds a YAML record for a generated functional Requirement.
 *
 * @param {{id: string, title: string, mrId: string, bodyPath: string, status: string, requirementType: string}} input - Record data.
 * @returns {string} YAML block.
 */
function buildFunctionalRequirementRecord(input) {
  return [
    `  - id: ${input.id}`,
    `    title: ${yamlString(input.title)}`,
    `    status: ${input.status}`,
    `    requirement_type: ${input.requirementType}`,
    `    macro_requirement_id: ${input.mrId}`,
    `    body_path: ${input.bodyPath}`,
    "",
  ].join("\n");
}

/**
 * Builds a YAML record for a generated governance Requirement.
 *
 * @param {{id: string, title: string, mrId: string, parentId: string, bodyPath: string, status: string, requirementType: string}} input - Record data.
 * @returns {string} YAML block.
 */
function buildGovernanceRequirementRecord(input) {
  return [
    `  - id: ${input.id}`,
    `    title: ${yamlString(input.title)}`,
    `    status: ${input.status}`,
    `    requirement_type: ${input.requirementType}`,
    `    macro_requirement_id: ${input.mrId}`,
    `    parent_requirement_id: ${input.parentId}`,
    `    body_path: ${input.bodyPath}`,
    "",
  ].join("\n");
}

/**
 * Builds the Markdown body template for a generated functional Requirement.
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
 * Builds the Markdown body template for a generated governance Requirement.
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
    throw new Error(
      "Requirements registry does not contain a requirements: section.",
    );
  }

  return `${trimmed}${recordBlock}`;
}

/**
 * Validates required common authoring arguments.
 *
 * @param {Record<string, string|boolean>} args - Parsed argument map.
 * @returns {{requirementTypeValue: string, mrId: string, title: string, dryRun: boolean}} Common authoring data.
 */
function readCommonInput(args) {
  if (args.kind !== undefined) {
    throw new Error(
      "--kind is not supported; use --requirement-type with a canonical value.",
    );
  }

  const requirementTypeValue = String(
    args["requirement-type"] ?? "",
  ).trim();
  const mrId = String(args.mr ?? "").trim();
  const title = String(args.title ?? "").trim();
  const dryRun = Boolean(args["dry-run"]);

  if (!requirementTypeValue) {
    throw new Error("--requirement-type is required.");
  }

  if (!/^MR-\d{4}$/u.test(mrId)) {
    throw new Error("--mr must look like MR-0001.");
  }

  if (!title) {
    throw new Error("--title is required.");
  }

  if (/\n/u.test(title)) {
    throw new Error("--title must be a single line.");
  }

  return {
    requirementTypeValue,
    mrId,
    title,
    dryRun,
  };
}

/**
 * Creates a deterministic governed document plan without writing.
 *
 * @param {Record<string, string|boolean>} args - Canonical generator arguments.
 * @param {{rootDir?: string}} [options] - Optional repository root override.
 * @returns {{id: string, requirementType: string, dryRun: boolean, bodyPath: string, registryPath: string, recordBlock: string, bodyText: string}} Planned document.
 */
export function planGeneratedDocument(args, options = {}) {
  const {
    requirementTypeValue,
    mrId,
    title,
    dryRun,
  } = readCommonInput(args);
  const operationRoot = resolveRootDir(options);
  const registryPath = buildRequirementsRegistryPath(mrId);
  const registryAbsolutePath = resolveProjectPath(
    registryPath,
    operationRoot,
  );

  if (!fs.existsSync(registryAbsolutePath)) {
    throw new Error(
      `Requirements registry not found: ${registryPath}`,
    );
  }

  const registry = requireObject(
    readGovernedYamlFile(registryAbsolutePath),
    registryPath,
  );
  const records = requireArray(
    registry.requirements,
    `${registryPath}.requirements`,
  ).map((record, index) =>
    requireObject(
      record,
      `${registryPath}.requirements[${index}]`,
    ),
  );
  const controlledFieldCatalog =
    loadDocumentationFieldValueCatalog({
      rootDir: operationRoot,
    });
  const requirementType = requireObject(
    resolveDocumentationFieldValue(
      controlledFieldCatalog,
      {
        registryPath,
        recordType: "requirements",
        fieldName: "requirement_type",
        value: requirementTypeValue,
      },
    ),
    "Resolved requirement_type",
  );
  const lifecycleStatus = requireObject(
    resolveDocumentationFieldValue(
      controlledFieldCatalog,
      {
        registryPath,
        recordType: "requirements",
        fieldName: "status",
        value: "draft",
      },
    ),
    "Resolved Requirement lifecycle status",
  );
  const canonicalRequirementType = requireString(
    requirementType.value,
    "Resolved requirement_type value",
  );
  const canonicalLifecycleStatus = requireString(
    lifecycleStatus.value,
    "Resolved lifecycle status value",
  );

  if (
    typeof requirementType.requires_parent_requirement !==
    "boolean"
  ) {
    throw new Error(
      `${canonicalRequirementType}.requires_parent_requirement must be boolean.`,
    );
  }

  const allowedParentTypes = requireArray(
    requirementType.allowed_parent_requirement_types,
    `${canonicalRequirementType}.allowed_parent_requirement_types`,
  ).map((value) =>
    requireString(
      value,
      `${canonicalRequirementType}.allowed_parent_requirement_types entry`,
    ),
  );

  if (!requirementType.requires_parent_requirement) {
    if (args.parent !== undefined) {
      throw new Error(
        `${canonicalRequirementType} must not declare --parent.`,
      );
    }

    const adrId = String(args.adr ?? "").trim();

    if (!/^ADR-\d{4}$/u.test(adrId)) {
      throw new Error("--adr must look like ADR-0004.");
    }

    const id = buildFunctionalRequirementId(
      records,
      mrId,
      adrId,
    );
    const bodyPath = buildRequirementBodyPath(mrId, id);

    return {
      id,
      requirementType: canonicalRequirementType,
      dryRun,
      bodyPath,
      registryPath,
      recordBlock: buildFunctionalRequirementRecord({
        id,
        title,
        mrId,
        bodyPath,
        status: canonicalLifecycleStatus,
        requirementType: canonicalRequirementType,
      }),
      bodyText: buildFunctionalRequirementBody({
        id,
        title,
      }),
    };
  }

  if (args.adr !== undefined) {
    throw new Error(
      `${canonicalRequirementType} must not declare --adr.`,
    );
  }

  const parentId = String(args.parent ?? "").trim();

  if (!parentId) {
    throw new Error(
      `--parent is required for ${canonicalRequirementType} requirements.`,
    );
  }

  const parent = records.find(
    (record) => record.id === parentId,
  );

  if (!parent) {
    throw new Error(
      `Parent requirement not found in ${registryPath}: ${parentId}`,
    );
  }

  const parentRequirementType = requireObject(
    resolveDocumentationFieldValue(
      controlledFieldCatalog,
      {
        registryPath,
        recordType: "requirements",
        fieldName: "requirement_type",
        value: requireString(
          parent.requirement_type,
          `${parentId}.requirement_type`,
        ),
      },
    ),
    `${parentId} resolved requirement_type`,
  );
  const canonicalParentType = requireString(
    parentRequirementType.value,
    `${parentId} resolved requirement_type value`,
  );

  if (!allowedParentTypes.includes(canonicalParentType)) {
    throw new Error(
      `${canonicalRequirementType} cannot use parent type ${canonicalParentType}; allowed: ${allowedParentTypes.join(", ")}`,
    );
  }

  const id = buildGovernanceRequirementId(
    records,
    parentId,
  );
  const bodyPath = buildRequirementBodyPath(mrId, id);

  return {
    id,
    requirementType: canonicalRequirementType,
    dryRun,
    bodyPath,
    registryPath,
    recordBlock: buildGovernanceRequirementRecord({
      id,
      title,
      mrId,
      parentId,
      bodyPath,
      status: canonicalLifecycleStatus,
      requirementType: canonicalRequirementType,
    }),
    bodyText: buildGovernanceRequirementBody({
      id,
      title,
      parentId,
    }),
  };
}

/**
 * Replaces several text files as one rollback-capable transaction.
 *
 * @param {Array<{projectPath: string, targetPath: string, text: string}>} changes - Prepared file replacements.
 * @param {typeof fs} fileSystem - File-system implementation.
 * @returns {void}
 */
function writeTextTransaction(changes, fileSystem) {
  const nonce = `${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}`;
  const prepared = [];

  try {
    for (
      let index = 0;
      index < changes.length;
      index += 1
    ) {
      const change = changes[index];
      const directory = path.dirname(change.targetPath);
      fileSystem.mkdirSync(directory, {
        recursive: true,
      });

      const temporaryPath = path.join(
        directory,
        `.${path.basename(change.targetPath)}.${nonce}.${index}.tmp`,
      );
      const backupPath = path.join(
        directory,
        `.${path.basename(change.targetPath)}.${nonce}.${index}.bak`,
      );

      fileSystem.writeFileSync(
        temporaryPath,
        change.text,
        {
          encoding: "utf8",
          flag: "wx",
        },
      );

      prepared.push({
        ...change,
        temporaryPath,
        backupPath,
        hadOriginal: fileSystem.existsSync(
          change.targetPath,
        ),
        backedUp: false,
        installed: false,
      });
    }

    for (const entry of prepared) {
      if (!entry.hadOriginal) {
        continue;
      }

      fileSystem.renameSync(
        entry.targetPath,
        entry.backupPath,
      );
      entry.backedUp = true;
    }

    for (const entry of prepared) {
      fileSystem.renameSync(
        entry.temporaryPath,
        entry.targetPath,
      );
      entry.installed = true;
    }

    for (const entry of prepared) {
      if (
        entry.backedUp &&
        fileSystem.existsSync(entry.backupPath)
      ) {
        fileSystem.rmSync(entry.backupPath, {
          force: true,
        });
      }
    }
  } catch (error) {
    for (const entry of [...prepared].reverse()) {
      try {
        if (
          entry.installed &&
          fileSystem.existsSync(entry.targetPath)
        ) {
          fileSystem.rmSync(entry.targetPath, {
            force: true,
          });
        }

        if (
          entry.backedUp &&
          fileSystem.existsSync(entry.backupPath)
        ) {
          fileSystem.renameSync(
            entry.backupPath,
            entry.targetPath,
          );
        }

        if (fileSystem.existsSync(entry.temporaryPath)) {
          fileSystem.rmSync(entry.temporaryPath, {
            force: true,
          });
        }
      } catch {
        // Preserve the original transactional failure.
      }
    }

    throw new Error(
      `Cannot apply governed document transaction: ${error.message}`,
    );
  }
}

/**
 * Atomically writes a generated governed document and its registry record.
 *
 * @param {{id: string, bodyPath: string, registryPath: string, recordBlock: string, bodyText: string}} plan - Planned document.
 * @param {{rootDir?: string, fileSystem?: typeof fs}} [options] - Optional root and injectable file system.
 * @returns {{id: string, registryPath: string, bodyPath: string}} Applied document.
 */
export function applyGeneratedDocument(plan, options = {}) {
  const validatedPlan = requireObject(
    plan,
    "Governed document plan",
  );
  const id = requireString(
    validatedPlan.id,
    "Governed document plan id",
  );
  const registryPath = requireString(
    validatedPlan.registryPath,
    "Governed document plan registryPath",
  );
  const bodyPath = requireString(
    validatedPlan.bodyPath,
    "Governed document plan bodyPath",
  );
  const recordBlock = requireText(
    validatedPlan.recordBlock,
    "Governed document plan recordBlock",
  );
  const bodyText = requireText(
    validatedPlan.bodyText,
    "Governed document plan bodyText",
  );
  const operationRoot = resolveRootDir(options);
  const fileSystem = options.fileSystem ?? fs;
  const registryAbsolutePath = resolveProjectPath(
    registryPath,
    operationRoot,
  );
  const bodyAbsolutePath = resolveProjectPath(
    bodyPath,
    operationRoot,
  );

  if (!fileSystem.existsSync(registryAbsolutePath)) {
    throw new Error(
      `Requirements registry not found: ${registryPath}`,
    );
  }

  if (fileSystem.existsSync(bodyAbsolutePath)) {
    throw new Error(
      `Body already exists and will not be overwritten: ${bodyPath}`,
    );
  }

  const registryText = readText(
    fileSystem,
    registryAbsolutePath,
  );

  if (registryText.includes(`id: ${id}`)) {
    throw new Error(
      `Generated id already exists in registry: ${id}`,
    );
  }

  const updatedRegistryText = appendRequirementRecord(
    registryText,
    recordBlock,
  );

  writeTextTransaction(
    [
      {
        projectPath: registryPath,
        targetPath: registryAbsolutePath,
        text: updatedRegistryText,
      },
      {
        projectPath: bodyPath,
        targetPath: bodyAbsolutePath,
        text: bodyText,
      },
    ],
    fileSystem,
  );

  return {
    id,
    registryPath,
    bodyPath,
  };
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

    const plan = planGeneratedDocument(args);

    console.log("Governed document generation planned.");
    console.log(
      `Requirement type: ${plan.requirementType}`,
    );
    console.log(`ID: ${plan.id}`);
    console.log(`Registry: ${plan.registryPath}`);
    console.log(`Body: ${plan.bodyPath}`);

    if (plan.dryRun) {
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
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );
    console.error("\n" + helpText());
    return 1;
  }
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === directExecutionUrl) {
  process.exitCode = main();
}
