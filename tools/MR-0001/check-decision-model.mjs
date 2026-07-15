#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateDecisionModel } from "./lib/decision-model-validation.mjs";

/**
 * @file Decision complete-model checker and migration reporter.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Default mode is enforce for future check-registry activation. --report writes
 * deterministic migration reports and remains non-blocking for model violations.
 */

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = process.env.TF_DECISION_MODEL_ROOT
  ? path.resolve(process.env.TF_DECISION_MODEL_ROOT)
  : path.resolve(path.dirname(scriptPath), "..", "..");
const reportMode = process.argv.includes("--report");
const unknown = process.argv
  .slice(2)
  .filter((argument) => argument !== "--report" && argument !== "--enforce");

if (unknown.length) {
  console.error(`Unsupported arguments: ${unknown.join(", ")}`);
  process.exit(2);
}

let result;
try {
  result = validateDecisionModel({ rootDir });
} catch (error) {
  console.error(`Decision model validation could not run: ${error.message}`);
  process.exit(2);
}

const reportDir = path.join(
  rootDir,
  "artifacts",
  "governed-document-models",
);
fs.mkdirSync(reportDir, { recursive: true });

const report = {
  checker: "check-decision-model",
  mode: reportMode ? "report" : "enforce",
  implemented_requirements: [
    "MR-0001ADR-0007REQ-0002",
    "MR-0001ADR-0007REQ-0002GOV-0001",
    "MR-0001ADR-0007REQ-0002GOV-0002",
  ],
  ...result,
  error_count: result.diagnostics.filter(
    (item) => item.severity === "error",
  ).length,
  warning_count: result.diagnostics.filter(
    (item) => item.severity === "warning",
  ).length,
};

fs.writeFileSync(
  path.join(reportDir, "decision.report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

const markdown = [
  "# Decision model migration report",
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
  path.join(reportDir, "decision.report.md"),
  markdown.join("\n"),
  "utf8",
);

console.log(
  report.error_count === 0
    ? "Decision model check passed."
    : reportMode
      ? "Decision migration report completed."
      : "Decision model check failed.",
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
  "Report: artifacts/governed-document-models/decision.report.json",
);
for (const item of report.diagnostics) {
  console.log(
    `${item.severity.toUpperCase()}: [${item.rule_id}] ${item.source_path} ${item.location}: ${item.message}`,
  );
}

if (!reportMode && report.error_count > 0) {
  process.exit(1);
}
