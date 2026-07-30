#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * @file Governed document authoring schema materializer.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Materializes the deterministic governed document authoring JSON Schema at a stable
 * repository path for local editor adapters. The schema content is always
 * derived by executing the governed schema builder; no canonical values or
 * authoring constraints are duplicated in this tool.
 *
 * Side effects:
 * - --write creates or replaces only the materialized schema file;
 * - --check reads the materialized schema and fails when it is absent,
 *   malformed or stale;
 * - neither mode modifies canonical registries or governed Markdown bodies.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_GOVERNED_DOCUMENT_AUTHORING_MATERIALIZER_ROOT
  ? path.resolve(process.env.TF_GOVERNED_DOCUMENT_AUTHORING_MATERIALIZER_ROOT)
  : defaultRootDir;

const schemaBuilderProjectPath =
  "tools/MR-0002/build-governed-document-authoring-schema.mjs";
const materializedSchemaProjectPath =
  ".vscode/schemas/governed-document-authoring.schema.json";

/**
 * Converts a repository-relative project path to an absolute path under the
 * selected repository root.
 *
 * @param {string} projectPath - Repository-relative path using forward slashes.
 * @returns {string} Absolute path.
 */
function resolveProjectPath(projectPath) {
  const normalized = String(projectPath ?? "").replaceAll("\\", "/").trim();
  if (!normalized) throw new Error("Repository-relative path must not be empty.");
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
  if (
    absolutePath !== rootDir &&
    !absolutePath.startsWith(`${rootDir}${path.sep}`)
  ) {
    throw new Error(`Repository path resolves outside root: ${normalized}`);
  }
  return absolutePath;
}

/**
 * Requires a non-array JSON object.
 *
 * @param {unknown} value - Candidate value.
 * @param {string} label - Diagnostic label.
 * @returns {Record<string, unknown>} Validated object.
 */
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
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
  if (!normalized) throw new Error(`${label} must be a non-empty string.`);
  return normalized;
}

/**
 * Parses JSON text while producing a deterministic diagnostic.
 *
 * @param {string} text - JSON text.
 * @param {string} label - Diagnostic label.
 * @returns {Record<string, unknown>} Parsed object.
 */
function parseJsonObject(text, label) {
  try {
    return requireObject(
      JSON.parse(String(text ?? "").replace(/^\uFEFF/u, "")),
      label,
    );
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

/**
 * Formats one JSON document using the repository-stable representation.
 *
 * @param {Record<string, unknown>} value - JSON object.
 * @returns {string} Pretty JSON with one trailing newline.
 */
function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Executes the governed schema builder and returns its normalized output.
 *
 * @returns {{value: Record<string, unknown>, text: string, schemaId: string, catalogId: string}}
 * Generated schema details.
 */
function buildCurrentSchema() {
  const builderPath = resolveProjectPath(schemaBuilderProjectPath);
  if (!fs.existsSync(builderPath)) {
    throw new Error(
      `Governed document authoring JSON Schema builder is missing: ${schemaBuilderProjectPath}`,
    );
  }

  const result = spawnSync(process.execPath, [builderPath], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TF_GOVERNED_DOCUMENT_AUTHORING_SCHEMA_ROOT: rootDir,
      TF_GOVERNED_DOCUMENT_AUTHORING_CATALOG_ROOT: rootDir,
    },
  });

  if (result.error) {
    throw new Error(
      `Cannot execute Governed document authoring JSON Schema builder: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(
      `Governed document authoring JSON Schema builder failed with exit code ${result.status ?? "unknown"}` +
        (diagnostics ? `: ${diagnostics}` : "."),
    );
  }
  if (String(result.stderr ?? "").trim()) {
    throw new Error(
      `Governed document authoring JSON Schema builder emitted unexpected stderr: ${String(result.stderr).trim()}`,
    );
  }

  const value = parseJsonObject(
    result.stdout,
    "Governed document authoring JSON Schema builder output",
  );
  const schemaId = requireString(value.$id, "Generated schema $id");
  const threatForgeMetadata = requireObject(
    value["x-threatforge"],
    "Generated schema x-threatforge",
  );
  const catalogId = requireString(
    threatForgeMetadata.catalog_id,
    "Generated schema x-threatforge.catalog_id",
  );

  return {
    value,
    text: formatJson(value),
    schemaId,
    catalogId,
  };
}

/**
 * Reads and normalizes the current materialized schema.
 *
 * @param {string} absolutePath - Absolute materialized schema path.
 * @returns {{value: Record<string, unknown>, text: string}} Parsed schema.
 */
function readMaterializedSchema(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Materialized Governed document authoring schema is missing: ${materializedSchemaProjectPath}. ` +
        `Run this tool with --write.`,
    );
  }

  let text;
  try {
    text = fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    throw new Error(
      `Cannot read materialized Governed document authoring schema: ${error.message}`,
    );
  }

  const value = parseJsonObject(
    text,
    `Materialized Governed document authoring schema ${materializedSchemaProjectPath}`,
  );
  return {
    value,
    text: formatJson(value),
  };
}

