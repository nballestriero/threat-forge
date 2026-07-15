#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readGovernedYamlFile } from "../MR-0001/lib/governed-yaml.mjs";
import {
  createDiagnostic,
  resolveSafeProjectPath,
  sortDiagnostics,
} from "../MR-0001/lib/governed-document-model-validation.mjs";

/**
 * @file Transitional Requirement body header checker.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0002GOV-0002
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * This implementation validates only Functional Requirement and Governance
 * Requirement records while their complete-model validators remain planned.
 * Macro-requirement and Decision headers are owned exclusively by their active
 * complete-model checkers.
 *
 * The transitional checker and its fixtures must be removed after the
 * Functional Requirement and Governance Requirement complete-model checkers
 * are active.
 *
 * Side effects: reads governed Requirement registries and bodies,
 * executes deterministic negative fixtures, writes reports under
 * artifacts/governed-body-headers and exits non-zero on validation failure.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDir, "..", "..");
const rootDir = process.env.TF_GOVERNED_BODY_HEADERS_ROOT
  ? path.resolve(process.env.TF_GOVERNED_BODY_HEADERS_ROOT)
  : defaultRootDir;

const requirementsDirProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_REQUIREMENTS_DIR ??
  "docs/reference/project-model/registers/requirements";
const reportDirProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_REPORT_DIR ??
  "artifacts/governed-body-headers";
const negativeFixturesRegistryProjectPath =
  process.env.TF_GOVERNED_BODY_HEADERS_NEGATIVE_FIXTURES_REGISTRY_PATH ??
  "tools/MR-0002/fixtures/governed-body-headers/negative-fixtures.registry.yml";
const skipNegativeFixtures =
  process.env.TF_GOVERNED_BODY_HEADERS_SKIP_FIXTURES === "true";

export const transitionalBodyHeaderRuleIds = Object.freeze({
  registryIdentity: "transitional-body-header.registry.identity",
  registryTitle: "transitional-body-header.registry.title",
  registryBodyPath: "transitional-body-header.registry.body-path",
  bodyExists: "transitional-body-header.body.exists",
  bodyH1Cardinality: "transitional-body-header.body.h1.cardinality",
  bodyH1Separator: "transitional-body-header.body.h1.separator",
  bodyH1Mirror: "transitional-body-header.body.h1.mirror",
});

function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/").trim();
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n/gu, "\n");
}

function diagnostic(ruleId, representation, sourcePath, location, message) {
  return createDiagnostic(
    ruleId,
    "requirement",
    representation,
    sourcePath,
    location,
    message,
  );
}

function extractH1Lines(text) {
  const h1Lines = [];
  let insideFence = false;
  const lines = String(text ?? "").replace(/\r\n/gu, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    if (/^```/u.test(line.trim())) {
      insideFence = !insideFence;
      continue;
    }
    if (!insideFence && /^#(?!#)\s+/u.test(line)) {
      h1Lines.push({ line, lineNumber: index + 1 });
    }
  }

  return h1Lines;
}

/**
 * Validates one Requirement record and its linked body.
 *
 * @param {{
 *   sourcePath: string,
 *   location: string,
 *   record: Record<string, unknown>,
 *   bodyExists: boolean,
 *   bodyText?: string
 * }} input - Validation input.
 * @returns {Array<Record<string, unknown>>} Stable diagnostics.
 */
export function validateTransitionalBodyHeaderRecord(input) {
  const diagnostics = [];
  const record = input.record ?? {};
  const id = String(record.id ?? "").trim();
  const title = String(record.title ?? "").trim();
  const legacyName = String(record.name ?? "").trim();
  const bodyPath = normalizeProjectPath(record.body_path);
  const location = input.location || "$";

  if (!id) {
    diagnostics.push(diagnostic(
      transitionalBodyHeaderRuleIds.registryIdentity,
      "yaml_registry",
      input.sourcePath,
      `${location}/id`,
      "Governed record must declare an id.",
    ));
  }

  if (!title || legacyName) {
    diagnostics.push(diagnostic(
      transitionalBodyHeaderRuleIds.registryTitle,
      "yaml_registry",
      input.sourcePath,
      `${location}/title`,
      legacyName
        ? `${id || "<unknown>"} uses legacy name; governed titles must use title.`
        : `${id || "<unknown>"} is missing title.`,
    ));
  }

  if (!bodyPath) {
    diagnostics.push(diagnostic(
      transitionalBodyHeaderRuleIds.registryBodyPath,
      "yaml_registry",
      input.sourcePath,
      `${location}/body_path`,
      `${id || "<unknown>"} is missing body_path.`,
    ));
    return sortDiagnostics(diagnostics);
  }

  if (!input.bodyExists) {
    diagnostics.push(diagnostic(
      transitionalBodyHeaderRuleIds.bodyExists,
      "markdown_body",
      bodyPath,
      "$",
      `${id || "<unknown>"} body file is missing: ${bodyPath}`,
    ));
    return sortDiagnostics(diagnostics);
  }

  const h1Lines = extractH1Lines(input.bodyText ?? "");
  if (h1Lines.length !== 1) {
    diagnostics.push(diagnostic(
      transitionalBodyHeaderRuleIds.bodyH1Cardinality,
      "markdown_body",
      bodyPath,
      "$",
      h1Lines.length === 0
        ? `${bodyPath} has no H1 header for ${id || "<unknown>"}.`
        : `${bodyPath} has multiple H1 headers for ${id || "<unknown>"}.`,
    ));
    return sortDiagnostics(diagnostics);
  }

  const actualHeader = h1Lines[0].line;
  const expectedHeader = `# ${id} — ${title}`;

  if (/^#\s+.+\s-\s.+$/u.test(actualHeader)) {
    diagnostics.push(diagnostic(
      transitionalBodyHeaderRuleIds.bodyH1Separator,
      "markdown_body",
      bodyPath,
      `line:${h1Lines[0].lineNumber}`,
      `${bodyPath}:${h1Lines[0].lineNumber} uses legacy hyphen separator; use em dash.`,
    ));
  }

  if (id && title && actualHeader !== expectedHeader) {
    diagnostics.push(diagnostic(
      transitionalBodyHeaderRuleIds.bodyH1Mirror,
      "markdown_body",
      bodyPath,
      `line:${h1Lines[0].lineNumber}`,
      `${bodyPath}:${h1Lines[0].lineNumber} H1 mismatch for ${id}. Expected ${JSON.stringify(expectedHeader)}, found ${JSON.stringify(actualHeader)}.`,
    ));
  }

  return sortDiagnostics(diagnostics);
}

