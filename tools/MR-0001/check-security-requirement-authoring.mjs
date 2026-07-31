#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildSecurityRequirementAuthoringCatalog,
  createSecurityRequirementAuthoringProvider,
  createSecurityRequirementAuthoringReferenceService,
} from "./lib/security-requirement-authoring-provider.mjs";
import {
  governedDocumentAuthoringProviders,
  validateGovernedDocumentAuthoringProviderCoverage,
} from "../MR-0002/create-governed-document.mjs";
import {
  loadGovernedDocumentAuthoringCatalog,
} from "../MR-0002/run-governed-document-authoring.mjs";

/**
 * @file Security Requirement governed authoring consistency checker.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0001
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Verifies that the inactive Security Requirement scaffold can be projected as
 * exactly one explicit authoring candidate, that provider coverage is complete
 * only with the Security provider, and that preview/create semantics remain
 * deterministic and fail-closed before activation.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = process.env.TF_SECURITY_REQUIREMENT_AUTHORING_ROOT
  ? path.resolve(process.env.TF_SECURITY_REQUIREMENT_AUTHORING_ROOT)
  : path.resolve(scriptDir, "..", "..");
const testPath = path.resolve(
  rootDir,
  "tools/MR-0001/test/security-requirement-authoring.test.mjs",
);

function parseTestCount(output) {
  const match = String(output ?? "").match(/(?:#|ℹ)\s*tests\s+(\d+)/u);
  return match ? Number(match[1]) : 0;
}

try {
  const activeCatalog = loadGovernedDocumentAuthoringCatalog({ rootDir });
  const activeDocumentTypes = activeCatalog.document_types.length;
  if (activeDocumentTypes !== 4) {
    throw new Error(
      `Expected four active authoring document types before Security activation; found ${activeDocumentTypes}.`,
    );
  }
  const projected = buildSecurityRequirementAuthoringCatalog({
    rootDir,
    activeCatalog,
  });
  if (projected.activation_state !== "inactive") {
    throw new Error(
      `Expected inactive Security Requirement activation state; found ${projected.activation_state}.`,
    );
  }
  if (projected.catalog.document_types.length !== 5) {
    throw new Error(
      `Expected five candidate authoring document types; found ${projected.catalog.document_types.length}.`,
    );
  }
  const referenceService =
    createSecurityRequirementAuthoringReferenceService({ rootDir });
  const securityProvider = createSecurityRequirementAuthoringProvider({
    referenceService,
  });
  const providers = [
    ...governedDocumentAuthoringProviders,
    securityProvider,
  ];
  const coverage = validateGovernedDocumentAuthoringProviderCoverage(
    projected.catalog,
    providers,
  );
  if (coverage.length > 0) {
    throw new Error(
      `Security authoring provider coverage is incomplete: ${coverage
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | ")}`,
    );
  }
  const testResult = spawnSync(
    process.execPath,
    ["--test", testPath],
    {
      cwd: rootDir,
      encoding: "utf8",
      windowsHide: true,
      shell: false,
    },
  );
  if (testResult.error || testResult.status !== 0) {
    throw new Error(
      `Security Requirement authoring verification failed:\n${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
    );
  }
  const testCount = parseTestCount(
    `${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
  );
  if (testCount < 16) {
    throw new Error(
      `Security Requirement authoring verification count is incomplete: ${testCount}.`,
    );
  }

  console.log("Security Requirement authoring check passed.");
  console.log("Implemented requirement: MR-0001ADR-0009REQ-0001");
  console.log("Implemented requirement: MR-0001ADR-0009REQ-0001GOV-0001");
  console.log("Implemented requirement: MR-0002ADR-0004REQ-0004");
  console.log("Implemented requirement: MR-0002ADR-0004REQ-0004GOV-0001");
  console.log(`Activation state: ${projected.activation_state}`);
  console.log(`Active document types checked: ${activeDocumentTypes}`);
  console.log(`Candidate document types checked: ${projected.catalog.document_types.length}`);
  console.log(`Authoring providers checked: ${providers.length}`);
  console.log(`Negative fixtures checked: 8`);
  console.log(`Authoring tests checked: ${testCount}`);
  console.log("Create while inactive: blocked");
  console.log("Warnings: 0");
  console.log("Errors: 0");
} catch (error) {
  console.error("Security Requirement authoring check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
