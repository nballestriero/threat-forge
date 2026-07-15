#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateFunctionalRequirementModel } from "./lib/functional-requirement-model-validation.mjs";

/**
 * @file Functional Requirement complete-model checker.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Validates the active Functional Requirement corpus in blocking enforcement
 * mode and writes deterministic JSON and Markdown evidence reports.
 */

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = process.env.TF_FUNCTIONAL_REQUIREMENT_MODEL_ROOT
  ? path.resolve(process.env.TF_FUNCTIONAL_REQUIREMENT_MODEL_ROOT)
  : path.resolve(path.dirname(scriptPath), "..", "..");

if (process.argv.length > 2) {
  console.error(`Unsupported arguments: ${process.argv.slice(2).join(", ")}`);
  process.exit(2);
}

let result;
try {
  result = validateFunctionalRequirementModel({ rootDir });
} catch (error) {
  console.error(
    `Functional Requirement model validation could not run: ${error.message}`,
  );
  process.exit(2);
}

const reportDir = path.join(rootDir, "artifacts", "governed-document-models");
fs.mkdirSync(reportDir, { recursive: true });

const report = {
  checker: "check-functional-requirement-model",
  mode: "enforce",
  implemented_requirements: [
    "MR-0001ADR-0007REQ-0002",
    "MR-0001ADR-0007REQ-0002GOV-0001",
    "MR-0001ADR-0007REQ-0002GOV-0002",
  ],
  ...result,
  error_count: result.diagnostics.filter((item) => item.severity === "error")
    .length,
  warning_count: result.diagnostics.filter(
    (item) => item.severity === "warning",
  ).length,
};

fs.writeFileSync(
  path.join(reportDir, "functional-requirement.report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

const markdown = [
  "# Functional Requirement model report",
  "",
  `Mode: ${report.mode}`,
  `Registry files checked: ${report.registry_paths.length}`,
  `Records checked: ${report.records_checked}`,
  `Errors: ${report.error_count}`,
  `Warnings: ${report.warning_count}`,
  "",
  "## Diagnostics",
  "",
  ...(report.diagnostics.length
    ? report.diagnostics.map(
        (item) =>
          `- [${item.rule_id}] ${item.source_path} ${item.location}: ${item.message}`,
      )
    : ["None."]),
  "",
];

fs.writeFileSync(
  path.join(reportDir, "functional-requirement.report.md"),
  markdown.join("\n"),
  "utf8",
);

console.log(
  report.error_count === 0
    ? "Functional Requirement model check passed."
    : "Functional Requirement model check failed.",
);
for (const id of report.implemented_requirements) {
  console.log(`Implemented requirement: ${id}`);
}
console.log(`Mode: ${report.mode}`);
console.log(`Registry files checked: ${report.registry_paths.length}`);
console.log(`Records checked: ${report.records_checked}`);
console.log(`Warnings: ${report.warning_count}`);
console.log(`Errors: ${report.error_count}`);
console.log(
  "Report: artifacts/governed-document-models/functional-requirement.report.json",
);
for (const item of report.diagnostics) {
  console.log(
    `${item.severity.toUpperCase()}: [${item.rule_id}] ${item.source_path} ${item.location}: ${item.message}`,
  );
}

if (report.error_count > 0) {
  process.exit(1);
}