function listRegistryPaths(baseRootDir, directoryProjectPath, pattern) {
  const resolved = resolveSafeProjectPath(baseRootDir, directoryProjectPath);
  if (!fs.existsSync(resolved.absolute)) {
    throw new Error(`Registry directory is missing: ${directoryProjectPath}`);
  }

  return fs.readdirSync(resolved.absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => `${directoryProjectPath}/${entry.name}`)
    .sort((left, right) =>
      left.localeCompare(right, "en", { numeric: true, sensitivity: "base" }),
    );
}

function collectCanonicalRecords(baseRootDir) {
  const records = [];
  const registryPaths = listRegistryPaths(
    baseRootDir,
    requirementsDirProjectPath,
    /^MR-\d{4}\.requirements\.registry\.yml$/u,
  );

  for (const sourcePath of registryPaths) {
    const registryPath = resolveSafeProjectPath(baseRootDir, sourcePath);
    const registry = readGovernedYamlFile(registryPath.absolute);
    const requirements = registry.requirements;

    if (!Array.isArray(requirements)) {
      throw new Error(`${sourcePath} must define a requirements array.`);
    }

    requirements.forEach((record, index) => {
      records.push({
        sourcePath,
        location: `/requirements/${index}`,
        record,
      });
    });
  }

  return records;
}

export function validateTransitionalBodyHeaderCorpus(baseRootDir = rootDir) {
  const records = collectCanonicalRecords(baseRootDir);
  const diagnostics = [];

  for (const entry of records) {
    const bodyPath = normalizeProjectPath(entry.record?.body_path);
    let bodyExists = false;
    let bodyText = "";

    if (bodyPath) {
      try {
        const resolved = resolveSafeProjectPath(baseRootDir, bodyPath);
        bodyExists = fs.existsSync(resolved.absolute);
        if (bodyExists) bodyText = readUtf8(resolved.absolute);
      } catch (error) {
        diagnostics.push(diagnostic(
          transitionalBodyHeaderRuleIds.registryBodyPath,
          "yaml_registry",
          entry.sourcePath,
          `${entry.location}/body_path`,
          error.message,
        ));
      }
    }

    diagnostics.push(...validateTransitionalBodyHeaderRecord({
      ...entry,
      bodyExists,
      bodyText,
    }));
  }

  return {
    recordsChecked: records.length,
    diagnostics: sortDiagnostics(diagnostics),
  };
}

