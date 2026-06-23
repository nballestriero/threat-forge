#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Deterministic structural guard for the governed OpenAPI contract.
 *
 * @implementsRequirement MR-0000REQ-0023
 * @derivedFromDecision MR-0000/ADR-0008
 * @macroRequirement MR-0000
 *
 * This checker validates the first governed OpenAPI contract without adding a
 * new parser or linter dependency. It intentionally performs deterministic
 * structural checks over the current contract boundary: the contract file must
 * exist, expose only approved read-only Project Documentation Explorer paths,
 * declare operation metadata and responses, and retain the required component
 * schemas used by the frontend-safe view-models.
 *
 * Side effects: reads the OpenAPI contract and graph registries, writes
 * diagnostics to stdout/stderr, and exits non-zero when the contract drifts.
 * It does not mutate files, install dependencies, start an HTTP server, perform
 * full OpenAPI JSON Schema validation, generate clients, or replace a future
 * strict OpenAPI validator.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = process.env.TF_OPENAPI_CONTRACT_ROOT
  ? path.resolve(process.env.TF_OPENAPI_CONTRACT_ROOT)
  : path.resolve(scriptDir, "..", "..", "..");
const contractProjectPath = "docs/reference/api/openapi/threat-forge.openapi.yml";
const contractPath = path.join(rootDir, contractProjectPath);
const graph0000Path = path.join(rootDir, "docs", "reference", "project-model", "registers", "graph", "GRAPH-0000.graph.yml");
const graph0002Path = path.join(rootDir, "docs", "reference", "project-model", "registers", "graph", "GRAPH-0002.graph.yml");
const errors = [];

const expectedOperations = [
  {
    path: "/api/project-model/documentation",
    operationId: "listProjectDocumentation",
    responseSchema: "DocumentationExplorerViewModel",
    requiredResponses: ["'200'", "'403'"],
  },
  {
    path: "/api/project-model/documentation/filters",
    operationId: "listProjectDocumentationFilters",
    responseSchema: "DocumentationFiltersViewModel",
    requiredResponses: ["'200'", "'403'"],
  },
  {
    path: "/api/project-model/documentation/entities/{id}",
    operationId: "getProjectDocumentationEntity",
    responseSchema: "DocumentationDetailViewModel",
    requiredResponses: ["'200'", "'403'", "'404'"],
  },
];

const requiredSchemas = [
  "EntityKind",
  "ImplementationState",
  "AcceptanceState",
  "SourceReference",
  "AccessDecision",
  "DocumentationQuery",
  "FilterValue",
  "FilterFacet",
  "DocumentationItem",
  "DocumentationBodyViewModel",
  "DocumentationSummary",
  "GraphRelation",
  "DocumentationExplorerViewModel",
  "DocumentationFiltersViewModel",
  "DocumentationDetailViewModel",
  "ErrorResponse",
];

const requiredGraphFragments = [
  "id: MR-0000REQ-0023",
  "id: TOOL-check-openapi-contract",
  "path: backend/tools/MR-0000/check-openapi-contract.mjs",
  "subject: MR-0000REQ-0023\n    predicate: implemented_by\n    object: TOOL-check-openapi-contract",
  "subject: TOOL-check-openapi-contract\n    predicate: verifies\n    object: MR-0000REQ-0023",
  "id: MR-0002API-0001",
  `path: ${contractProjectPath}`,
  "subject: MR-0002REQ-0045\n    predicate: implemented_by\n    object: MR-0002API-0001",
];

/**
 * Reads UTF-8 text from a file, removing a possible byte-order mark.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {string} File text without a leading UTF-8 BOM.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "").replace(/\r\n/gu, "\n");
}

/**
 * Converts an absolute file path to a repository-relative display path.
 *
 * @param {string} filePath - Absolute path to display.
 * @returns {string} Repository-relative path using forward slashes.
 */
function relativeProjectPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

/**
 * Records a validation diagnostic.
 *
 * @param {string} message - Human-readable diagnostic.
 * @returns {void}
 */
function addError(message) {
  errors.push(message);
}

/**
 * Ensures a file exists.
 *
 * @param {string} filePath - Absolute file path.
 * @param {string} label - Human-readable file role.
 * @returns {boolean} True when the file exists.
 */
function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    addError(`${label} is missing: ${relativeProjectPath(filePath)}`);
    return false;
  }
  return true;
}

/**
 * Escapes a string for use inside a regular expression.
 *
 * @param {string} value - Raw text.
 * @returns {string} Escaped regex text.
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Extracts a top-level YAML section by indentation.
 *
 * @param {string} text - YAML text.
 * @param {string} sectionName - Top-level key without colon.
 * @returns {string} Section text, or empty string when absent.
 */
function extractTopLevelSection(text, sectionName) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line === `${sectionName}:`);
  if (start === -1) return "";
  const sectionLines = [lines[start]];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z0-9_$-]+:/u.test(lines[index])) break;
    sectionLines.push(lines[index]);
  }
  return sectionLines.join("\n");
}

/**
 * Extracts one OpenAPI path block from the paths section.
 *
 * @param {string} pathsSection - YAML paths section text.
 * @param {string} apiPath - OpenAPI path to extract.
 * @returns {string} Path block, or empty string when absent.
 */
function extractPathBlock(pathsSection, apiPath) {
  const lines = pathsSection.split("\n");
  const pathPattern = new RegExp(`^  ${escapeRegex(apiPath)}:$`, "u");
  const start = lines.findIndex((line) => pathPattern.test(line));
  if (start === -1) return "";
  const blockLines = [lines[start]];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  \/.*:$/u.test(lines[index])) break;
    blockLines.push(lines[index]);
  }
  return blockLines.join("\n");
}

