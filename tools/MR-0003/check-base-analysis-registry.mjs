#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * @file Canonical BAE registry consistency checker and reference-occurrence materializer.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0005
 * @implementsRequirement MR-0003ADR-0001REQ-0005GOV-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @derivedFromDecision MR-0003/ADR-0002
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Default mode validates canonical BAE identity, taxonomy, provenance, source
 * continuity and the reference-occurrence projection persisted inside the BAE
 * registry. Explicit materialization modes replace only the managed
 * reference_occurrences field for every already-registered BAE.
 *
 * Side effects:
 * - default mode reads governed sources and writes only the derived report;
 * - --write-reference-occurrences atomically updates only managed
 *   reference_occurrences fields in the canonical BAE registry;
 * - --check-reference-occurrences is read-only and fails when those fields are
 *   absent or stale;
 * - no mode creates BAE identities or changes authored semantic fields.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = path.resolve(
  process.env.TF_BASE_ANALYSIS_REGISTRY_ROOT ??
    path.resolve(scriptDir, "..", ".."),
);
const inventoryProjectPath =
  "docs/reference/project-model/registers/base-analysis/base-analysis-elements.registry.yml";
const fixturePath = path.resolve(
  rootDir,
  process.env.TF_BASE_ANALYSIS_REGISTRY_FIXTURES ??
    "tools/MR-0003/fixtures/base-analysis-registry/negative-fixtures.json",
);
const continuityFixturePath = path.resolve(
  rootDir,
  process.env.TF_BASE_ANALYSIS_CONTINUITY_FIXTURES ??
    "tools/MR-0003/fixtures/base-analysis-registry/source-continuity-fixtures.json",
);
const verificationTestPath = path.resolve(
  rootDir,
  "tools/MR-0003/test/base-analysis-registry.test.mjs",
);
const reportDir = path.resolve(
  rootDir,
  process.env.TF_BASE_ANALYSIS_REGISTRY_REPORT_DIR ??
    "artifacts/base-analysis-registry",
);
const disableReports =
  process.env.TF_BASE_ANALYSIS_REGISTRY_DISABLE_REPORTS === "1";
const skipFixtures =
  process.env.TF_BASE_ANALYSIS_REGISTRY_SKIP_NEGATIVE_FIXTURES === "1";

const implementedRequirementIds = Object.freeze([
  "MR-0003ADR-0001REQ-0005",
  "MR-0003ADR-0001REQ-0005GOV-0001",
  "MR-0003ADR-0002REQ-0001",
  "MR-0003ADR-0002REQ-0001GOV-0001",
]);

const occurrenceFieldName = "reference_occurrences";
const occurrenceFieldOrder = Object.freeze([
  "bae_id",
  "document_model",
  "document_id",
  "body_path",
  "profile_id",
  "position_id",
  "line",
  "column",
  "source_offset",
  "canonical_payload",
]);

function text(value) {
  return String(value ?? "").trim();
}

function normalizeProjectPath(value) {
  return text(value).replaceAll("\\", "/").replace(/^\.\//u, "");
}

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeNewlines(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n?/gu, "\n");
}

function occurrenceOrderKey(entry) {
  return [
    text(entry?.bae_id),
    text(entry?.document_model),
    text(entry?.document_id),
    normalizeProjectPath(entry?.body_path),
    text(entry?.profile_id),
    text(entry?.position_id),
    String(Number(entry?.source_offset ?? 0)).padStart(12, "0"),
    String(Number(entry?.line ?? 0)).padStart(8, "0"),
    String(Number(entry?.column ?? 0)).padStart(8, "0"),
  ].join("|");
}

