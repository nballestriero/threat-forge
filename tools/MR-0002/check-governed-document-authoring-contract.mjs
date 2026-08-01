#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertGovernedDocumentModelConsumerCoverage,
  loadGovernedDocumentModelSourceSet,
} from "../MR-0001/lib/governed-document-model-sources.mjs";
import {
  validateGovernedDocumentAuthoringProviderCoverage,
} from "./create-governed-document.mjs";
import {
  createSecurityRequirementAuthoringReferenceService,
  resolveGovernedDocumentAuthoringProviders,
} from "../MR-0001/lib/security-requirement-authoring-provider.mjs";
import {
  governedDocumentAuthoringSchemaProviders,
  validateGovernedDocumentAuthoringSchemaProviderCoverage,
} from "./build-governed-document-authoring-schema.mjs";
import {
  resolveSecurityRequirementAuthoringSchemaProviders,
} from "../MR-0001/lib/security-requirement-authoring-schema-provider.mjs";

/**
 * @file Governed document authoring contract checker.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @implementsRequirement MR-0002ADR-0005REQ-0003
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @derivedFromDecision MR-0001/ADR-0010
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Validates deterministic catalog and schema generation, exact runtime and schema
 * authoring-provider coverage, scoped MR/ADR/parent choices, generated-field
 * ownership, negative fixtures and the shared core/runner/adapter suites.
 *
 * Side effects: reads canonical and generated sources, executes read-only
 * builders and tests, writes no repository file and fails on working-tree drift.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = process.env.TF_GOVERNED_DOCUMENT_AUTHORING_CONTRACT_ROOT
  ? path.resolve(process.env.TF_GOVERNED_DOCUMENT_AUTHORING_CONTRACT_ROOT)
  : path.resolve(scriptDir, "..", "..");
const catalogBuilderProjectPath =
  "tools/MR-0002/build-governed-document-authoring-catalog.mjs";
const schemaBuilderProjectPath =
  "tools/MR-0002/build-governed-document-authoring-schema.mjs";
const fixtureRegistryProjectPath =
  "tools/MR-0002/fixtures/governed-document-authoring-contract/negative-fixtures.registry.json";
const testProjectPaths = [
  "tools/MR-0002/tests/build-governed-document-authoring-catalog-shared-consumers.test.mjs",
  "tools/MR-0002/tests/create-governed-document-core.test.mjs",
  "tools/MR-0002/tests/run-governed-document-authoring.test.mjs",
  "tools/MR-0002/tests/materialize-vscode-governed-document-authoring-adapter.test.mjs",
];
const expectedGeneratedFields = [
  "id",
  "status",
  "date",
  "body_path",
  "decisions_registry_path",
  "requirements_registry_path",
  "requirement_type",
];

function resolveProjectPath(projectPath) {
  const normalized = String(projectPath ?? "").replaceAll("\\", "/").trim();
  if (
    !normalized ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Unsafe repository-relative path: ${normalized || "<empty>"}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Unsafe repository-relative path: ${normalized}`);
  }
  const absolute = path.resolve(rootDir, ...segments);
  if (absolute !== rootDir && !absolute.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`Repository path escapes root: ${normalized}`);
  }
  return absolute;
}

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
function requireObject(value, label) {
  if (!object(value)) throw new Error(`${label} must be an object.`);
  return value;
}
function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}
function requireString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string.`);
  return normalized;
}
function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}
function clone(value) {
  return structuredClone(value);
}

function gitStatus() {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Cannot inspect git status: ${result.stderr || result.error?.message}`);
  }
  return String(result.stdout ?? "");
}

function runJsonBuilder(projectPath, label) {
  const result = spawnSync(process.execPath, [resolveProjectPath(projectPath)], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TF_GOVERNED_DOCUMENT_AUTHORING_CATALOG_ROOT: rootDir,
      TF_GOVERNED_DOCUMENT_AUTHORING_SCHEMA_ROOT: rootDir,
    },
  });
  if (result.error || result.status !== 0 || String(result.stderr ?? "").trim()) {
    const diagnostics = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(`${label} failed${diagnostics ? `: ${diagnostics}` : "."}`);
  }
  return {
    text: result.stdout,
    value: requireObject(JSON.parse(result.stdout), label),
  };
}

function branchByType(schema, documentType) {
  return requireArray(schema.oneOf, "schema.oneOf")
    .map((value) => requireObject(value, "schema branch"))
    .find((branch) => branch.properties?.document_type?.const === documentType);
}

function coverageError(consumerId, sourceSet, modelIds) {
  try {
    assertGovernedDocumentModelConsumerCoverage({
      consumerId,
      sourceSet,
      providerModelIds: modelIds,
    });
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** @param {Record<string, unknown>} catalog @param {Record<string, unknown>} schema */
export function validateGovernedDocumentAuthoringContract(catalog, schema) {
  const errors = [];
  if (catalog.catalog_id !== "governed-document-authoring-catalog") {
    errors.push("catalog_id is not governed-document-authoring-catalog.");
  }
  if (schema.$id !== "urn:threatforge:schema:governed-document-authoring-request:1") {
    errors.push("schema $id is not the governed document authoring request identifier.");
  }

  const sourceSet = loadGovernedDocumentModelSourceSet({ rootDir });
  const catalogTypes = requireArray(catalog.document_types, "catalog.document_types")
    .map((entry) => entry.id);
  const schemaTypes = requireArray(schema.oneOf, "schema.oneOf")
    .map((entry) => entry.properties?.document_type?.const);
  const catalogCoverage = coverageError(
    "governed-document-authoring-catalog",
    sourceSet,
    catalogTypes,
  );
  const schemaCoverage = coverageError(
    "governed-document-authoring-schema",
    sourceSet,
    schemaTypes,
  );
  if (catalogCoverage) {
    errors.push(`catalog document types diverge from the canonical model index: ${catalogCoverage}`);
  }
  if (schemaCoverage) {
    errors.push(`schema document types diverge from the canonical model index: ${schemaCoverage}`);
  }

  const runtimeProviders = resolveGovernedDocumentAuthoringProviders({
    rootDir,
    catalog,
  });
  const schemaProviders = resolveSecurityRequirementAuthoringSchemaProviders({
    catalog,
    providers: governedDocumentAuthoringSchemaProviders,
    referenceService: createSecurityRequirementAuthoringReferenceService({
      rootDir,
    }),
  });
  const runtimeProviderDiagnostics =
    validateGovernedDocumentAuthoringProviderCoverage(catalog, runtimeProviders);
  const schemaProviderDiagnostics =
    validateGovernedDocumentAuthoringSchemaProviderCoverage(catalog, schemaProviders);
  if (runtimeProviderDiagnostics.length > 0) {
    errors.push(
      `runtime authoring providers diverge from the canonical catalog: ${runtimeProviderDiagnostics
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | ")}`,
    );
  }
  if (schemaProviderDiagnostics.length > 0) {
    errors.push(
      `schema authoring providers diverge from the canonical catalog: ${schemaProviderDiagnostics
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | ")}`,
    );
  }

  for (const documentType of requireArray(catalog.document_types, "catalog.document_types")) {
    const branch = branchByType(schema, documentType.id);
    if (!branch) continue;
    const expectedBody = requireArray(
      documentType.body_sections,
      `${documentType.id}.body_sections`,
    )
      .filter(
        (section) =>
          section.content_kind !== "controlled_scalar_label" &&
          !(
            documentType.id === "security-requirement" &&
            ["parent_functional_requirement", "finding_derivation"].includes(
              section.input_name,
            )
          ),
      )
      .map((section) => section.input_name)
      .sort(compare);
    const actualBody = Object.keys(branch.properties?.body?.properties ?? {}).sort(compare);
    if (JSON.stringify(expectedBody) !== JSON.stringify(actualBody)) {
      errors.push(`${documentType.id} body properties diverge from the canonical profile.`);
    }
  }

  const macros = requireArray(catalog.macro_requirements, "catalog.macro_requirements");
  for (const type of ["functional-requirement", "governance-requirement"]) {
    const branch = branchByType(schema, type);
    for (const macro of macros) {
      const condition = requireArray(branch.allOf, `${type}.allOf`).find(
        (entry) =>
          entry.if?.properties?.macro_requirement_id?.const === macro.id &&
          entry.then?.properties?.decision_id,
      );
      const actual = condition?.then?.properties?.decision_id?.enum ?? [];
      const expected = requireArray(macro.decisions, `${macro.id}.decisions`)
        .map((entry) => entry.id)
        .sort(compare);
      if (JSON.stringify([...actual].sort(compare)) !== JSON.stringify(expected)) {
        errors.push(`${type} Decision projection diverges for ${macro.id}.`);
      }
    }
  }

  const governanceBranch = branchByType(schema, "governance-requirement");
  for (const macro of macros) {
    for (const decision of requireArray(macro.decisions, `${macro.id}.decisions`)) {
      const condition = requireArray(governanceBranch.allOf, "governance.allOf").find(
        (entry) =>
          entry.if?.properties?.macro_requirement_id?.const === macro.id &&
          entry.if?.properties?.decision_id?.const === decision.id,
      );
      const actual = condition?.then === false
        ? []
        : condition?.then?.properties?.parent_requirement_id?.enum ?? [];
      const expected = requireArray(
        decision.requirements,
        `${macro.id}/${decision.id}.requirements`,
      )
        .filter((entry) => entry.requirement_type === "functional")
        .map((entry) => entry.id)
        .sort(compare);
      if (JSON.stringify([...actual].sort(compare)) !== JSON.stringify(expected)) {
        errors.push(`governance parent projection diverges for ${macro.id}/${decision.id}.`);
      }
    }
  }

  const metadata = requireObject(schema["x-threatforge"], "schema.x-threatforge");
  if (
    JSON.stringify([...metadata.generated_fields].sort(compare)) !==
    JSON.stringify([...expectedGeneratedFields].sort(compare))
  ) {
    errors.push("schema generated_fields diverge from the governed authoring contract.");
  }
  if (metadata.request_suffix !== ".governed-document-authoring.yml") {
    errors.push("schema request_suffix diverges from the governed authoring request suffix.");
  }
  if (
    JSON.stringify([...metadata.supported_document_types].sort(compare)) !==
    JSON.stringify(schemaProviders.map((provider) => provider.model_id).sort(compare))
  ) {
    errors.push("schema supported_document_types diverge from its provider catalog.");
  }
  const catalogSources = requireArray(catalog.sources, "catalog.sources")
    .map((entry) => entry.path)
    .sort(compare);
  const schemaSources = requireArray(metadata.sources, "schema.x-threatforge.sources")
    .map((entry) => entry.path)
    .sort(compare);
  if (JSON.stringify(catalogSources) !== JSON.stringify(schemaSources)) {
    errors.push("schema source projection diverges from the authoring catalog.");
  }
  return errors.sort(compare);
}

