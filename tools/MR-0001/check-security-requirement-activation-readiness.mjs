#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertSecurityRequirementActivationReadiness,
  buildSecurityRequirementActivationReadinessSnapshot,
  securityRequirementActivationReadinessProviderIds,
} from "./lib/security-requirement-activation-readiness.mjs";

/**
 * @file Security Requirement integrated pre-activation readiness checker.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Enforces exact integrated provider readiness, active-source isolation,
 * activation-candidate inventory coherence, deterministic missing-provider
 * proofs and canonical source immutability before atomic activation.
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(
  process.env.TF_SECURITY_REQUIREMENT_ACTIVATION_READINESS_ROOT ??
    path.resolve(scriptDir, "..", ".."),
);
const testPath = path.resolve(
  rootDir,
  "tools/MR-0001/test/security-requirement-activation-readiness.test.mjs",
);
const fixturePath = path.resolve(
  rootDir,
  "tools/MR-0001/fixtures/security-requirement-activation-readiness/negative-fixtures.registry.json",
);

function parseTestCount(output) {
  const match = String(output ?? "").match(/(?:#|ℹ)\s*tests\s+(\d+)/u);
  return match ? Number(match[1]) : 0;
}

async function main() {
  const snapshot = await buildSecurityRequirementActivationReadinessSnapshot({
    rootDir,
  });
  const report = assertSecurityRequirementActivationReadiness(snapshot);
  if (snapshot.atomic_activation_performed !== false) {
    throw new Error("Pre-activation readiness must not perform atomic activation.");
  }

  const fixtureRegistry = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const fixtures = Array.isArray(fixtureRegistry.fixtures)
    ? fixtureRegistry.fixtures
    : [];
  const missingProviderProofs = new Set(
    fixtures
      .map((fixture) => fixture?.mutation?.remove_provider_id)
      .filter(Boolean),
  );
  if (
    missingProviderProofs.size !==
      securityRequirementActivationReadinessProviderIds.length
  ) {
    throw new Error(
      `Missing-provider proof coverage is incomplete: ${missingProviderProofs.size}.`,
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
      `Security Requirement activation readiness verification failed:\n${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
    );
  }
  const testCount = parseTestCount(
    `${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
  );
  if (testCount < 19) {
    throw new Error(
      `Security Requirement activation readiness verification count is incomplete: ${testCount}.`,
    );
  }

  console.log("Security Requirement pre-activation readiness check passed.");
  console.log("Implemented requirement: MR-0001ADR-0009REQ-0001");
  console.log("Implemented requirement: MR-0001ADR-0009REQ-0001GOV-0001");
  console.log("Implemented requirement: MR-0001ADR-0010REQ-0002");
  console.log("Implemented requirement: MR-0001ADR-0010REQ-0002GOV-0001");
  console.log(`Activation state: ${report.activation_state}`);
  console.log(`Active models checked: ${report.active_models_checked}`);
  console.log(`Candidate models checked: ${report.candidate_models_checked}`);
  console.log(`Coordinated providers checked: ${report.providers_checked}`);
  console.log(`Missing-provider proofs checked: ${missingProviderProofs.size}`);
  console.log(`Negative fixtures checked: ${fixtures.length}`);
  console.log(`Readiness tests checked: ${testCount}`);
  console.log("Canonical active inventory mutated: no");
  console.log("Atomic activation performed: no");
  console.log("Warnings: 0");
  console.log("Errors: 0");
}

try {
  await main();
} catch (error) {
  console.error("Security Requirement pre-activation readiness check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