function canonicalOccurrenceRecord(entry, fallbackBaeId = "") {
  if (!isRecord(entry)) {
    throw new Error("Every reference_occurrences entry must be a mapping.");
  }
  const record = {
    bae_id: text(entry.bae_id || fallbackBaeId),
    document_model: text(entry.document_model),
    document_id: text(entry.document_id),
    body_path: normalizeProjectPath(entry.body_path),
    profile_id: text(entry.profile_id),
    position_id: text(entry.position_id),
    line: Number(entry.line),
    column: Number(entry.column),
    source_offset: Number(entry.source_offset),
    canonical_payload: text(entry.canonical_payload),
  };
  for (const field of occurrenceFieldOrder) {
    const value = record[field];
    if (
      (typeof value === "string" && !value) ||
      (typeof value === "number" && (!Number.isInteger(value) || value < 0))
    ) {
      throw new Error(
        `Reference occurrence field ${field} is missing or invalid for ${record.bae_id || "<unknown BAE>"}.`,
      );
    }
  }
  if (!/^BAE-\d{4}$/u.test(record.bae_id)) {
    throw new Error(
      `Invalid BAE occurrence identifier: ${record.bae_id || "<empty>"}.`,
    );
  }
  if (record.line < 1 || record.column < 1) {
    throw new Error(
      `Reference occurrence line and column must be positive for ${record.bae_id}.`,
    );
  }
  return record;
}

/**
 * Flattens the managed per-BAE occurrence fields for canonical comparison.
 *
 * @param {Record<string, unknown>} inventory - Parsed BAE registry.
 * @returns {Array<Record<string, unknown>>} Stable occurrence projection.
 */
export function readStoredReferenceOccurrences(inventory) {
  const occurrences = [];
  for (const element of Array.isArray(inventory?.elements)
    ? inventory.elements
    : []) {
    if (!isRecord(element)) continue;
    const baeId = text(element.id);
    const stored = element[occurrenceFieldName];
    if (stored === undefined) {
      throw new Error(
        `${baeId || "<unknown BAE>"}.${occurrenceFieldName} is missing; run the registered occurrence materializer.`,
      );
    }
    if (!Array.isArray(stored)) {
      throw new Error(
        `${baeId || "<unknown BAE>"}.${occurrenceFieldName} must be a list.`,
      );
    }
    for (const entry of stored) {
      occurrences.push(canonicalOccurrenceRecord(entry, baeId));
    }
  }
  return occurrences.sort((left, right) =>
    compare(occurrenceOrderKey(left), occurrenceOrderKey(right)),
  );
}

function yamlScalar(value) {
  if (typeof value === "number") return String(value);
  const normalized = String(value ?? "").replace(/\r?\n/gu, " ");
  // JSON double-quoted strings are valid YAML 1.2 scalars and prevent values
  // such as `[BAE-0001] Title` from being parsed as malformed flow syntax.
  return JSON.stringify(normalized);
}

function renderReferenceOccurrenceBlock(occurrences) {
  if (occurrences.length === 0) {
    return [`    ${occurrenceFieldName}: []`];
  }
  const lines = [`    ${occurrenceFieldName}:`];
  for (const occurrence of occurrences) {
    const record = canonicalOccurrenceRecord(occurrence);
    for (const [index, field] of occurrenceFieldOrder.entries()) {
      lines.push(
        `${index === 0 ? "      - " : "        "}${field}: ${yamlScalar(record[field])}`,
      );
    }
  }
  return lines;
}

function countIndent(line) {
  return String(line).match(/^ */u)?.[0].length ?? 0;
}

function removeManagedOccurrenceBlock(blockLines) {
  const output = [];
  for (let index = 0; index < blockLines.length; index += 1) {
    const line = blockLines[index];
    if (
      line.trim() !== `${occurrenceFieldName}:` &&
      line.trim() !== `${occurrenceFieldName}: []`
    ) {
      output.push(line);
      continue;
    }
    if (countIndent(line) !== 4) {
      output.push(line);
      continue;
    }
    index += 1;
    while (index < blockLines.length) {
      const candidate = blockLines[index];
      if (candidate.trim() && countIndent(candidate) <= 4) {
        index -= 1;
        break;
      }
      index += 1;
    }
  }
  return output;
}

/**
 * Replaces only managed per-element reference_occurrences fields.
 *
 * @param {string} registryText - Complete canonical BAE registry YAML.
 * @param {Array<Record<string, unknown>>} occurrenceProjection - Derived projection.
 * @returns {string} Deterministically materialized YAML text.
 */