/**
 * Writes text by first creating a sibling temporary file and then renaming it
 * over the target. The temporary file is removed when the replacement fails.
 *
 * @param {string} absolutePath - Final absolute path.
 * @param {string} text - Complete UTF-8 file content.
 * @returns {void}
 */
function writeAtomically(absolutePath, text) {
  const directory = path.dirname(absolutePath);
  fs.mkdirSync(directory, { recursive: true });

  const temporaryPath = path.join(
    directory,
    `.${path.basename(absolutePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  try {
    fs.writeFileSync(temporaryPath, text, {
      encoding: "utf8",
      flag: "wx",
    });
    fs.renameSync(temporaryPath, absolutePath);
  } catch (error) {
    try {
      if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
    } catch {
      // Preserve the original materialization failure.
    }
    throw new Error(
      `Cannot atomically materialize ${materializedSchemaProjectPath}: ${error.message}`,
    );
  }
}

/**
 * Materializes or checks the stable Governed document authoring schema.
 *
 * @param {"write"|"check"} mode - Explicit operation mode.
 * @returns {{mode: string, status: string, path: string, schemaId: string, catalogId: string}}
 * Operation result.
 */
export function materializeGovernedDocumentAuthoringSchema(mode) {
  if (mode !== "write" && mode !== "check") {
    throw new Error(`Unsupported materialization mode: ${mode}`);
  }

  const generated = buildCurrentSchema();
  const materializedPath = resolveProjectPath(materializedSchemaProjectPath);

  if (mode === "check") {
    const existing = readMaterializedSchema(materializedPath);
    if (existing.text !== generated.text) {
      throw new Error(
        `Materialized Governed document authoring schema is stale: ${materializedSchemaProjectPath}. ` +
          `Run this tool with --write.`,
      );
    }
    return {
      mode,
      status: "current",
      path: materializedSchemaProjectPath,
      schemaId: generated.schemaId,
      catalogId: generated.catalogId,
    };
  }

  let status = "created";
  if (fs.existsSync(materializedPath)) {
    const existing = readMaterializedSchema(materializedPath);
    if (existing.text === generated.text) {
      status = "current";
    } else {
      writeAtomically(materializedPath, generated.text);
      status = "updated";
    }
  } else {
    writeAtomically(materializedPath, generated.text);
  }

  return {
    mode,
    status,
    path: materializedSchemaProjectPath,
    schemaId: generated.schemaId,
    catalogId: generated.catalogId,
  };
}

/**
 * Parses the explicit CLI mode.
 *
 * @param {string[]} args - Arguments after the script path.
 * @returns {"write"|"check"} Selected mode.
 */
function parseMode(args) {
  if (args.length !== 1) {
    throw new Error(
      "Exactly one explicit mode is required: --write or --check.",
    );
  }
  if (args[0] === "--write") return "write";
  if (args[0] === "--check") return "check";
  throw new Error(`Unsupported argument: ${args[0]}`);
}

/**
 * Executes the CLI.
 *
 * @returns {void}
 */
function main() {
  const mode = parseMode(process.argv.slice(2));
  const result = materializeGovernedDocumentAuthoringSchema(mode);

  console.log("Governed document authoring schema materialization succeeded.");
  console.log(`Mode: ${result.mode}`);
  console.log(`Status: ${result.status}`);
  console.log(`Path: ${result.path}`);
  console.log(`Schema id: ${result.schemaId}`);
  console.log(`Catalog id: ${result.catalogId}`);
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === directExecutionUrl) {
  try {
    main();
  } catch (error) {
    console.error(
      `Governed document authoring schema materialization failed: ${error.message}`,
    );
    process.exitCode = 1;
  }
}
