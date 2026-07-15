#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

/**
 * @file Non-idempotent repository projection materializer fixture.
 *
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0002
 * @derivedFromDecision MR-0002/ADR-0002
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Deliberately changes generated.txt on every write so deterministic tests can
 * prove that the second materialization pass is rejected and rolled back.
 */

const generatedPath = path.join(process.cwd(), "generated.txt");
const mode = process.argv[2];
if (mode === "--write") {
  const current = fs.existsSync(generatedPath)
    ? Number.parseInt(fs.readFileSync(generatedPath, "utf8"), 10) || 0
    : 0;
  fs.writeFileSync(generatedPath, `${current + 1}\n`, "utf8");
} else if (mode !== "--check") {
  console.error("Expected --write or --check.");
  process.exit(1);
}