function applyMutation(catalog, schema, mutation) {
  const mutatedCatalog = clone(catalog);
  const mutatedSchema = clone(schema);
  if (mutation === "remove-governance-document-type") {
    mutatedCatalog.document_types = mutatedCatalog.document_types.filter(
      (entry) => entry.id !== "governance-requirement",
    );
  } else if (mutation === "add-unsupported-document-type") {
    mutatedCatalog.document_types.push({
      ...mutatedCatalog.document_types[0],
      id: "unsupported",
    });
  } else if (mutation === "remove-functional-acceptance-schema-field") {
    delete branchByType(mutatedSchema, "functional-requirement").properties.body.properties
      .acceptance;
  } else if (mutation === "leak-decision-across-macro") {
    const branch = branchByType(mutatedSchema, "functional-requirement");
    const condition = branch.allOf.find(
      (entry) =>
        entry.if?.properties?.macro_requirement_id?.const === "MR-0002" &&
        entry.then?.properties?.decision_id,
    );
    condition.then.properties.decision_id.enum.push("ADR-9999");
  } else if (mutation === "add-governance-parent-from-other-decision") {
    const branch = branchByType(mutatedSchema, "governance-requirement");
    const condition = branch.allOf.find(
      (entry) =>
        entry.if?.properties?.macro_requirement_id?.const === "MR-0002" &&
        entry.if?.properties?.decision_id?.const === "ADR-0005",
    );
    condition.then.properties.parent_requirement_id.enum.push(
      "MR-0002ADR-0001REQ-0001",
    );
  } else if (mutation === "remove-generated-body-path") {
    mutatedSchema["x-threatforge"].generated_fields = mutatedSchema[
      "x-threatforge"
    ].generated_fields.filter((entry) => entry !== "body_path");
  } else if (mutation === "restore-requirement-only-suffix") {
    mutatedSchema["x-threatforge"].request_suffix = ".invalid-authoring.yml";
  } else if (mutation === "remove-schema-source") {
    mutatedSchema["x-threatforge"].sources.pop();
  } else {
    throw new Error(`Unsupported negative fixture mutation: ${mutation}`);
  }
  return { catalog: mutatedCatalog, schema: mutatedSchema };
}

