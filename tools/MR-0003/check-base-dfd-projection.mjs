#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  readGovernedYamlFile,
} from "../MR-0001/lib/governed-yaml.mjs";

import {
  projectBaseDfd,
} from "./lib/base-dfd-projector.mjs";

import {
  validateBaseDfdProjection,
} from "./lib/base-dfd-projection-validator.mjs";

/**
 * @file Base DFD projection consistency checker.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0006GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Validates the deterministic Base DFD semantic projection produced from the
 * governed documentation-to-Base-Analysis case study and executes its positive
 * and negative verification suite.
 *
 * Side effects: reads governed repository files and executes the registered
 * Node.js test suite. It does not modify canonical BAE registries, semantic
 * projections or renderer artifacts.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);

const rootDir = path.resolve(
  process.env.TF_BASE_DFD_PROJECTION_ROOT ??
    path.resolve(scriptDir, "..", ".."),
);

const registryProjectPath =
  "examples/case-studies/documentation-to-base-analysis/docs/reference/project-model/registers/base-analysis/base-analysis-elements.registry.yml";

const testProjectPath =
  "tools/MR-0003/test/base-dfd-projection.test.mjs";

const expectedCaseStudyCounts = Object.freeze({
  nodes: 2,
  flows: 1,
  boundaries: 1,
  unprojected_baes: 1,
});

/**
 * Resolves a repository-relative path without permitting root escape.
 *
 * @param {string} projectPath - Repository-relative path.
 * @returns {string} Absolute path.
 */
