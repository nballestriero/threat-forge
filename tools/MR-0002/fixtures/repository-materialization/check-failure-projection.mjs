#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

/**
 * @file Repository projection check-failure fixture.
 *
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0002
 * @derivedFromDecision MR-0002/ADR-0002
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Writes a declared output and then deliberately fails its check command so
 * rollback behavior can be verified.
 */

const generatedPath = path.join(process.cwd(), "generated.txt");
const mode = process.argv[2];
if (mode === "--write") {
  fs.writeFileSync(generatedPath, "materialized\n", "utf8");
} else if (mode === "--check") {
  console.error("Deliberate materializer check failure.");
  process.exit(1);
} else {
  console.error("Expected --write or --check.");
  process.exit(1);
}
