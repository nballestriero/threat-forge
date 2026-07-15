#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

/**
 * @file Undeclared repository projection output fixture.
 *
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0002
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Deliberately writes one declared and one undeclared path so boundary
 * validation and rollback can be proven.
 */

const mode = process.argv[2];
if (mode === "--write") {
  fs.writeFileSync(path.join(process.cwd(), "generated.txt"), "declared\n", "utf8");
  fs.writeFileSync(path.join(process.cwd(), "undeclared.txt"), "undeclared\n", "utf8");
} else if (mode !== "--check") {
  console.error("Expected --write or --check.");
  process.exit(1);
}
