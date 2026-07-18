#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
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
 * @implementsRequirement MR-0003ADR-0002REQ-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Enforces canonical BAE inventory, taxonomy, relation, provenance, historical
 * origin, current authority, source-history continuity, canonical origin
 * declarations and deterministic reference-source and occurrence projections.
 * The checker reads governed sources and writes only derived reports.
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

function sourceKey(source) {
  return [
    String(source?.source_kind ?? source?.kind ?? "").trim(),
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

const canonical = loadAndValidateBaseAnalysisRegistry({ rootDir });
const fixtures = runNegativeFixtures();
const continuityFixtures = countSourceContinuityFixtures();
const verification = runVerificationTests();
const errors = [
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
  origin_declaration_count: canonical.origin_declaration_count ?? 0,
  reference_occurrence_count: canonical.occurrence_count ?? 0,
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
    `Origin declarations checked: ${canonical.origin_declaration_count ?? 0}`,
  );
  console.error(
    `Reference occurrences checked: ${canonical.occurrence_count ?? 0}`,
  );
  console.error(`Negative fixtures checked: ${fixtures.checked}`);
  console.error(
    `Source continuity fixtures checked: ${continuityFixtures.checked}`,
  );
  console.error(`Verification tests checked: ${verification.checked}`);
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
  console.log(
    `Source histories checked: ${canonical.source_history_count ?? 0}`,
  );
  console.log(
    `Origin declarations checked: ${canonical.origin_declaration_count ?? 0}`,
  );
  console.log(
    `Reference occurrences checked: ${canonical.occurrence_count ?? 0}`,
  );
  console.log(`Reference-source entries checked: ${canonical.projection.length}`);
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
