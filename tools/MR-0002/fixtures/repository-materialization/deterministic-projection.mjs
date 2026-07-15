#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

/**
 * @file Deterministic repository projection materializer fixture.
 *
 * @implementsRequirement MR-0002ADR-0002REQ-0002GOV-0002
 * @derivedFromDecision MR-0002/ADR-0002
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Writes generated.txt from source.txt in --write mode and verifies exact
 * equality in --check mode. The fixture is copied into isolated test roots.
 */

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "source.txt");
const generatedPath = path.join(rootDir, "generated.txt");
const mode = process.argv[2];
const expected = fs.readFileSync(sourcePath, "utf8");

if (mode === "--write") {
  fs.writeFileSync(generatedPath, expected, "utf8");
} else if (mode === "--check") {
  const actual = fs.existsSync(generatedPath)
    ? fs.readFileSync(generatedPath, "utf8")
    : "";
  if (actual !== expected) {
    console.error("Generated projection is stale.");
    process.exit(1);
  }
} else {
  console.error("Expected --write or --check.");
  process.exit(1);
}
