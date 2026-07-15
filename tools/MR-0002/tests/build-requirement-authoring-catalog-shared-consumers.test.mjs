import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  getDocumentationFieldValueSetByName,
  loadDocumentationFieldValueCatalog,
} from "../../MR-0001/lib/documentation-field-values.mjs";
import { loadGovernedDocumentModelSourceSet } from "../../MR-0001/lib/governed-document-model-sources.mjs";

/**
 * @file Verifica della migrazione del Requirement authoring catalog builder ai consumer condivisi.
 *
 * @implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0004
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Verifies that the Requirement authoring catalog builder reads governed YAML
 * through the shared parser and obtains requirement_type authority from the
 * canonical documentation field value catalog and document-model profiles.
 * The builder must not retain a local YAML parser, legacy Macro-requirement
 * field aliases, a local value-set lookup or nominal knowledge of abstract
 * categories that are not stored controlled values.
 */

const testPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testPath), "..", "..", "..");
const builderProjectPath =
  "tools/MR-0002/build-requirement-authoring-catalog.mjs";
const builderPath = path.join(
  projectRoot,
  ...builderProjectPath.split("/"),
);
const builderSource = fs.readFileSync(builderPath, "utf8");

/**
 * Runs the catalog builder against the repository root.
 *
 * @returns {Record<string, unknown>} Parsed builder output.
 */
function runBuilder() {
  const result = spawnSync(process.execPath, [builderPath], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      TF_REQUIREMENT_AUTHORING_CATALOG_ROOT: projectRoot,
    },
  });

  assert.equal(
    result.status,
    0,
    `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  );

  return JSON.parse(result.stdout);
}

/**
 * Projects the canonical requirement_type records into the public authoring
 * catalog shape without creating an independent value inventory.
 *
 * @param {Record<string, unknown>} valueSet - Canonical requirement_type set.
 * @returns {Array<Record<string, unknown>>} Expected public projection.
 */
function projectRequirementTypes(valueSet) {
  assert.ok(Array.isArray(valueSet.values));

  return valueSet.values
    .map((entry) => ({
      value: entry.value,
      meaning: entry.meaning,
      is_specialized: entry.is_specialized,
      requires_parent_requirement: entry.requires_parent_requirement,
      allowed_parent_requirement_types:
        [...entry.allowed_parent_requirement_types].sort((left, right) =>
          left.localeCompare(right, "en", {
            numeric: true,
            sensitivity: "base",
          }),
        ),
    }))
    .sort((left, right) =>
      left.value.localeCompare(right.value, "en", {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

test("declares the shared governed YAML and controlled-field consumers", () => {
  for (const requiredSourceText of [
    "../MR-0001/lib/governed-yaml.mjs",
    "../MR-0001/lib/documentation-field-values.mjs",
    "../MR-0001/lib/governed-document-model-sources.mjs",
    "readGovernedYamlFile",
    "loadDocumentationFieldValueCatalog",
    "getDocumentationFieldValueSetByName",
    "loadGovernedDocumentModelSourceSet",
    "@implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001",
    "@implementsRequirement MR-0001ADR-0007REQ-0001GOV-0001",
  ]) {
    assert.ok(
      builderSource.includes(requiredSourceText),
      `Builder must contain shared dependency or trace declaration: ${requiredSourceText}`,
    );
  }
});

test("does not retain local YAML parsing or controlled-value authority", () => {
  const forbiddenPatterns = [
    ["stripQuotes", /function\s+stripQuotes\s*\(/u],
    ["parseScalar", /function\s+parseScalar\s*\(/u],
    ["countIndent", /function\s+countIndent\s*\(/u],
    ["parseYaml", /function\s+parseYaml\s*\(/u],
    ["readYaml", /function\s+readYaml\s*\(/u],
    [
      "manual requirement_type value-set lookup",
      /taxonomyRegistry\.field_value_sets/u,
    ],
    [
      "nominal specialized category rule",
      /===\s*["']specialized["']/u,
    ],
    ["legacy Macro-requirement type field", /macro\.type/u],
    [
      "hard-coded Macro-requirement registry path",
      /const\s+macroRequirementsRegistryProjectPath/u,
    ],
  ];

  for (const [label, pattern] of forbiddenPatterns) {
    assert.doesNotMatch(
      builderSource,
      pattern,
      `Builder must not retain local ${label} authority.`,
    );
  }
});

test("projects requirement types from the canonical shared catalog", () => {
  const controlledFieldCatalog = loadDocumentationFieldValueCatalog({
    rootDir: projectRoot,
  });
  const requirementTypeValueSet = getDocumentationFieldValueSetByName(
    controlledFieldCatalog,
    "requirement_type",
  );
  const authoringCatalog = runBuilder();

  assert.deepEqual(
    authoringCatalog.requirement_types,
    projectRequirementTypes(requirementTypeValueSet),
  );
});

test("reports the canonical taxonomy source in catalog provenance", () => {
  const controlledFieldCatalog = loadDocumentationFieldValueCatalog({
    rootDir: projectRoot,
  });
  const authoringCatalog = runBuilder();
  const taxonomySource = authoringCatalog.sources.find(
    (source) => source.kind === "documentation_field_values",
  );

  assert.deepEqual(taxonomySource, {
    kind: "documentation_field_values",
    path: controlledFieldCatalog.canonical_source.registry_path,
    schema_version: controlledFieldCatalog.canonical_source.schema_version,
    registry_id: controlledFieldCatalog.canonical_source.registry_id,
  });
});

test("projects canonical Macro-requirement types and profile-owned source paths", () => {
  const controlledFieldCatalog = loadDocumentationFieldValueCatalog({
    rootDir: projectRoot,
  });
  const macroTypeValueSet = getDocumentationFieldValueSetByName(
    controlledFieldCatalog,
    "macro_requirement_type",
  );
  const allowedTypes = new Set(
    macroTypeValueSet.values.map((entry) => entry.value),
  );
  const sourceSet = loadGovernedDocumentModelSourceSet({
    rootDir: projectRoot,
  });
  const profile = sourceSet.profiles.find(
    (entry) =>
      entry.value.profile_id === "macro-requirement-registry",
  )?.value;
  const authoringCatalog = runBuilder();

  assert.ok(profile);
  for (const macro of authoringCatalog.macro_requirements) {
    assert.ok(allowedTypes.has(macro.macro_requirement_type));
    assert.equal(
      Object.prototype.hasOwnProperty.call(macro, "type"),
      false,
    );
  }
  assert.equal(
    authoringCatalog.sources.find(
      (source) => source.kind === "macro_requirements",
    )?.path,
    profile.source_path,
  );
});
