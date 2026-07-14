import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * @file Verifica della migrazione del governed document generator ai consumer condivisi.
 *
 * @implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0004
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Verifies that the governed document generator reads Requirement registries
 * through the shared governed YAML parser and resolves controlled Requirement
 * type and lifecycle status values through the canonical documentation field
 * value catalog. Abstract or unregistered aliases must be rejected before any
 * write, and parent applicability must follow canonical type metadata.
 */

const testPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testPath), "..", "..", "..");
const generatorProjectPath =
  "tools/MR-0002/create-governed-document.mjs";
const generatorPath = path.join(
  projectRoot,
  ...generatorProjectPath.split("/"),
);
const generatorSource = fs.readFileSync(generatorPath, "utf8");

/**
 * Runs the generator in dry-run mode.
 *
 * @param {string[]} args - Generator arguments excluding node and script path.
 * @returns {{status: number|null, output: string}} Process result.
 */
function runGenerator(args) {
  const result = spawnSync(
    process.execPath,
    [generatorPath, ...args, "--dry-run"],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        TF_AUTHORING_ROOT: projectRoot,
      },
    },
  );

  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

test("declares the shared governed YAML and controlled-field consumers", () => {
  for (const requiredSourceText of [
    "../MR-0001/lib/governed-yaml.mjs",
    "../MR-0001/lib/documentation-field-values.mjs",
    "readGovernedYamlFile",
    "loadDocumentationFieldValueCatalog",
    "resolveDocumentationFieldValue",
    "@implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001",
    "--requirement-type",
  ]) {
    assert.ok(
      generatorSource.includes(requiredSourceText),
      `Generator must contain shared dependency, trace or canonical CLI declaration: ${requiredSourceText}`,
    );
  }
});

test("does not retain local YAML parsing, aliases or controlled values", () => {
  const forbiddenPatterns = [
    [
      "regular-expression Requirement registry parser",
      /function\s+parseRequirementRecords\s*\(/u,
    ],
    [
      "local kind alias normalization",
      /function\s+normalizeKind\s*\(/u,
    ],
    [
      "abstract specialized alias",
      /["']specialized["']/u,
    ],
    [
      "hardcoded functional Requirement type record",
      /requirement_type:\s+functional/u,
    ],
    [
      "hardcoded governance Requirement type record",
      /requirement_type:\s+governance/u,
    ],
    [
      "hardcoded draft lifecycle status",
      /status:\s+draft/u,
    ],
  ];

  for (const [label, pattern] of forbiddenPatterns) {
    assert.doesNotMatch(
      generatorSource,
      pattern,
      `Generator must not retain local ${label}.`,
    );
  }
});

test("creates a functional Requirement from canonical controlled values", () => {
  const result = runGenerator([
    "--requirement-type",
    "functional",
    "--mr",
    "MR-0002",
    "--adr",
    "ADR-0004",
    "--title",
    "Canonical functional dry run",
  ]);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Requirement type: functional/u);
  assert.match(result.output, /status: draft/u);
  assert.match(result.output, /requirement_type: functional/u);
  assert.doesNotMatch(result.output, /Mode: write/u);
});

test("rejects abstract or unregistered Requirement type before writing", () => {
  const result = runGenerator([
    "--requirement-type",
    "specialized",
    "--mr",
    "MR-0002",
    "--parent",
    "MR-0002ADR-0004REQ-0001",
    "--title",
    "Rejected abstract type",
  ]);

  assert.notEqual(result.status, 0);
  assert.match(
    result.output,
    /FIELD-VALUE-SET-0010 does not define controlled value specialized/u,
  );
  assert.doesNotMatch(result.output, /Governed document generation planned/u);
  assert.doesNotMatch(result.output, /Mode: write/u);
});

test("rejects a parent whose canonical Requirement type is not allowed", () => {
  const result = runGenerator([
    "--requirement-type",
    "governance",
    "--mr",
    "MR-0002",
    "--parent",
    "MR-0002ADR-0004REQ-0001GOV-0001",
    "--title",
    "Rejected governance parent",
  ]);

  assert.notEqual(result.status, 0);
  assert.match(
    result.output,
    /cannot use parent type governance; allowed: functional/u,
  );
  assert.doesNotMatch(result.output, /Governed document generation planned/u);
  assert.doesNotMatch(result.output, /Mode: write/u);
});
