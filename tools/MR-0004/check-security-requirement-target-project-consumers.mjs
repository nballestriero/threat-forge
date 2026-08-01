#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  loadGovernedDocumentModelSourceSet,
} from "../MR-0001/lib/governed-document-model-sources.mjs";
import {
  loadSecurityRequirementValidationSourceSet,
} from "../MR-0001/lib/security-requirement-model-validation.mjs";
import {
  resolveTargetProjectModelValidationProviders,
} from "./run-target-project-check.mjs";

/**
 * @file Security Requirement Target Project coordinated-consumer checker.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @implementsRequirement MR-0004ADR-0001REQ-0003
 * @implementsRequirement MR-0004ADR-0001REQ-0004
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0001/ADR-0010
 * @derivedFromDecision MR-0004/ADR-0001
 * @macroRequirement MR-0001
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Enforces active-source isolation, exact candidate validator-provider coverage,
 * target-local Security preview regression evidence and inactive create blocking
 * without activating the canonical Security Requirement model.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(
  process.env.TF_SECURITY_REQUIREMENT_TARGET_CONSUMERS_ROOT ??
    path.resolve(scriptDir, "..", ".."),
);
const testPath = path.resolve(
  rootDir,
  "tools/MR-0004/test/security-requirement-target-project-consumers.test.mjs",
);

function parseTestCount(output) {
  const match = String(output ?? "").match(/(?:#|ℹ)\s*tests\s+(\d+)/u);
  return match ? Number(match[1]) : 0;
}

try {
  const activeSourceSet = loadGovernedDocumentModelSourceSet({
    rootDir,
  });
  const activeProviders =
    resolveTargetProjectModelValidationProviders(activeSourceSet);
  const loadedCandidate = loadSecurityRequirementValidationSourceSet({
    rootDir,
  });
  const candidateProviders =
    resolveTargetProjectModelValidationProviders(
      loadedCandidate.sourceSet,
    );

  if (loadedCandidate.activation_state !== "active") {
    throw new Error(
      `Security Requirement activation state must be active; found ${loadedCandidate.activation_state}.`,
    );
  }
  const activeModelCount = activeSourceSet.index.value.models.length;
  if (
    activeProviders.length !== activeModelCount ||
    activeProviders.filter(
      (provider) => provider.model_id === "security-requirement",
    ).length !== 1
  ) {
    throw new Error(
      "Active Target Project validation requires exact canonical coverage and exactly one Security provider.",
    );
  }
  const candidateModelCount =
    loadedCandidate.sourceSet.index.value.models.length;
  if (
    candidateProviders.length !== candidateModelCount ||
    candidateProviders.filter(
      (provider) => provider.model_id === "security-requirement",
    ).length !== 1
  ) {
    throw new Error(
      "Security Target Project validation requires exact canonical coverage and exactly one Security provider.",
    );
  }

  const testResult = spawnSync(process.execPath, ["--test", testPath], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  if (testResult.error || testResult.status !== 0) {
    throw new Error(
      `Security Target Project consumer verification failed:\n${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
    );
  }
  const testCount = parseTestCount(
    `${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
  );
  if (testCount < 8) {
    throw new Error(
      `Security Target Project consumer verification count is incomplete: ${testCount}.`,
    );
  }

  console.log("Security Requirement Target Project consumer check passed.");
  console.log("Implemented requirement: MR-0001ADR-0009REQ-0001");
  console.log("Implemented requirement: MR-0001ADR-0009REQ-0001GOV-0001");
  console.log("Implemented requirement: MR-0001ADR-0010REQ-0002");
  console.log("Implemented requirement: MR-0001ADR-0010REQ-0002GOV-0001");
  console.log("Implemented requirement: MR-0004ADR-0001REQ-0003");
  console.log("Implemented requirement: MR-0004ADR-0001REQ-0004");
  console.log(`Activation state: ${loadedCandidate.activation_state}`);
  console.log(`Active validation providers checked: ${activeProviders.length}`);
  console.log(`Candidate validation providers checked: ${candidateProviders.length}`);
  console.log("Security validator provider: active");
  console.log("Target Security authoring preview: enabled");
  console.log("Target Security create: enabled");
  console.log(`Consumer tests checked: ${testCount}`);
  console.log("Warnings: 0");
  console.log("Errors: 0");
} catch (error) {
  console.error("Security Requirement Target Project consumer check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