export function materializeReferenceOccurrencesInRegistryText(
  registryText,
  occurrenceProjection,
) {
  const lines = normalizeNewlines(registryText)
    .replace(/\n$/u, "")
    .split("\n");
  const occurrencesByBae = new Map();
  for (const entry of Array.isArray(occurrenceProjection)
    ? occurrenceProjection
    : []) {
    const record = canonicalOccurrenceRecord(entry);
    if (!occurrencesByBae.has(record.bae_id)) {
      occurrencesByBae.set(record.bae_id, []);
    }
    occurrencesByBae.get(record.bae_id).push(record);
  }
  for (const entries of occurrencesByBae.values()) {
    entries.sort((left, right) =>
      compare(occurrenceOrderKey(left), occurrenceOrderKey(right)),
    );
  }

  const elementStarts = [];
  for (const [index, line] of lines.entries()) {
    const match = line.match(/^  - id:\s*(BAE-\d{4})\s*$/u);
    if (match) elementStarts.push({ index, baeId: match[1] });
  }
  const relationsIndex = lines.findIndex((line) =>
    /^relations:\s*/u.test(line),
  );
  if (relationsIndex < 0) {
    throw new Error("BAE registry must contain the top-level relations field.");
  }

  const registeredIds = new Set(elementStarts.map((entry) => entry.baeId));
  for (const baeId of occurrencesByBae.keys()) {
    if (!registeredIds.has(baeId)) {
      throw new Error(
        `Derived occurrence references ${baeId}, but that BAE is not manually registered.`,
      );
    }
  }

  for (
    let blockIndex = elementStarts.length - 1;
    blockIndex >= 0;
    blockIndex -= 1
  ) {
    const current = elementStarts[blockIndex];
    const nextStart =
      blockIndex + 1 < elementStarts.length
        ? elementStarts[blockIndex + 1].index
        : relationsIndex;
    const block = removeManagedOccurrenceBlock(
      lines.slice(current.index, nextStart),
    );
    const insertionIndex = block.findIndex(
      (line) =>
        line.trim() === "source_history:" && countIndent(line) === 4,
    );
    if (insertionIndex < 0) {
      throw new Error(
        `BAE ${current.baeId} must contain source_history before occurrence materialization.`,
      );
    }
    const materializedBlock = [
      ...block.slice(0, insertionIndex),
      ...renderReferenceOccurrenceBlock(
        occurrencesByBae.get(current.baeId) ?? [],
      ),
      ...block.slice(insertionIndex),
    ];
    lines.splice(
      current.index,
      nextStart - current.index,
      ...materializedBlock,
    );
  }

  return `${lines.join("\n")}\n`;
}

function writeAtomically(absolutePath, content) {
  const directory = path.dirname(absolutePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = path.join(
    directory,
    `.${path.basename(absolutePath)}.${process.pid}.${Date.now()}.tmp`,
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
        fs.rmSync(temporaryPath, { force: true });
      }
    } catch {
      // Preserve the materialization failure.
    }
    throw new Error(
      `Cannot atomically materialize ${inventoryProjectPath}: ${error.message}`,
    );
  }
}

async function loadRegistryModules() {
  const registryModule = await import("./lib/base-analysis-registry.mjs");
  const yamlModule = await import("../MR-0001/lib/governed-yaml.mjs");
  return { ...registryModule, ...yamlModule };
}

/**
 * Rejects materialization before any write when the canonical BAE model is
 * invalid, including a manually registered BAE missing from its declared
 * governed-document origin.
 *
 * @param {Record<string, unknown>} canonical - Canonical BAE validation result.
 * @returns {Array<Record<string, unknown>>} Valid occurrence projection.
 */
export function requireValidReferenceOccurrenceMaterializationInput(canonical) {
  if (!isRecord(canonical) || canonical.valid !== true) {
    const diagnostics = Array.isArray(canonical?.errors)
      ? canonical.errors
          .map((entry) =>
            isRecord(entry)
              ? `${text(entry.rule_id)}: ${text(entry.message)}`
              : text(entry),
          )
          .filter(Boolean)
          .join("\n")
      : "";
    throw new Error(
      "Cannot derive BAE reference occurrences from an invalid canonical model" +
        (diagnostics ? `:\n${diagnostics}` : "."),
    );
  }
  return Array.isArray(canonical.occurrence_projection)
    ? canonical.occurrence_projection
    : [];
}

