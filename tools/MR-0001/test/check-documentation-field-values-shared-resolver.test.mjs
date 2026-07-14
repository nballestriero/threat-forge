import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * @file Verifica della migrazione del checker ai consumer YAML e controlled-field condivisi.
 *
 * @implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0004
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Verifies that the documentation field value checker obtains governed YAML
 * data and controlled field authority exclusively from the shared parser and
 * canonical resolver. The checker must not retain a local YAML parser, local
 * value-set inventory, local applicability maps or local allowed-value sets.
 */

const testPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testPath), "..", "..", "..");
const checkerProjectPath =
  "tools/MR-0001/check-documentation-field-values.mjs";
const checkerPath = path.join(
  projectRoot,
  ...checkerProjectPath.split("/"),
);
const checkerSource = fs.readFileSync(checkerPath, "utf8");

/**
 * Runs the checker against one repository or isolated fixture root.
 *
 * @param {string} rootDir - Absolute ThreatForge or fixture root.
 * @returns {{status: number|null, output: string}} Process result.
 */
function runChecker(rootDir) {
  const result = spawnSync(process.execPath, [checkerPath], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      TF_DOCUMENTATION_FIELD_VALUES_ROOT: rootDir,
      TF_DOCUMENTATION_FIELD_VALUES_SKIP_NEGATIVE_FIXTURES: "1",
      TF_DOCUMENTATION_FIELD_VALUES_DISABLE_REPORTS: "1",
      TF_DOCUMENTATION_FIELD_VALUES_TAXONOMY_REGISTRY_PATH:
        "docs/reference/project-model/registers/taxonomies/documentation-field-values.registry.yml",
      TF_DOCUMENTATION_FIELD_VALUES_VOCABULARY_REGISTRY_PATH:
        "docs/reference/project-model/registers/vocabularies/documentation-terms.registry.yml",
      TF_DOCUMENTATION_FIELD_VALUES_CHECKS_REGISTRY_PATH:
        "docs/reference/project-model/registers/checks/local-governance-checks.registry.yml",
      TF_DOCUMENTATION_FIELD_VALUES_IMPLEMENTATION_TRACE_REGISTRY_PATH:
        "docs/reference/project-model/registers/implementation/implementation-trace.registry.yml",
      TF_DOCUMENTATION_FIELD_VALUES_DECISIONS_REGISTRY_PATH:
        "docs/reference/project-model/registers/decisions/MR-0001.decisions.registry.yml",
      TF_DOCUMENTATION_FIELD_VALUES_REQUIREMENTS_REGISTRY_PATH:
        "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
      TF_DOCUMENTATION_FIELD_VALUES_DOCS_ROOT:
        "docs/reference/project-model",
    },
  });

  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

/** @param {string} fixtureId @returns {string} */
function fixtureRoot(fixtureId) {
  return path.join(
    projectRoot,
    "tools",
    "MR-0001",
    "fixtures",
    "documentation-field-values",
    fixtureId,
  );
}

test("declares the shared parser and canonical resolver as checker dependencies", () => {
  for (const requiredSourceText of [
    "./lib/governed-yaml.mjs",
    "./lib/documentation-field-values.mjs",
    "readGovernedYamlFile",
    "loadDocumentationFieldValueCatalog",
    "resolveDocumentationFieldValue",
    "@implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001",
  ]) {
    assert.ok(
      checkerSource.includes(requiredSourceText),
      `Checker must contain shared dependency or trace declaration: ${requiredSourceText}`,
    );
  }
});

test("does not retain local YAML parsing or controlled-value authority", () => {
  const forbiddenPatterns = [
    ["stripQuotes", /function\s+stripQuotes\s*\(/u],
    ["parseScalar", /function\s+parseScalar\s*\(/u],
    ["countIndent", /function\s+countIndent\s*\(/u],
    ["parseYaml", /function\s+parseYaml\s*\(/u],
    ["readProjectYaml", /function\s+readProjectYaml\s*\(/u],
    ["requiredValueSetNames", /\brequiredValueSetNames\b/u],
    ["getValueSet", /function\s+getValueSet\s*\(/u],
    ["byName", /\bbyName\b/u],
    ["byApplicability", /\bbyApplicability\b/u],
  ];

  for (const [label, pattern] of forbiddenPatterns) {
    assert.doesNotMatch(
      checkerSource,
      pattern,
      `Checker must not retain local ${label} authority.`,
    );
  }
});

test("reports invalid check status through the canonical contextual resolver", () => {
  const result = runChecker(fixtureRoot("invalid-check-status-context"));

  assert.notEqual(result.status, 0);
  assert.match(
    result.output,
    /FIELD-VALUE-SET-0005 does not define controlled value pass/u,
  );
});

test("reports invalid requirement status through the canonical contextual resolver", () => {
  const result = runChecker(
    fixtureRoot("invalid-requirement-status-context"),
  );

  assert.notEqual(result.status, 0);
  assert.match(
    result.output,
    /FIELD-VALUE-SET-0008 does not define controlled value implemented/u,
  );
});

test("reports the canonical-provenance governance requirement", () => {
  const result = runChecker(projectRoot);

  assert.equal(result.status, 0, result.output);
  assert.match(
    result.output,
    /Implemented requirement: MR-0001ADR-0004REQ-0002GOV-0001/u,
  );
});
