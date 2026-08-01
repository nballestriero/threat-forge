import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadSecurityRequirementFindingTraceabilityProjection,
  securityRequirementFindingTraceabilityProjectionId,
} from "../lib/security-requirement-finding-traceability.mjs";
import {
  createTargetProjectValidationOverlay,
} from "../../MR-0004/run-target-project-check.mjs";

/**
 * @file Finding-to-Security-Requirement traceability verification.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Proves deterministic read-only reverse traceability from the validated
 * documentation-to-base-analysis Target Project.
 */

const testPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(
  path.dirname(testPath),
  "..",
  "..",
  "..",
);
const canonicalTargetRoot = path.join(
  repositoryRoot,
  "examples",
  "case-studies",
  "documentation-to-base-analysis",
);

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function hashTree(rootDir) {
  const hash = crypto.createHash("sha256");

  function visit(directory) {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => compare(left.name, right.name))) {
      if (
        entry.name === ".git" ||
        entry.name === "node_modules" ||
        entry.name === "artifacts"
      ) {
        continue;
      }

      const absolute = path.join(directory, entry.name);
      const relative = path
        .relative(rootDir, absolute)
        .replaceAll("\\", "/");

      hash.update(`${entry.isDirectory() ? "D" : "F"}:${relative}\n`);

      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        hash.update(fs.readFileSync(absolute));
      }
    }
  }

  visit(rootDir);
  return hash.digest("hex");
}

function withOverlay(targetRoot, callback) {
  const overlayRoot = createTargetProjectValidationOverlay(
    repositoryRoot,
    targetRoot,
  );

  try {
    return callback(overlayRoot);
  } finally {
    fs.rmSync(overlayRoot, {
      recursive: true,
      force: true,
    });
  }
}

function loadProjection(targetRoot = canonicalTargetRoot) {
  return withOverlay(targetRoot, (overlayRoot) =>
    loadSecurityRequirementFindingTraceabilityProjection({
      rootDir: overlayRoot,
    }),
  );
}

test("projection is deterministic and canonically identified", () => {
  const first = loadProjection();
  const second = loadProjection();

  assert.deepEqual(second, first);
  assert.equal(first.schema_version, 1);
  assert.equal(
    first.projection_id,
    securityRequirementFindingTraceabilityProjectionId,
  );
});

test("projection contains all three validated Findings", () => {
  const projection = loadProjection();

  assert.deepEqual(
    projection.findings.map((finding) => finding.id),
    ["FINDING-0001", "FINDING-0002", "FINDING-0003"],
  );
  assert.deepEqual(
    projection.findings.map((finding) => finding.review_state),
    ["proposed", "accepted", "rejected"],
  );
  assert.ok(
    projection.findings.every(
      (finding) => finding.analysis_record_id === "ANALYSIS-0001",
    ),
  );
});

test("accepted Finding exposes the governed Security Requirement", () => {
  const projection = loadProjection();
  const finding = projection.findings.find(
    (entry) => entry.id === "FINDING-0002",
  );

  assert.deepEqual(finding.security_requirements, [
    {
      id: "MR-0001ADR-0001REQ-0001SEC-0001",
      title:
        "Verify the demonstration user's identity before processing requests",
      parent_requirement_id: "MR-0001ADR-0001REQ-0001",
      registry_path:
        "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml",
      body_path:
        "docs/reference/project-model/body/requirements/MR-0001/" +
        "MR-0001ADR-0001REQ-0001SEC-0001_body.md",
    },
  ]);
});

test("unreferenced Findings remain visible with empty reverse links", () => {
  const projection = loadProjection();

  for (const findingId of ["FINDING-0001", "FINDING-0003"]) {
    assert.deepEqual(
      projection.findings.find(
        (entry) => entry.id === findingId,
      ).security_requirements,
      [],
    );
  }
});

test("projection leaves engine and Target Project sources unchanged", () => {
  const engineBefore = hashTree(repositoryRoot);
  const targetBefore = hashTree(canonicalTargetRoot);

  loadProjection();

  assert.equal(hashTree(repositoryRoot), engineBefore);
  assert.equal(hashTree(canonicalTargetRoot), targetBefore);
});

test("projection fails closed when accepted Finding provenance is invalid", () => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "threat-forge-security-traceability-test-",
    ),
  );
  const targetRoot = path.join(temporaryRoot, "target-project");

  try {
    fs.cpSync(canonicalTargetRoot, targetRoot, {
      recursive: true,
      force: false,
      errorOnExist: true,
    });

    const findingPath = path.join(
      targetRoot,
      "analysis",
      "FINDING-0002.analysis-finding.yml",
    );
    const source = fs.readFileSync(findingPath, "utf8");
    assert.equal(
      (source.match(/review_state:\s+accepted/gu) ?? []).length,
      1,
    );
    fs.writeFileSync(
      findingPath,
      source.replace(
        "review_state: accepted",
        "review_state: proposed",
      ),
      "utf8",
    );

    assert.throws(
      () => loadProjection(targetRoot),
      /coherence|accepted|invalid/iu,
    );
  } finally {
    fs.rmSync(temporaryRoot, {
      recursive: true,
      force: true,
    });
  }
});