async function buildReferenceOccurrenceMaterialization() {
  const {
    loadAndValidateBaseAnalysisRegistry,
    canonicalBaseAnalysisRegistryPaths,
  } = await loadRegistryModules();
  const canonical = loadAndValidateBaseAnalysisRegistry({ rootDir });
  const occurrenceProjection =
    requireValidReferenceOccurrenceMaterializationInput(canonical);
  const projectPath =
    canonicalBaseAnalysisRegistryPaths?.inventory ?? inventoryProjectPath;
  const absolutePath = path.resolve(rootDir, ...projectPath.split("/"));
  const currentText = fs.readFileSync(absolutePath, "utf8");
  const expectedText = materializeReferenceOccurrencesInRegistryText(
    currentText,
    occurrenceProjection,
  );
  return {
    canonical,
    projectPath,
    absolutePath,
    currentText: normalizeNewlines(currentText),
    expectedText,
  };
}

/**
 * Writes or checks the deterministic BAE occurrence projection.
 *
 * @param {"write"|"check"} mode - Explicit materialization mode.
 * @returns {Promise<Record<string, unknown>>} Materialization result.
 */
export async function materializeBaseAnalysisReferenceOccurrences(mode) {
  if (mode !== "write" && mode !== "check") {
    throw new Error(
      `Unsupported BAE occurrence materialization mode: ${mode}.`,
    );
  }
  const generated = await buildReferenceOccurrenceMaterialization();
  const currentComparable = `${generated.currentText.replace(/\n$/u, "")}\n`;

  if (mode === "check") {
    if (currentComparable !== generated.expectedText) {
      throw new Error(
        `Materialized BAE reference occurrences are stale: ${generated.projectPath}. ` +
          "Run this tool with --write-reference-occurrences.",
      );
    }
    return {
      mode,
      status: "current",
      path: generated.projectPath,
      occurrences: generated.canonical.occurrence_count ?? 0,
      elements: generated.canonical.element_count ?? 0,
    };
  }

  let status = "current";
  if (currentComparable !== generated.expectedText) {
    writeAtomically(generated.absolutePath, generated.expectedText);
    status = "updated";
  }
  return {
    mode,
    status,
    path: generated.projectPath,
    occurrences: generated.canonical.occurrence_count ?? 0,
    elements: generated.canonical.element_count ?? 0,
  };
}

function sourceKey(source) {
  return [
    String(source?.source_kind ?? source?.kind ?? "").trim(),
    String(source?.source_id ?? "").trim(),
    String(source?.source_path ?? "").replaceAll("\\", "/").trim(),
  ].join("|");
}

function fixtureResult(caseRecord, registryModule) {
  const existing = new Set(
    (caseRecord.existing_sources ?? []).map(sourceKey),
  );
  return registryModule.validateBaseAnalysisRegistrySources({
    inventory: caseRecord.inventory,
    taxonomies: caseRecord.taxonomies,
    candidateProjection: caseRecord.candidate_projection,
    sourceResolver: (source) => existing.has(sourceKey(source)),
  });
}

function runNegativeFixtures(registryModule) {
  if (skipFixtures) return { checked: 0, errors: [] };
  if (!fs.existsSync(fixturePath)) {
    return {
      checked: 0,
      errors: [`Missing BAE negative fixture file: ${fixturePath}`],
    };
  }

  let fixtureSet;
  try {
    fixtureSet = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  } catch (error) {
    return {
      checked: 0,
      errors: [`Cannot parse BAE fixture file: ${error.message}`],
    };
  }

  const cases = Array.isArray(fixtureSet.cases) ? fixtureSet.cases : [];
  const errors = [];
  const knownRuleIds = new Set(
    Object.values(registryModule.baseAnalysisRegistryRuleIds),
  );

  for (const fixture of cases) {
    const id = String(fixture?.id ?? "<unknown fixture>");
    const expected = Array.isArray(fixture?.expected_rule_ids)
      ? fixture.expected_rule_ids.map(String)
      : [];
    for (const ruleId of expected) {
      if (!knownRuleIds.has(ruleId)) {
        errors.push(`${id}: expected unknown stable rule id ${ruleId}.`);
      }
    }
    const result = fixtureResult(fixture, registryModule);
    const actual = new Set(result.errors.map((entry) => entry.rule_id));
    for (const ruleId of expected) {
      if (!actual.has(ruleId)) {
        errors.push(`${id}: expected rule ${ruleId} was not emitted.`);
      }
    }
    if (expected.length === 0) {
      errors.push(`${id}: negative fixture must declare expected_rule_ids.`);
    }
  }

  return { checked: cases.length, errors };
}

