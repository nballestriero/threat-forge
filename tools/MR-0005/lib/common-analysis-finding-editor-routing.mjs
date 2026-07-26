import {
  buildCommonAnalysisFindingEditorSchema,
  commonAnalysisFindingSchemaProjectPath,
  formatCommonAnalysisFindingSchema,
} from "./materialize-common-analysis-finding-schema.mjs";

/**
 * @file Common Finding editor routing projection.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0004
 * @derivedFromDecision MR-0005/ADR-0002
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Produces the thin YAML editor association shared by the canonical
 * ThreatForge workspace and supported Target Project workspaces. The schema
 * path and file glob are consumed from the existing Common Finding schema
 * projection; this module owns no Finding fields, enums, references or
 * semantic validation rules.
 *
 * Side effects: none.
 */

export const commonAnalysisFindingEditorRoutingRequirementId =
  "MR-0005ADR-0002REQ-0001GOV-0004";

/**
 * Returns true for a record-like mapping.
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
 * Requires one record-like mapping.
 *
 * @param {unknown} value - Candidate mapping.
 * @param {string} label - Diagnostic label.
 * @returns {Record<string, unknown>} Validated mapping.
 */
function requireRecord(value, label) {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object.`);
  }

  return value;
}

/**
 * Requires one non-empty single-line string.
 *
 * @param {unknown} value - Candidate string.
 * @param {string} label - Diagnostic label.
 * @returns {string} Validated string.
 */
function requireString(value, label) {
  const text = String(value ?? "").trim();

  if (!text || /\r|\n/u.test(text)) {
    throw new TypeError(`${label} must be a non-empty single-line string.`);
  }

  return text;
}

/**
 * Requires one array of unique non-empty strings.
 *
 * @param {unknown} value - Candidate array.
 * @param {string} label - Diagnostic label.
 * @returns {string[]} Validated strings.
 */
function requireStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array.`);
  }

  const values = value.map((entry, index) =>
    requireString(entry, `${label}[${index}]`)
  );

  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must not contain duplicate values.`);
  }

  return values;
}

/**
 * Validates one repository-relative VS Code schema path.
 *
 * @param {unknown} value - Candidate project path.
 * @returns {string} Validated project path.
 */
function requireSchemaProjectPath(value) {
  const projectPath = requireString(
    value,
    "Common Finding schema project path",
  ).replaceAll("\\", "/");

  const segments = projectPath.split("/");

  if (
    projectPath.startsWith("/") ||
    /^[A-Za-z]:\//u.test(projectPath) ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === "..",
    )
  ) {
    throw new Error(
      `Common Finding schema project path is unsafe: ${projectPath}`,
    );
  }

  if (
    !projectPath.startsWith(".vscode/schemas/") ||
    !projectPath.endsWith(".schema.json")
  ) {
    throw new Error(
      "Common Finding schema must remain a workspace-local VS Code schema.",
    );
  }

  return projectPath;
}

/**
 * Builds the canonical Common Finding editor-routing projection.
 *
 * The file glob is read from the schema metadata mechanically derived from the
 * canonical Common Finding profile.
 *
 * @returns {{
 *   requirementId: string,
 *   schemaProjectPath: string,
 *   schemaAssociationKey: string,
 *   fileGlob: string,
 *   schema: Record<string, unknown>,
 *   schemaText: string
 * }} Routing projection.
 */
export function buildCommonAnalysisFindingEditorRoutingProjection() {
  const schema = buildCommonAnalysisFindingEditorSchema();
  const metadata = requireRecord(
    schema["x-threatforge"],
    "Common Finding schema metadata",
  );

  const schemaProjectPath = requireSchemaProjectPath(
    commonAnalysisFindingSchemaProjectPath,
  );
  const fileGlob = requireString(
    metadata.file_glob,
    "Common Finding schema metadata file_glob",
  );

  if (
    metadata.governed_document_model !== false ||
    metadata.authorable_governed_document_type !== false
  ) {
    throw new Error(
      "Common Finding routing cannot target a governed document schema.",
    );
  }

  return {
    requirementId:
      commonAnalysisFindingEditorRoutingRequirementId,
    schemaProjectPath,
    schemaAssociationKey: `./${schemaProjectPath}`,
    fileGlob,
    schema,
    schemaText: formatCommonAnalysisFindingSchema(schema),
  };
}

/**
 * Merges the canonical Common Finding association into VS Code settings.
 *
 * Existing unrelated schema associations are preserved. Stale or duplicate
 * associations for the managed Common Finding glob are removed before the
 * canonical association is installed.
 *
 * @param {Record<string, unknown>} settings - Existing VS Code settings.
 * @returns {Record<string, unknown>} Deterministic merged settings.
 */
export function mergeCommonAnalysisFindingEditorRouting(settings) {
  const existing = requireRecord(
    settings,
    "VS Code settings",
  );
  const projection =
    buildCommonAnalysisFindingEditorRoutingProjection();

  const currentSchemas =
    existing["yaml.schemas"] === undefined
      ? {}
      : requireRecord(
        existing["yaml.schemas"],
        "VS Code settings yaml.schemas",
      );

  const mergedSchemas = {};

  for (const [schemaKey, value] of Object.entries(currentSchemas)) {
    if (schemaKey === projection.schemaAssociationKey) {
      continue;
    }

    const preservedGlobs = requireStringArray(
      value,
      `VS Code schema association ${schemaKey}`,
    ).filter((glob) => glob !== projection.fileGlob);

    if (preservedGlobs.length > 0) {
      mergedSchemas[schemaKey] = preservedGlobs;
    }
  }

  mergedSchemas[projection.schemaAssociationKey] = [
    projection.fileGlob,
  ];

  return {
    ...existing,
    "yaml.schemas": mergedSchemas,
  };
}

/**
 * Validates the canonical Common Finding association in VS Code settings.
 *
 * @param {Record<string, unknown>} settings - Materialized VS Code settings.
 * @returns {ReturnType<
 *   typeof buildCommonAnalysisFindingEditorRoutingProjection
 * >} Validated routing projection.
 */
export function validateCommonAnalysisFindingEditorRouting(settings) {
  const existing = requireRecord(
    settings,
    "VS Code settings",
  );
  const schemas = requireRecord(
    existing["yaml.schemas"],
    "VS Code settings yaml.schemas",
  );
  const projection =
    buildCommonAnalysisFindingEditorRoutingProjection();

  let occurrenceCount = 0;

  for (const [schemaKey, value] of Object.entries(schemas)) {
    const globs = requireStringArray(
      value,
      `VS Code schema association ${schemaKey}`,
    );

    for (const glob of globs) {
      if (glob !== projection.fileGlob) {
        continue;
      }

      occurrenceCount += 1;

      if (schemaKey !== projection.schemaAssociationKey) {
        throw new Error(
          "Common Finding file glob is associated with a divergent schema: " +
            schemaKey,
        );
      }
    }
  }

  const canonicalAssociation = requireStringArray(
    schemas[projection.schemaAssociationKey],
    "Canonical Common Finding schema association",
  );

  if (
    canonicalAssociation.length !== 1 ||
    canonicalAssociation[0] !== projection.fileGlob
  ) {
    throw new Error(
      "Canonical Common Finding schema association is missing or stale.",
    );
  }

  if (occurrenceCount !== 1) {
    throw new Error(
      "Common Finding file glob must have exactly one schema association.",
    );
  }

  return projection;
}