function runNegativeFixtures(catalog, schema) {
  const registry = requireObject(
    JSON.parse(fs.readFileSync(resolveProjectPath(fixtureRegistryProjectPath), "utf8")),
    "fixture registry",
  );
  if (registry.registry_id !== "governed-document-authoring-contract-negative-fixtures") {
    throw new Error("Unexpected authoring negative fixture registry id.");
  }
  const results = [];
  for (const fixtureValue of requireArray(registry.fixtures, "fixture registry fixtures")) {
    const fixture = requireObject(fixtureValue, "authoring fixture");
    const mutated = applyMutation(
      catalog,
      schema,
      requireString(fixture.mutation, `${fixture.id}.mutation`),
    );
    const errors = validateGovernedDocumentAuthoringContract(
      mutated.catalog,
      mutated.schema,
    );
    const expected = requireString(
      fixture.expected_error_contains,
      `${fixture.id}.expected_error_contains`,
    );
    if (!errors.some((error) => error.includes(expected))) {
      throw new Error(
        `Negative fixture ${fixture.id} did not produce expected diagnostic ${expected}. Actual: ${errors.join(" | ")}`,
      );
    }
    results.push({ id: fixture.id, errors });
  }
  return results;
}

function runTests() {
  const result = spawnSync(
    process.execPath,
    ["--test", ...testProjectPaths.map(resolveProjectPath)],
    {
      cwd: rootDir,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      `Authoring verification suites failed:\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }
  return result.stdout;
}

function main() {
  const statusBefore = gitStatus();
  const firstCatalog = runJsonBuilder(
    catalogBuilderProjectPath,
    "Governed document authoring catalog builder",
  );
  const secondCatalog = runJsonBuilder(
    catalogBuilderProjectPath,
    "Governed document authoring catalog builder",
  );
  if (firstCatalog.text !== secondCatalog.text) {
    throw new Error("Governed document authoring catalog output is not deterministic.");
  }
  const firstSchema = runJsonBuilder(
    schemaBuilderProjectPath,
    "Governed document authoring schema builder",
  );
  const secondSchema = runJsonBuilder(
    schemaBuilderProjectPath,
    "Governed document authoring schema builder",
  );
  if (firstSchema.text !== secondSchema.text) {
    throw new Error("Governed document authoring schema output is not deterministic.");
  }
  const errors = validateGovernedDocumentAuthoringContract(
    firstCatalog.value,
    firstSchema.value,
  );
  if (errors.length > 0) throw new Error(errors.join("\n"));
  const fixtures = runNegativeFixtures(firstCatalog.value, firstSchema.value);
  const testOutput = runTests();
  if (gitStatus() !== statusBefore) {
    throw new Error("Governed document authoring contract verification changed the working tree.");
  }
  console.log("Governed document authoring contract check passed.");
  console.log("Implemented requirement: MR-0002ADR-0004REQ-0004");
  console.log("Implemented requirement: MR-0002ADR-0004REQ-0004GOV-0001");
  console.log("Implemented requirement: MR-0002ADR-0005REQ-0003");
  console.log("Implemented requirement: MR-0002ADR-0005REQ-0003GOV-0001");
  console.log(`Catalog sources checked: ${firstCatalog.value.sources.length}`);
  console.log(`Document types checked: ${firstCatalog.value.document_types.length}`);
  const runtimeProviders = resolveGovernedDocumentAuthoringProviders({
    rootDir,
    catalog: firstCatalog.value,
  });
  const schemaProviders = resolveSecurityRequirementAuthoringSchemaProviders({
    catalog: firstCatalog.value,
    providers: governedDocumentAuthoringSchemaProviders,
    referenceService: createSecurityRequirementAuthoringReferenceService({
      rootDir,
    }),
  });
  console.log(`Runtime authoring providers checked: ${runtimeProviders.length}`);
  console.log(`Schema authoring providers checked: ${schemaProviders.length}`);
  console.log(`Macro-requirements checked: ${firstCatalog.value.macro_requirements.length}`);
  console.log(`Negative fixtures checked: ${fixtures.length}`);
  const match = testOutput.match(/(?:#|ℹ)\s*tests\s+(\d+)/u);
  console.log(`Authoring tests checked: ${match ? match[1] : "unknown"}`);
  console.log("Warnings: 0");
  console.log("Errors: 0");
}

try {
  main();
} catch (error) {
  console.error("Governed document authoring contract check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