function countSourceContinuityFixtures() {
  if (!fs.existsSync(continuityFixturePath)) {
    return {
      checked: 0,
      errors: [
        `Missing BAE source-continuity fixture file: ${continuityFixturePath}`,
      ],
    };
  }
  try {
    const fixtureSet = JSON.parse(
      fs.readFileSync(continuityFixturePath, "utf8"),
    );
    const cases = Array.isArray(fixtureSet.cases) ? fixtureSet.cases : [];
    if (cases.length < 15) {
      return {
        checked: cases.length,
        errors: [
          `BAE source-continuity fixture coverage is incomplete: ${cases.length}.`,
        ],
      };
    }
    return { checked: cases.length, errors: [] };
  } catch (error) {
    return {
      checked: 0,
      errors: [
        `Cannot parse BAE source-continuity fixtures: ${error.message}`,
      ],
    };
  }
}

function parseTestCount(output) {
  const match = String(output ?? "").match(/(?:#|ℹ)\s*tests\s+(\d+)/u);
  return match ? Number(match[1]) : 0;
}

function runVerificationTests() {
  const result = spawnSync(
    process.execPath,
    ["--test", verificationTestPath],
    {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
    },
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.error || result.status !== 0) {
    return {
      checked: parseTestCount(output),
      errors: [`BAE verification suite failed:\n${output.trim()}`],
    };
  }
  const checked = parseTestCount(output);
  if (checked < 10) {
    return {
      checked,
      errors: [`BAE verification suite count is incomplete: ${checked}.`],
    };
  }
  return { checked, errors: [] };
}

async function runCanonicalCheck() {
  const registryModule = await loadRegistryModules();
  let storedOccurrenceProjection;
  let storedOccurrenceProjectionError = "";
  try {
    const inventoryPath = path.resolve(
      rootDir,
      ...inventoryProjectPath.split("/"),
    );
    const inventory = registryModule.readGovernedYamlFile(inventoryPath);
    storedOccurrenceProjection = readStoredReferenceOccurrences(inventory);
  } catch (error) {
    storedOccurrenceProjection = undefined;
    storedOccurrenceProjectionError =
      `Cannot read materialized BAE reference occurrences: ${error.message}`;
  }

  const canonical = registryModule.loadAndValidateBaseAnalysisRegistry({
    rootDir,
    candidateOccurrenceProjection: storedOccurrenceProjection,
  });
  const fixtures = runNegativeFixtures(registryModule);
  const continuityFixtures = countSourceContinuityFixtures();
  const verification = runVerificationTests();
  const errors = [
    ...(storedOccurrenceProjectionError
      ? [storedOccurrenceProjectionError]
      : []),
    ...canonical.errors.map(
      (entry) => `${entry.rule_id}: ${entry.message}`,
    ),
    ...fixtures.errors,
    ...continuityFixtures.errors,
    ...verification.errors,
  ];
  const warnings = canonical.warnings.map(
    (entry) => entry.message ?? String(entry),
  );

  const report = {
    schema_version: 1,
    check_id: "base-analysis-registry-consistency",
    implemented_requirement_ids: implementedRequirementIds,
    valid: errors.length === 0,
    element_count: canonical.element_count,
    relation_count: canonical.relation_count,
    projection_count: canonical.projection.length,
    source_history_count: canonical.source_history_count ?? 0,
    origin_evidence_count: canonical.origin_evidence_count ?? 0,
    reference_occurrence_count: canonical.occurrence_count ?? 0,
    materialized_reference_occurrence_count:
      storedOccurrenceProjection?.length ?? 0,
    negative_fixtures_checked: fixtures.checked,
    source_continuity_fixtures_checked: continuityFixtures.checked,
    verification_tests_checked: verification.checked,
    warnings,
    errors,
    projection: canonical.projection,
    reference_occurrences: canonical.occurrence_projection ?? [],
  };

  if (!disableReports) {
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportDir, "base-analysis-registry.report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
  }

  if (errors.length > 0) {
    console.error("Base Analysis registry check failed.");
    for (const requirementId of implementedRequirementIds) {
      console.error(`Implemented requirement: ${requirementId}`);
    }
    for (const error of errors) console.error(`ERROR: ${error}`);
    for (const warning of warnings) console.error(`WARNING: ${warning}`);
    console.error(`Elements checked: ${canonical.element_count}`);
    console.error(`Relations checked: ${canonical.relation_count}`);
    console.error(
      `Source histories checked: ${canonical.source_history_count ?? 0}`,
    );
    console.error(
      `Origin evidence occurrences checked: ${canonical.origin_evidence_count ?? 0}`,
    );
    console.error(
      `Reference occurrences checked: ${canonical.occurrence_count ?? 0}`,
    );
    console.error(
      `Materialized reference occurrences checked: ${storedOccurrenceProjection?.length ?? 0}`,
    );
    console.error(`Negative fixtures checked: ${fixtures.checked}`);
    console.error(
      `Source continuity fixtures checked: ${continuityFixtures.checked}`,
    );
    console.error(`Verification tests checked: ${verification.checked}`);
    console.error(`Warnings: ${warnings.length}`);
    console.error(`Errors: ${errors.length}`);
    process.exitCode = 1;
    return;
  }

  console.log("Base Analysis registry check passed.");
  for (const requirementId of implementedRequirementIds) {
    console.log(`Implemented requirement: ${requirementId}`);
  }
  console.log(`Elements checked: ${canonical.element_count}`);
  console.log(`Relations checked: ${canonical.relation_count}`);
  console.log(
    `Source histories checked: ${canonical.source_history_count ?? 0}`,
  );
  console.log(
    `Origin evidence occurrences checked: ${canonical.origin_evidence_count ?? 0}`,
  );
  console.log(
    `Reference occurrences checked: ${canonical.occurrence_count ?? 0}`,
  );
  console.log(
    `Materialized reference occurrences checked: ${storedOccurrenceProjection?.length ?? 0}`,
  );
  console.log(
    `Reference-source entries checked: ${canonical.projection.length}`,
  );
  console.log(`Negative fixtures checked: ${fixtures.checked}`);
  console.log(
    `Source continuity fixtures checked: ${continuityFixtures.checked}`,
  );
  console.log(`Verification tests checked: ${verification.checked}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log("Errors: 0");
  if (!disableReports) {
    console.log(
      `Report: ${path
        .relative(
          rootDir,
          path.join(reportDir, "base-analysis-registry.report.json"),
        )
        .replaceAll("\\", "/")}`,
    );
  }
}

function parseMode(args) {
  if (args.length === 0) return "check";
  if (
    args.length === 1 &&
    args[0] === "--write-reference-occurrences"
  ) {
    return "materialize-write";
  }
  if (
    args.length === 1 &&
    args[0] === "--check-reference-occurrences"
  ) {
    return "materialize-check";
  }
  throw new Error(
    "Supported invocations: no arguments, --write-reference-occurrences, or --check-reference-occurrences.",
  );
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "check") {
    await runCanonicalCheck();
    return;
  }
  const result = await materializeBaseAnalysisReferenceOccurrences(
    mode === "materialize-write" ? "write" : "check",
  );
  console.log("BAE reference occurrence materialization succeeded.");
  console.log(`Mode: ${result.mode}`);
  console.log(`Status: ${result.status}`);
  console.log(`Path: ${result.path}`);
  console.log(`Elements: ${result.elements}`);
  console.log(`Occurrences: ${result.occurrences}`);
}

const directExecutionUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === directExecutionUrl) {
  main().catch((error) => {
    console.error(`Base Analysis registry operation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