/**
 * Validates contract-level OpenAPI metadata.
 *
 * @param {string} text - OpenAPI text.
 * @returns {void}
 */
function validateContractMetadata(text) {
  for (const fragment of [
    "openapi: 3.1.0",
    "info:\n  title: threat-forge API",
    "  version: 0.1.0",
    "paths:",
    "components:",
    "  parameters:",
    "  responses:",
    "  schemas:",
  ]) {
    if (!text.includes(fragment)) {
      addError(`OpenAPI contract is missing required fragment: ${fragment}`);
    }
  }
}

/**
 * Validates that the paths section exposes only approved read-only operations.
 *
 * @param {string} pathsSection - OpenAPI paths section text.
 * @returns {void}
 */
function validatePaths(pathsSection) {
  if (!pathsSection) {
    addError("OpenAPI contract is missing the paths section.");
    return;
  }

  const methodMatches = [...pathsSection.matchAll(/^    ([a-z]+):$/gmu)].map((match) => match[1]);
  const disallowedMethods = methodMatches.filter((method) => method !== "get");
  if (disallowedMethods.length > 0) {
    addError(`OpenAPI contract must remain read-only; found method(s): ${[...new Set(disallowedMethods)].join(", ")}`);
  }

  for (const operation of expectedOperations) {
    const block = extractPathBlock(pathsSection, operation.path);
    if (!block) {
      addError(`OpenAPI contract is missing required path: ${operation.path}`);
      continue;
    }

    if (!block.includes("    get:")) {
      addError(`OpenAPI path ${operation.path} must expose a get operation.`);
    }
    if (block.includes("requestBody:")) {
      addError(`OpenAPI path ${operation.path} must not define requestBody for the read-only contract.`);
    }
    if (!block.includes(`operationId: ${operation.operationId}`)) {
      addError(`OpenAPI path ${operation.path} must use operationId ${operation.operationId}.`);
    }
    if (!block.includes("summary:")) {
      addError(`OpenAPI path ${operation.path} must define a summary.`);
    }
    if (!block.includes("responses:")) {
      addError(`OpenAPI path ${operation.path} must define responses.`);
    }
    for (const responseCode of operation.requiredResponses) {
      if (!block.includes(`${responseCode}:`)) {
        addError(`OpenAPI path ${operation.path} must define response ${responseCode}.`);
      }
    }
    if (!block.includes(`$ref: '#/components/schemas/${operation.responseSchema}'`)) {
      addError(`OpenAPI path ${operation.path} must return schema ${operation.responseSchema}.`);
    }
  }

  const declaredPathLines = pathsSection
    .split("\n")
    .filter((line) => /^  \/.*:$/u.test(line))
    .map((line) => line.trim().slice(0, -1));
  const unexpectedPaths = declaredPathLines.filter(
    (declaredPath) => !expectedOperations.some((operation) => operation.path === declaredPath),
  );
  if (unexpectedPaths.length > 0) {
    addError(`OpenAPI contract declares unexpected path(s): ${unexpectedPaths.join(", ")}`);
  }
}

/**
 * Validates required component schemas for the current view-model contract.
 *
 * @param {string} componentsSection - OpenAPI components section text.
 * @returns {void}
 */
function validateComponents(componentsSection) {
  if (!componentsSection) {
    addError("OpenAPI contract is missing the components section.");
    return;
  }

  for (const schemaName of requiredSchemas) {
    const schemaPattern = new RegExp(`^    ${escapeRegex(schemaName)}:$`, "mu");
    if (!schemaPattern.test(componentsSection)) {
      addError(`OpenAPI contract is missing required component schema: ${schemaName}`);
    }
  }

  for (const responseName of ["Forbidden", "NotFound"]) {
    const responsePattern = new RegExp(`^    ${escapeRegex(responseName)}:$`, "mu");
    if (!responsePattern.test(componentsSection)) {
      addError(`OpenAPI contract is missing required component response: ${responseName}`);
    }
  }

  for (const parameterName of [
    "MacroRequirementFilter",
    "KindFilter",
    "StatusFilter",
    "RequirementTypeFilter",
    "ImplementationStateFilter",
    "AcceptanceStateFilter",
    "SearchFilter",
  ]) {
    const parameterPattern = new RegExp(`^    ${escapeRegex(parameterName)}:$`, "mu");
    if (!parameterPattern.test(componentsSection)) {
      addError(`OpenAPI contract is missing required component parameter: ${parameterName}`);
    }
  }
}

/**
 * Validates graph traceability for the OpenAPI contract and structural checker.
 *
 * @returns {void}
 */
function validateGraphTraceability() {
  if (!requireFile(graph0000Path, "MR-0000 graph registry")) return;
  if (!requireFile(graph0002Path, "MR-0002 graph registry")) return;

  const graphText = `${readText(graph0000Path)}\n${readText(graph0002Path)}`;
  for (const fragment of requiredGraphFragments) {
    if (!graphText.includes(fragment)) {
      addError(`Project graph is missing required OpenAPI validation fragment: ${fragment}`);
    }
  }
}

if (requireFile(contractPath, "OpenAPI contract")) {
  const contractText = readText(contractPath);
  validateContractMetadata(contractText);
  validatePaths(extractTopLevelSection(contractText, "paths"));
  validateComponents(extractTopLevelSection(contractText, "components"));
}
validateGraphTraceability();

if (errors.length > 0) {
  console.error("OpenAPI contract structure check failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("OpenAPI contract structure check passed.");
console.log("Implemented requirement: MR-0000REQ-0023");
console.log(`Contract: ${contractProjectPath}`);
console.log(`Operations checked: ${expectedOperations.length}`);
console.log(`Required schemas checked: ${requiredSchemas.length}`);
console.log("Allowed HTTP methods: get");