function resolveProjectPath(projectPath) {
  const normalized = String(projectPath ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//u, "");

  const absolute = path.resolve(
    rootDir,
    ...normalized.split("/"),
  );

  const relative = path.relative(rootDir, absolute);

  if (
    !normalized ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Unsafe repository path: ${projectPath}`);
  }

  return absolute;
}

/**
 * Parses the test count emitted by the Node.js test runner.
 *
 * @param {string} output - Combined test-runner output.
 * @returns {number} Reported test count.
 */
function parseTestCount(output) {
  const match = String(output ?? "").match(
    /(?:#|ℹ)\s*tests\s+(\d+)/u,
  );

  return match ? Number(match[1]) : 0;
}

/**
 * Requires the exact first-case-study semantic projection.
 *
 * @param {Record<string, unknown>} projection - Candidate projection.
 * @returns {string[]} Detected errors.
 */
function validateCaseStudyProjection(projection) {
  const errors = [];

  for (const [collectionName, expectedCount] of Object.entries(
    expectedCaseStudyCounts,
  )) {
    const collection = projection?.[collectionName];

    if (!Array.isArray(collection)) {
      errors.push(
        `Projection collection ${collectionName} must be a list.`,
      );
      continue;
    }

    if (collection.length !== expectedCount) {
      errors.push(
        `Projection collection ${collectionName} must contain ${expectedCount} records; found ${collection.length}.`,
      );
    }
  }

  const actor = projection?.nodes?.find(
    (node) => node.id === "DFD-NODE-BAE-0001",
  );

  if (actor?.role !== "external_entity") {
    errors.push(
      "BAE-0001 must project as external_entity.",
    );
  }

  const process = projection?.nodes?.find(
    (node) => node.id === "DFD-NODE-BAE-0002",
  );

  if (process?.role !== "process") {
    errors.push(
      "BAE-0002 must project as process.",
    );
  }

  const flow = projection?.flows?.find(
    (entry) => entry.id === "DFD-FLOW-BAE-0005",
  );

  if (!flow) {
    errors.push(
      "BAE-0005 must project as DFD-FLOW-BAE-0005.",
    );
  } else {
    if (
      flow.source_node_id !== "DFD-NODE-BAE-0001" ||
      flow.target_node_id !== "DFD-NODE-BAE-0002"
    ) {
      errors.push(
        "BAE-0005 must flow from BAE-0001 to BAE-0002.",
      );
    }

    if (
      JSON.stringify(flow.crossed_boundary_ids) !==
      JSON.stringify(["DFD-BOUNDARY-BAE-0004"])
    ) {
      errors.push(
        "BAE-0005 must cross DFD-BOUNDARY-BAE-0004.",
      );
    }

    if (
      JSON.stringify(flow.contributing_relation_ids) !==
      JSON.stringify([
        "BAE-REL-0001",
        "BAE-REL-0002",
        "BAE-REL-0003",
      ])
    ) {
      errors.push(
        "BAE-0005 must retain all three canonical relation identities.",
      );
    }
  }

  const unprojected = projection?.unprojected_baes?.find(
    (entry) => entry.bae_id === "BAE-0003",
  );

  if (
    unprojected?.reason !==
    "no_deterministic_dfd_role"
  ) {
    errors.push(
      "BAE-0003 must remain explicitly unprojected with the controlled no-role reason.",
    );
  }

  return errors;
}

/**
 * Executes the Base DFD verification suite.
 *
 * @returns {{checked: number, errors: string[]}} Test result.
 */
function runVerificationSuite() {
  const testPath = resolveProjectPath(testProjectPath);

  const result = spawnSync(
    process.execPath,
    ["--test", testPath],
    {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
      windowsHide: true,
    },
  );

  const output =
    `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();

  if (result.error || result.status !== 0) {
    return {
      checked: parseTestCount(output),
      errors: [
        `Base DFD projection verification suite failed:\n${output}`,
      ],
    };
  }

  const checked = parseTestCount(output);

  if (checked < 20) {
    return {
      checked,
      errors: [
        `Base DFD verification coverage is incomplete: ${checked} tests.`,
      ],
    };
  }

  return {
    checked,
    errors: [],
  };
}

const errors = [];
const warnings = [];

let projection = null;
let validation = null;

try {
  const registryPath = resolveProjectPath(
    registryProjectPath,
  );

  if (!fs.existsSync(registryPath)) {
    throw new Error(
      `Base DFD case-study registry is missing: ${registryProjectPath}`,
    );
  }

  const inventory = readGovernedYamlFile(registryPath);

  const firstProjection = projectBaseDfd({
    inventory,
    registryPath: registryProjectPath,
  });

  const secondProjection = projectBaseDfd({
    inventory,
    registryPath: registryProjectPath,
  });

  if (
    JSON.stringify(firstProjection) !==
    JSON.stringify(secondProjection)
  ) {
    errors.push(
      "Repeated Base DFD projection runs produced different semantic output.",
    );
  }

  projection = firstProjection;

  validation = validateBaseDfdProjection({
    inventory,
    registryPath: registryProjectPath,
    projection,
  });

  errors.push(
    ...validation.errors.map(
      (entry) =>
        `${entry.rule_id}: ${entry.message}` +
        (entry.context ? ` [${entry.context}]` : ""),
    ),
  );

  warnings.push(
    ...validation.warnings.map(
      (entry) =>
        `${entry.rule_id}: ${entry.message}` +
        (entry.context ? ` [${entry.context}]` : ""),
    ),
  );

  errors.push(
    ...validateCaseStudyProjection(projection),
  );
} catch (error) {
  errors.push(
    `Cannot produce or validate the Base DFD projection: ${error.message}`,
  );
}

const verification = runVerificationSuite();

errors.push(...verification.errors);

if (errors.length === 0) {
  console.log(
    "Base DFD projection consistency check passed.",
  );
}

console.log(
  "Implemented requirement: MR-0003ADR-0001REQ-0006GOV-0001",
);
console.log(
  `Projection id: ${projection?.projection_id ?? "<unavailable>"}`,
);
console.log(
  `Nodes checked: ${validation?.node_count ?? 0}`,
);
console.log(
  `Flows checked: ${validation?.flow_count ?? 0}`,
);
console.log(
  `Boundaries checked: ${validation?.boundary_count ?? 0}`,
);
console.log(
  `Unprojected BAEs checked: ${validation?.unprojected_count ?? 0}`,
);
console.log(
  `Verification tests checked: ${verification.checked}`,
);
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);

if (warnings.length > 0) {
  console.log("Warnings:");

  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error("Errors:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}