function runNegativeFixtures(baseRootDir = rootDir) {
  if (skipNegativeFixtures) return { checked: 0, results: [], errors: [] };

  const registryPath = resolveSafeProjectPath(
    baseRootDir,
    negativeFixturesRegistryProjectPath,
  );
  if (!fs.existsSync(registryPath.absolute)) {
    return {
      checked: 0,
      results: [],
      errors: [`Negative fixture registry is missing: ${negativeFixturesRegistryProjectPath}`],
    };
  }

  const registry = readGovernedYamlFile(registryPath.absolute);
  const fixtures = Array.isArray(registry.fixtures) ? registry.fixtures : [];
  const results = [];
  const errors = [];
  const knownRuleIds = new Set(Object.values(transitionalBodyHeaderRuleIds));

  if (fixtures.length === 0) {
    errors.push(`${negativeFixturesRegistryProjectPath} must define a non-empty fixtures array.`);
  }

  for (const fixture of fixtures) {
    const fixturePath = normalizeProjectPath(fixture?.fixture_path);
    const expectedRuleIds = Array.isArray(fixture?.expected_rule_ids)
      ? fixture.expected_rule_ids.map((value) => String(value))
      : [];

    if (!fixture?.id || !fixturePath || expectedRuleIds.length === 0) {
      errors.push(`${negativeFixturesRegistryProjectPath} contains an invalid fixture record.`);
      continue;
    }

    for (const ruleId of expectedRuleIds) {
      if (!knownRuleIds.has(ruleId)) {
        errors.push(`${fixture.id} declares unknown expected rule id: ${ruleId}`);
      }
    }

    const resolvedFixture = resolveSafeProjectPath(baseRootDir, fixturePath);
    const payload = JSON.parse(readUtf8(resolvedFixture.absolute));
    const diagnostics = validateTransitionalBodyHeaderRecord({
      sourcePath: fixturePath,
      location: "$/record",
      record: payload.record,
      bodyExists: payload.body_exists !== false,
      bodyText: payload.body_text ?? "",
    });
    const observedRuleIds = new Set(diagnostics.map((item) => item.rule_id));
    const matched = expectedRuleIds.every((ruleId) => observedRuleIds.has(ruleId));

    results.push({
      id: fixture.id,
      expected_rule_ids: expectedRuleIds,
      observed_rule_ids: [...observedRuleIds].sort(),
      matched,
      diagnostic_count: diagnostics.length,
    });

    if (diagnostics.length === 0) {
      errors.push(`${fixture.id} negative fixture unexpectedly passed.`);
    } else if (!matched) {
      errors.push(
        `${fixture.id} did not emit every expected rule id: ${expectedRuleIds.join(", ")}`,
      );
    }
  }

  return { checked: results.length, results, errors };
}

function writeReports(validation, fixtures) {
  const reportDir = resolveSafeProjectPath(rootDir, reportDirProjectPath);
  fs.mkdirSync(reportDir.absolute, { recursive: true });

  const allErrors = [
    ...validation.diagnostics.map((item) =>
      `[${item.rule_id}] ${item.source_path} ${item.location}: ${item.message}`),
    ...fixtures.errors,
  ];

  const report = {
    checker: "transitional-requirement-body-headers",
    implemented_requirements: [
      "MR-0002ADR-0004REQ-0002GOV-0001",
      "MR-0002ADR-0004REQ-0002GOV-0002",
    ],
    scope: ["functional-requirement", "governance-requirement"],
    records_checked: validation.recordsChecked,
    negative_fixtures_checked: fixtures.checked,
    negative_fixture_results: fixtures.results,
    warnings: [],
    errors: allErrors,
  };

  fs.writeFileSync(
    path.join(reportDir.absolute, "governed-body-headers.report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  const markdown = [
    "# Transitional Requirement body headers report",
    "",
    `Records checked: ${report.records_checked}`,
    `Negative fixtures checked: ${report.negative_fixtures_checked}`,
    `Warnings: ${report.warnings.length}`,
    `Errors: ${report.errors.length}`,
    "",
    "## Errors",
    "",
    ...(report.errors.length ? report.errors.map((error) => `- ${error}`) : ["None."]),
    "",
  ].join("\n");

  fs.writeFileSync(
    path.join(reportDir.absolute, "governed-body-headers.report.md"),
    markdown,
    "utf8",
  );

  return report;
}

function isDirectExecution() {
  return process.argv[1] &&
    path.resolve(process.argv[1]) === path.resolve(scriptPath);
}

if (isDirectExecution()) {
  try {
    const validation = validateTransitionalBodyHeaderCorpus(rootDir);
    const fixtures = runNegativeFixtures(rootDir);
    const report = writeReports(validation, fixtures);

    if (report.errors.length > 0) {
      console.error("Transitional Requirement body header check failed.");
      console.error("Implemented requirement: MR-0002ADR-0004REQ-0002GOV-0001");
      console.error("Implemented requirement: MR-0002ADR-0004REQ-0002GOV-0002");
      console.error(`Records checked: ${report.records_checked}`);
      console.error(`Negative fixtures checked: ${report.negative_fixtures_checked}`);
      console.error(`Warnings: ${report.warnings.length}`);
      console.error(`Errors: ${report.errors.length}`);
      for (const error of report.errors) console.error(`- ${error}`);
      process.exit(1);
    }

    console.log("Transitional Requirement body header check passed.");
    console.log("Implemented requirement: MR-0002ADR-0004REQ-0002GOV-0001");
    console.log("Implemented requirement: MR-0002ADR-0004REQ-0002GOV-0002");
    console.log(`Records checked: ${report.records_checked}`);
    console.log(`Negative fixtures checked: ${report.negative_fixtures_checked}`);
    console.log(`Warnings: ${report.warnings.length}`);
    console.log(`Errors: ${report.errors.length}`);
  } catch (error) {
    console.error("Transitional Requirement body header check failed.");
    console.error(error.message);
    process.exit(1);
  }
}
