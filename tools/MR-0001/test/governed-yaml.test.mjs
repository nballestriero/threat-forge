import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  parseGovernedYaml,
  readGovernedYamlFile,
} from "../lib/governed-yaml.mjs";

/**
 * @file Verifica del parser YAML ristretto condiviso.
 *
 * @implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0004
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Verifies the deterministic YAML subset accepted by governed registries and
 * the mandatory rejection of unsupported or ambiguous source structures.
 */

const testPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testPath), "..", "..", "..");
const registriesRoot = path.join(
  projectRoot,
  "docs",
  "reference",
  "project-model",
  "registers",
);

/**
 * Collects governed YAML files recursively in deterministic order.
 *
 * @param {string} directory - Directory to inspect.
 * @returns {string[]} Absolute YAML file paths.
 */
function listGovernedYamlFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listGovernedYamlFiles(entryPath));
      continue;
    }

    if (entry.isFile() && /\.(?:yml|yaml)$/u.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right, "en"));
}

test("parses the governed scalar, mapping, sequence and block subset", () => {
  const parsed = parseGovernedYaml([
    "schema_version: 2",
    "enabled: true",
    "disabled: false",
    "missing: null",
    "empty_list: []",
    "empty_map: {}",
    'quoted: "governed"',
    "items:",
    "  - id: ITEM-0001",
    "    count: -3",
    "    note: |",
    "      first line",
    "      second line",
    "",
  ].join("\r\n"));

  assert.deepEqual(parsed, {
    schema_version: 2,
    enabled: true,
    disabled: false,
    missing: null,
    empty_list: [],
    empty_map: {},
    quoted: "governed",
    items: [
      {
        id: "ITEM-0001",
        count: -3,
        note: "first line\nsecond line",
      },
    ],
  });
});

test("reads every current governed registry YAML file", () => {
  const files = listGovernedYamlFiles(registriesRoot);

  assert.ok(files.length > 0, "Expected at least one governed YAML registry.");

  for (const filePath of files) {
    const parsed = readGovernedYamlFile(filePath);
    assert.ok(parsed && typeof parsed === "object" && !Array.isArray(parsed));
  }
});

test("rejects tab indentation", () => {
  assert.throws(
    () => parseGovernedYaml("root:\n\tvalue: invalid\n"),
    /Tabs are not supported for YAML indentation/u,
  );
});

test("rejects sequence entries outside their declared parent", () => {
  assert.throws(
    () => parseGovernedYaml("root:\n- value: invalid\n"),
    /Invalid YAML sequence indentation/u,
  );
});

test("rejects mapping entries without a key separator", () => {
  assert.throws(
    () => parseGovernedYaml("root:\n  invalid entry\n"),
    /Invalid YAML mapping entry/u,
  );
});

test("rejects duplicate mapping keys", () => {
  assert.throws(
    () => parseGovernedYaml("root:\n  value: first\n  value: second\n"),
    /Duplicate YAML mapping key "value"/u,
  );
});
