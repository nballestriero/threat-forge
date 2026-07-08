#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @file Restart-workspace local check orchestrator.
 *
 * @implementsRequirement MR-0001ADR-0003REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0003
 * @macroRequirement MR-0001
 *
 * This restart-local orchestrator runs the deterministic checks that belong to
 * the restart-workspace without wiring them into the original repository gates.
 * It is intentionally small: new restart checks can be added here until a
 * governed restart check registry is introduced.
 *
 * Side effects: executes restart-workspace checker tools and preserves their
 * stdout/stderr. Exits non-zero when any orchestrated checker fails.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const restartWorkspaceDir = path.resolve(scriptDir, "..");
const repositoryRootDir = path.resolve(restartWorkspaceDir, "..");

const checks = [
  {
    id: "MR-0001ADR-0003REQ-0001GOV-0001CHECK-0001",
    title: "Implementation trace registry consistency",
    command: process.execPath,
    args: [path.join(restartWorkspaceDir, "tools", "MR-0001", "check-implementation-trace-registry.mjs")],
    env: {
      TF_IMPLEMENTATION_TRACE_ROOT: repositoryRootDir,
    },
  },
];

let failed = false;

console.log("Restart-workspace check started.");
console.log(`Repository root: ${repositoryRootDir}`);
console.log(`Restart workspace: ${restartWorkspaceDir}`);
console.log(`Checks: ${checks.length}`);

for (const check of checks) {
  console.log("");
  console.log(`==> ${check.title}`);

  const result = spawnSync(check.command, check.args, {
    cwd: repositoryRootDir,
    env: {
      ...process.env,
      ...check.env,
    },
    stdio: "inherit",
  });

  if (result.error) {
    failed = true;
    console.error(`Check failed to start: ${check.id}`);
    console.error(result.error.message);
    continue;
  }

  if (result.status !== 0) {
    failed = true;
    console.error(`Check failed: ${check.id}`);
    console.error(`Exit code: ${result.status}`);
  }
}

console.log("");

if (failed) {
  console.error("Restart-workspace check failed.");
  process.exit(1);
}

console.log("Restart-workspace check passed.");
