#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  baseAnalysisRegistryRuleIds,
  loadAndValidateBaseAnalysisRegistry,
  validateBaseAnalysisRegistrySources,
} from "./lib/base-analysis-registry.mjs";

/**
 * @file Canonical BAE registry consistency checker.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0005
 * @implementsRequirement MR-0003ADR-0001REQ-0005GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Enforces canonical BAE inventory, taxonomy, relation, provenance and
 * reference-source projection rules, including deterministic negative fixture
 * coverage. The checker reads governed sources and writes only derived reports.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = path.resolve(
  process.env.TF_BASE_ANALYSIS_REGISTRY_ROOT ??
    path.resolve(scriptDir, "..", ".."),
);
const fixturePath = path.resolve(
  rootDir,
  process.env.TF_BASE_ANALYSIS_REGISTRY_FIXTURES ??
    "tools/MR-0003/fixtures/base-analysis-registry/negative-fixtures.json",
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
]);

function sourceKey(source) {
  return [
    String(source?.source_kind ?? "").trim(),
    String(source?.source_id ?? "").trim(),
    String(source?.source_path ?? "").replaceAll("\\", "/").trim(),
  ].join("|");
}

function fixtureResult(caseRecord) {
  const existing = new Set(
    (caseRecord.existing_sources ?? []).map(sourceKey),
  );
  return validateBaseAnalysisRegistrySources({
    inventory: caseRecord.inventory,
    taxonomies: caseRecord.taxonomies,
    candidateProjection: caseRecord.candidate_projection,
    sourceResolver: (source) => existing.has(sourceKey(source)),
  });
}

function runNegativeFixtures() {
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
  const knownRuleIds = new Set(Object.values(baseAnalysisRegistryRuleIds));

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
    const result = fixtureResult(fixture);
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

const canonical = loadAndValidateBaseAnalysisRegistry({ rootDir });
const fixtures = runNegativeFixtures();
const errors = [
  ...canonical.errors.map(
    (entry) => `${entry.rule_id}: ${entry.message}`,
  ),
  ...fixtures.errors,
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
  negative_fixtures_checked: fixtures.checked,
  warnings,
  errors,
  projection: canonical.projection,
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
  console.error(`Negative fixtures checked: ${fixtures.checked}`);
  console.error(`Warnings: ${warnings.length}`);
  console.error(`Errors: ${errors.length}`);
  process.exitCode = 1;
} else {
  console.log("Base Analysis registry check passed.");
  for (const requirementId of implementedRequirementIds) {
    console.log(`Implemented requirement: ${requirementId}`);
  }
  console.log(`Elements checked: ${canonical.element_count}`);
  console.log(`Relations checked: ${canonical.relation_count}`);
  console.log(`Reference-source entries checked: ${canonical.projection.length}`);
  console.log(`Negative fixtures checked: ${fixtures.checked}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log("Errors: 0");
  if (!disableReports) {
    console.log(
      `Report: ${path
        .relative(rootDir, path.join(reportDir, "base-analysis-registry.report.json"))
        .replaceAll("\\", "/")}`,
    );
  }
}
