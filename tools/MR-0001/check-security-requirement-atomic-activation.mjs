#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildSecurityRequirementAtomicActivationSnapshot,
  securityRequirementAtomicActivationProviderIds,
  validateSecurityRequirementAtomicActivationSnapshot,
} from "./lib/security-requirement-atomic-activation.mjs";

/**
 * @file Security Requirement atomic canonical activation checker.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(
  process.env.TF_SECURITY_REQUIREMENT_ATOMIC_ACTIVATION_ROOT ??
    path.resolve(scriptDir, "..", ".."),
);
const fixturePath = path.resolve(
  rootDir,
  "tools/MR-0001/fixtures/security-requirement-atomic-activation/negative-fixtures.registry.json",
);
const testPath = path.resolve(
  rootDir,
  "tools/MR-0001/test/security-requirement-atomic-activation.test.mjs",
);

function parseTestCount(output) {
  const match = String(output ?? "").match(/(?:#|ℹ)\s*tests\s+(\d+)/u);
  return match ? Number(match[1]) : 0;
}

try {
  const snapshot = buildSecurityRequirementAtomicActivationSnapshot({ rootDir });
  const result = validateSecurityRequirementAtomicActivationSnapshot(snapshot);
  if (!result.valid) {
    throw new Error(
      result.diagnostics
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | "),
    );
  }
  const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const testResult = spawnSync(process.execPath, ["--test", testPath], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  if (testResult.error || testResult.status !== 0) {
    throw new Error(
      `Atomic activation verification failed:\n${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
    );
  }
  const testCount = parseTestCount(
    `${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`,
  );
  if (testCount < 20) {
    throw new Error(`Atomic activation verification count is incomplete: ${testCount}.`);
  }

  console.log("Security Requirement atomic activation check passed.");
  console.log("Implemented requirement: MR-0001ADR-0009REQ-0001");
  console.log("Implemented requirement: MR-0001ADR-0009REQ-0001GOV-0001");
  console.log("Implemented requirement: MR-0001ADR-0010REQ-0002");
  console.log("Implemented requirement: MR-0001ADR-0010REQ-0002GOV-0001");
  console.log(`Activation state: ${snapshot.activation_state}`);
  console.log(`Active models checked: ${snapshot.active_model_ids.length}`);
  console.log(`Active profiles checked: ${snapshot.active_profile_ids.length}`);
  console.log(`Coordinated providers checked: ${securityRequirementAtomicActivationProviderIds.length}`);
  console.log(`Negative fixtures checked: ${fixtures.cases.length}`);
  console.log(`Activation tests checked: ${testCount}`);
  console.log(`Generic Security authoring branch: active`);
  console.log(`Dedicated Security create task: present`);
  console.log(
    `Security Requirement records created by activation: ${snapshot.security_requirement_record_count}`,
  );
  console.log("Warnings: 0");
  console.log("Errors: 0");
} catch (error) {
  console.error("Security Requirement atomic activation check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
