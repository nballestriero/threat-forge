import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  commonAnalysisFindingModel,
  commonAnalysisFindingProfile,
} from "./common-analysis-finding-model.mjs";

/**
 * @file Common analysis finding editor schema materializer.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0002
 * @derivedFromDecision MR-0005/ADR-0002
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Derives the deterministic YAML editor JSON Schema directly from the
 * canonical common analysis Finding model and representation
 * profile. It introduces no independent analysis-domain rules.
 *
 * Side effects:
 * - write mode creates or replaces only the materialized editor schema;
 * - check mode reads the schema and fails when it is missing or stale;
 * - neither mode modifies common analysis Findings or governed source registries.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..", "..");

export const commonAnalysisFindingSchemaProjectPath =
  ".vscode/schemas/" +
  "common-analysis-finding.schema.json";

/**
 * Returns true for a mapping.
 *
 * @param {unknown} value - Candidate value.
 * @returns {boolean} Whether the value is a mapping.
 */
function isRecord(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

/**
 * Resolves a safe repository-relative path.
 *
 * @param {string} rootDir - Repository root.
 * @param {string} projectPath - Repository-relative path.
 * @returns {string} Absolute path.
 */
function resolveProjectPath(rootDir, projectPath) {
  const absoluteRoot = path.resolve(rootDir);
  const normalized = String(projectPath ?? "")
    .replaceAll("\\", "/")
    .trim();

  if (
    !normalized ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(
      `Repository path must be relative and non-empty: ${projectPath}`,
    );
  }

  const segments = normalized.split("/");

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === "..",
    )
  ) {
    throw new Error(`Repository path is unsafe: ${normalized}`);
  }

  const absolute = path.resolve(absoluteRoot, ...segments);
  const relative = path.relative(absoluteRoot, absolute);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      `Repository path resolves outside root: ${normalized}`,
    );
  }

  return absolute;
}

/**
 * Produces repository-stable JSON text.
 *
 * @param {Record<string, unknown>} value - JSON document.
 * @returns {string} Pretty JSON with one trailing newline.
 */
export function formatCommonAnalysisFindingSchema(value) {
  if (!isRecord(value)) {
    throw new TypeError(
      "Common analysis Finding schema must be an object.",
    );
  }

  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Converts one canonical profile field into JSON Schema.
 *
 * The conversion is intentionally mechanical: every emitted constraint and
 * description originates from the canonical representation profile.
 *
 * @param {Record<string, unknown>} field - Canonical field definition.
 * @returns {Record<string, unknown>} Derived JSON Schema field.
 */
function materializeField(field) {
  if (!isRecord(field)) {
    throw new TypeError(
      "Canonical common Finding profile field must be an object.",
    );
  }

  const schema = {};

  if (field.type !== undefined) {
    schema.type = field.type;
  }

  if (field.const !== undefined) {
    schema.const = field.const;
  }

  if (field.pattern !== undefined) {
    schema.pattern = field.pattern;
  }

  if (field.min_length !== undefined) {
    schema.minLength = field.min_length;
  }

  if (field.min_items !== undefined) {
    schema.minItems = field.min_items;
  }

  if (Array.isArray(field.enum)) {
    schema.enum = [...field.enum];
  }

  if (Array.isArray(field.examples)) {
    schema.examples = structuredClone(field.examples);
  }

  if (field.description !== undefined) {
    schema.description = field.description;
  }

  if (field.additional_properties !== undefined) {
    schema.additionalProperties = field.additional_properties;
  }

  if (Array.isArray(field.required_fields)) {
    schema.required = [...field.required_fields];
  }

  if (isRecord(field.fields)) {
    schema.properties = Object.fromEntries(
      Object.entries(field.fields).map(([name, definition]) => [
        name,
        materializeField(definition),
      ]),
    );
  }

  if (isRecord(field.item)) {
    schema.items = materializeField(field.item);
  }

  if (Array.isArray(field.unique_by)) {
    schema["x-threatforge-unique-by"] = [...field.unique_by];
  }

  return schema;
}

/**
 * Builds the deterministic editor schema from canonical model inputs.
 *
 * @returns {Record<string, unknown>} Derived JSON Schema.
 */
export function buildCommonAnalysisFindingEditorSchema() {
  const profile = commonAnalysisFindingProfile;
  const model = commonAnalysisFindingModel;

  if (
    profile.profile_id !== model.profile_id ||
    profile.record_domain !== model.record_domain
  ) {
    throw new Error(
      "Canonical common Finding model and profile are inconsistent.",
    );
  }

  if (
    model.governed_document_model !== false ||
    model.authorable_governed_document_type !== false
  ) {
    throw new Error(
      "Common Finding editor schema cannot materialize a governed document model.",
    );
  }

  if (
    !Array.isArray(profile.required_fields) ||
    !isRecord(profile.fields)
  ) {
    throw new Error(
      "Canonical common Finding profile is incomplete.",
    );
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id:
      "https://threatforge.local/schemas/" +
      "common-analysis-finding.schema.json",
    title: "Common analysis Finding",
    description:
      "Editor assistance derived from the canonical ThreatForge " +
      "common analysis Finding model.",
    type: "object",
    additionalProperties: profile.additional_properties,
    required: [...profile.required_fields],
    properties: Object.fromEntries(
      Object.entries(profile.fields).map(([name, definition]) => [
        name,
        materializeField(definition),
      ]),
    ),
    "x-threatforge": {
      model_id: model.model_id,
      profile_id: profile.profile_id,
      record_domain: profile.record_domain,
      file_glob: profile.file_glob,
      governed_document_model: model.governed_document_model,
      authorable_governed_document_type:
        model.authorable_governed_document_type,
      canonical_source:
        "tools/MR-0005/lib/" +
        "common-analysis-finding-model.mjs",
    },
  };
}

/**
 * Reads one existing materialized schema.
 *
 * @param {string} absolutePath - Absolute schema path.
 * @returns {Record<string, unknown>} Parsed schema.
 */
function readMaterializedSchema(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      "Materialized common analysis Finding schema " +
      `is missing: ${commonAnalysisFindingSchemaProjectPath}.`,
    );
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(absolutePath, "utf8")
        .replace(/^\uFEFF/u, ""),
    );

    if (!isRecord(parsed)) {
      throw new Error("schema root must be an object");
    }

    return parsed;
  } catch (error) {
    throw new Error(
      "Materialized common analysis Finding schema " +
      `is invalid JSON: ${error.message}`,
    );
  }
}

