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
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0007
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Validates registry topology, provider-derived cross-model relations and
 * exclusive body ownership in blocking enforcement mode.
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
    "MR-0001ADR-0010REQ-0002",
    "MR-0001ADR-0010REQ-0002GOV-0001",
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
const modelCountLines = Object.entries(report.model_counts).map(
  ([modelId, count]) => `- ${modelId}: ${count}`,
);
const markdown = [
  "# Governed document cross-model coherence report",
  "",
  `Mode: ${report.mode}`,
  `Providers checked: ${report.provider_model_ids.length}`,
  "Models checked:",
  ...modelCountLines,
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
for (const requirementId of report.implemented_requirements) {
  console.log(`Implemented requirement: ${requirementId}`);
}
console.log("Mode: enforce");
console.log(`Providers checked: ${report.provider_model_ids.length}`);
for (const [modelId, count] of Object.entries(report.model_counts)) {
  console.log(`Model ${modelId} records checked: ${count}`);
}
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
