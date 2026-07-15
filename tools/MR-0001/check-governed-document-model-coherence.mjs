#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateGovernedDocumentModelCoherence } from "./lib/governed-document-model-coherence-validation.mjs";

/**
 * @file Governed document cross-model coherence checker.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Validates registry topology, MR-to-Decision-to-Functional-to-Governance
 * relations and exclusive body ownership in blocking enforcement mode.
 */

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = process.env.TF_GOVERNED_DOCUMENT_MODEL_COHERENCE_ROOT
  ? path.resolve(process.env.TF_GOVERNED_DOCUMENT_MODEL_COHERENCE_ROOT)
  : path.resolve(path.dirname(scriptPath), "..", "..");

if (process.argv.length > 2) {
  console.error(`Unsupported arguments: ${process.argv.slice(2).join(", ")}`);
  process.exit(2);
}

let result;
try {
  result = validateGovernedDocumentModelCoherence({ rootDir });
} catch (error) {
  console.error(
    `Governed document cross-model coherence validation could not run: ${error.message}`,
  );
  process.exit(2);
}

const reportDir = path.join(rootDir, "artifacts", "governed-document-models");
fs.mkdirSync(reportDir, { recursive: true });
const errorCount = result.diagnostics.filter(
  (item) => item.severity === "error",
).length;
const warningCount = result.diagnostics.filter(
  (item) => item.severity === "warning",
).length;
const report = {
  checker: "check-governed-document-model-coherence",
  mode: "enforce",
  implemented_requirements: [
    "MR-0001ADR-0007REQ-0002",
    "MR-0001ADR-0007REQ-0002GOV-0001",
    "MR-0001ADR-0007REQ-0002GOV-0002",
  ],
  ...result,
  error_count: errorCount,
  warning_count: warningCount,
};

fs.writeFileSync(
  path.join(reportDir, "cross-model-coherence.report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
const markdown = [
  "# Governed document cross-model coherence report",
  "",
  `Mode: ${report.mode}`,
  `Macro-requirements checked: ${report.macro_requirements_checked}`,
  `Decisions checked: ${report.decisions_checked}`,
  `Functional Requirements checked: ${report.functional_requirements_checked}`,
  `Governance Requirements checked: ${report.governance_requirements_checked}`,
  `Child registries checked: ${report.child_registries_checked}`,
  `Bodies checked: ${report.bodies_checked}`,
  `Warnings: ${report.warning_count}`,
  `Errors: ${report.error_count}`,
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
].join("\n");
fs.writeFileSync(
  path.join(reportDir, "cross-model-coherence.report.md"),
  markdown,
  "utf8",
);

if (errorCount > 0) {
  console.error("Governed document cross-model coherence check failed.");
} else {
  console.log("Governed document cross-model coherence check passed.");
}
console.log("Implemented requirement: MR-0001ADR-0007REQ-0002");
console.log("Implemented requirement: MR-0001ADR-0007REQ-0002GOV-0001");
console.log("Implemented requirement: MR-0001ADR-0007REQ-0002GOV-0002");
console.log("Mode: enforce");
console.log(`Macro-requirements checked: ${report.macro_requirements_checked}`);
console.log(`Decisions checked: ${report.decisions_checked}`);
console.log(
  `Functional Requirements checked: ${report.functional_requirements_checked}`,
);
console.log(
  `Governance Requirements checked: ${report.governance_requirements_checked}`,
);
console.log(`Child registries checked: ${report.child_registries_checked}`);
console.log(`Bodies checked: ${report.bodies_checked}`);
console.log(`Warnings: ${warningCount}`);
console.log(`Errors: ${errorCount}`);
console.log(
  "Report: artifacts/governed-document-models/cross-model-coherence.report.json",
);
for (const item of report.diagnostics) {
  console.error(
    `${item.severity.toUpperCase()}: [${item.rule_id}] ${item.source_path} ${item.location}: ${item.message}`,
  );
}
if (errorCount > 0) process.exit(1);
