#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  loadSecurityRequirementFindingTraceabilityProjection,
} from "./lib/security-requirement-finding-traceability.mjs";
import {
  createTargetProjectValidationOverlay,
} from "../MR-0004/run-target-project-check.mjs";

/**
 * @file Finding-to-Security-Requirement traceability checker.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Rebuilds and checks the read-only reverse traceability projection for the
 * documentation-to-base-analysis Target Project and executes focused coverage.
 *
 * Side effects: creates and removes one isolated validation overlay and runs a
 * Node.js test process. Governed engine and Target Project sources are read-only.
 */

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(
  path.dirname(scriptPath),
  "..",
  "..",
);
const targetRoot = path.join(
  repositoryRoot,
  "examples",
  "case-studies",
  "documentation-to-base-analysis",
);
const testPath = path.join(
  repositoryRoot,
  "tools",
  "MR-0001",
  "test",
  "security-requirement-finding-traceability.test.mjs",
);

function parseTestCount(output) {
  const match = String(output ?? "").match(
    /(?:#|ℹ)\s*tests\s+(\d+)/u,
  );
  return match ? Number(match[1]) : 0;
}

function runVerificationSuite() {
  const result = spawnSync(
    process.execPath,
    ["--test", testPath],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
    },
  );
  const output =
    `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();

  if (result.error || result.status !== 0) {
    throw new Error(
      "Finding traceability verification failed:\n" + output,
    );
  }

  const checked = parseTestCount(output);
  if (checked < 6) {
    throw new Error(
      `Finding traceability coverage is incomplete: ${checked} tests.`,
    );
  }

  return checked;
}

let overlayRoot = "";
let projection;

try {
  overlayRoot = createTargetProjectValidationOverlay(
    repositoryRoot,
    targetRoot,
  );
  const first =
    loadSecurityRequirementFindingTraceabilityProjection({
      rootDir: overlayRoot,
    });
  const second =
    loadSecurityRequirementFindingTraceabilityProjection({
      rootDir: overlayRoot,
    });

  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error(
      "Repeated Finding traceability projection runs diverged.",
    );
  }

  projection = first;
} finally {
  if (overlayRoot) {
    fs.rmSync(overlayRoot, {
      recursive: true,
      force: true,
    });
  }
}

const verificationTests = runVerificationSuite();
const linkedSecurityRequirements = projection.findings.reduce(
  (count, finding) =>
    count + finding.security_requirements.length,
  0,
);

console.log(
  "Security Requirement Finding traceability check passed.",
);
console.log(
  "Implemented requirement: MR-0001ADR-0009REQ-0001",
);
console.log(
  "Implemented requirement: MR-0001ADR-0009REQ-0001GOV-0001",
);
console.log(`Projection id: ${projection.projection_id}`);
console.log(`Findings projected: ${projection.findings.length}`);
console.log(
  `Security Requirement links projected: ${linkedSecurityRequirements}`,
);
console.log(`Verification tests checked: ${verificationTests}`);
console.log("Warnings: 0");
console.log("Errors: 0");