/**
 * Writes one schema through a sibling temporary file.
 *
 * @param {string} absolutePath - Final schema path.
 * @param {string} content - Complete UTF-8 content.
 * @returns {void}
 */
function writeAtomically(absolutePath, content) {
  const directory = path.dirname(absolutePath);
  fs.mkdirSync(directory, {
    recursive: true,
  });

  const temporaryPath = path.join(
    directory,
    `.${path.basename(absolutePath)}.` +
      `${process.pid}.${Date.now()}.tmp`,
  );

  try {
    fs.writeFileSync(temporaryPath, content, {
      encoding: "utf8",
      flag: "wx",
    });

    fs.renameSync(temporaryPath, absolutePath);
  } catch (error) {
    try {
      if (fs.existsSync(temporaryPath)) {
        fs.rmSync(temporaryPath, {
          force: true,
        });
      }
    } catch {
      // Preserve the original materialization error.
    }

    throw new Error(
      "Cannot atomically materialize common analysis " +
      `Finding schema: ${error.message}`,
    );
  }
}

/**
 * Materializes or checks the deterministic editor schema.
 *
 * @param {{
 *   rootDir?: string,
 *   mode: "write"|"check"
 * }} input - Explicit materialization operation.
 * @returns {{
 *   mode: string,
 *   status: string,
 *   path: string,
 *   schema_id: string,
 *   model_id: string,
 *   profile_id: string
 * }} Operation result.
 */
export function materializeCommonAnalysisFindingSchema(
  input,
) {
  const mode = String(input?.mode ?? "");

  if (mode !== "write" && mode !== "check") {
    throw new Error(
      `Unsupported schema materialization mode: ${mode || "<empty>"}.`,
    );
  }

  const rootDir = path.resolve(input?.rootDir ?? defaultRootDir);
  const schema =
    buildCommonAnalysisFindingEditorSchema();
  const generatedText =
    formatCommonAnalysisFindingSchema(schema);
  const absolutePath = resolveProjectPath(
    rootDir,
    commonAnalysisFindingSchemaProjectPath,
  );

  if (mode === "check") {
    const existing = readMaterializedSchema(absolutePath);
    const existingText =
      formatCommonAnalysisFindingSchema(existing);

    if (existingText !== generatedText) {
      throw new Error(
        "Materialized common analysis Finding " +
        `schema is stale: ${commonAnalysisFindingSchemaProjectPath}.`,
      );
    }

    return {
      mode,
      status: "current",
      path: commonAnalysisFindingSchemaProjectPath,
      schema_id: schema.$id,
      model_id: schema["x-threatforge"].model_id,
      profile_id: schema["x-threatforge"].profile_id,
    };
  }

  let status = "created";

  if (fs.existsSync(absolutePath)) {
    const existing = readMaterializedSchema(absolutePath);
    const existingText =
      formatCommonAnalysisFindingSchema(existing);

    if (existingText === generatedText) {
      status = "current";
    } else {
      writeAtomically(absolutePath, generatedText);
      status = "updated";
    }
  } else {
    writeAtomically(absolutePath, generatedText);
  }

  return {
    mode,
    status,
    path: commonAnalysisFindingSchemaProjectPath,
    schema_id: schema.$id,
    model_id: schema["x-threatforge"].model_id,
    profile_id: schema["x-threatforge"].profile_id,
  };
}

/**
 * Parses one explicit CLI mode.
 *
 * @param {string[]} args - Arguments after script path.
 * @returns {"write"|"check"} Selected mode.
 */
function parseMode(args) {
  if (args.length !== 1) {
    throw new Error(
      "Exactly one mode is required: --write or --check.",
    );
  }

  if (args[0] === "--write") {
    return "write";
  }

  if (args[0] === "--check") {
    return "check";
  }

  throw new Error(`Unsupported argument: ${args[0]}`);
}

/**
 * Executes the optional direct CLI.
 *
 * @returns {void}
 */
function main() {
  const result =
    materializeCommonAnalysisFindingSchema({
      mode: parseMode(process.argv.slice(2)),
    });

  console.log(
    "Common analysis Finding schema materialization succeeded.",
  );
  console.log(`Mode: ${result.mode}`);
  console.log(`Status: ${result.status}`);
  console.log(`Path: ${result.path}`);
  console.log(`Schema id: ${result.schema_id}`);
  console.log(`Model id: ${result.model_id}`);
  console.log(`Profile id: ${result.profile_id}`);
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === directExecutionUrl) {
  try {
    main();
  } catch (error) {
    console.error(
      "Common analysis Finding schema " +
      `materialization failed: ${error.message}`,
    );

    process.exitCode = 1;
  }
}
