import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  verifyCommonFindingCaseStudy,
} from "../check-common-finding-case-study.mjs";

/**
 * @file Repository-contained Common Finding case-study verification suite.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0003
 * @derivedFromDecision MR-0005/ADR-0002
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Verifies deterministic positive evidence and isolated failure conditions for
 * the repository-contained Common Finding case study. Each negative case works
 * on a temporary copy and never modifies the canonical Target Project.
 *
 * Side effects: creates and removes isolated operating-system temporary
 * directories. Repository files are never modified.
 */

const testPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(
  path.dirname(testPath),
  "..",
  "..",
  "..",
);

const targetProjectPath =
  "examples/case-studies/documentation-to-base-analysis";

const canonicalTargetRoot = path.join(
  repositoryRoot,
  ...targetProjectPath.split("/"),
);

const canonicalReferencesRoot = path.join(
  repositoryRoot,
  "docs",
  "reference",
  "project-model",
  "registers",
  "references",
);

const analysisRecordProjectPath =
  "analysis/ANALYSIS-0001.analysis-record.yml";

const proposedFindingProjectPath =
  "analysis/FINDING-0001.analysis-finding.yml";

const acceptedFindingProjectPath =
  "analysis/FINDING-0002.analysis-finding.yml";

/**
 * Resolves one path inside the copied Target Project.
 *
 * @param {string} targetRoot - Temporary Target Project root.
 * @param {string} projectPath - Target-relative project path.
 * @returns {string} Absolute path.
 */
function targetPath(targetRoot, projectPath) {
  return path.join(
    targetRoot,
    ...projectPath.split("/"),
  );
}

/**
 * Replaces exactly one text fragment.
 *
 * @param {string} filePath - Source file.
 * @param {string} oldText - Required current fragment.
 * @param {string} newText - Replacement fragment.
 * @returns {void}
 */
function replaceExactlyOnce(filePath, oldText, newText) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const firstIndex = sourceText.indexOf(oldText);

  if (firstIndex === -1) {
    throw new Error(
      `Required mutation fragment is missing: ${filePath}`,
    );
  }

  if (
    sourceText.indexOf(
      oldText,
      firstIndex + oldText.length,
    ) !== -1
  ) {
    throw new Error(
      `Mutation fragment resolves more than once: ${filePath}`,
    );
  }

  fs.writeFileSync(
    filePath,
    sourceText.replace(oldText, newText),
    "utf8",
  );
}

/**
 * Creates one isolated engine-plus-target repository root.
 *
 * @param {(context: {
 *   rootDir: string,
 *   targetRoot: string
 * }) => unknown} callback - Test operation.
 * @returns {unknown} Callback result.
 */
function withTemporaryRepository(callback) {
  const rootDir = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "threat-forge-common-finding-case-study-test-",
    ),
  );

  const temporaryTargetRoot = path.join(
    rootDir,
    ...targetProjectPath.split("/"),
  );

  const temporaryReferencesRoot = path.join(
    rootDir,
    "docs",
    "reference",
    "project-model",
    "registers",
    "references",
  );

  try {
    fs.mkdirSync(
      path.dirname(temporaryTargetRoot),
      {
        recursive: true,
      },
    );

    fs.cpSync(
      canonicalTargetRoot,
      temporaryTargetRoot,
      {
        recursive: true,
        force: false,
        errorOnExist: true,
      },
    );

    fs.mkdirSync(
      path.dirname(temporaryReferencesRoot),
      {
        recursive: true,
      },
    );

    fs.cpSync(
      canonicalReferencesRoot,
      temporaryReferencesRoot,
      {
        recursive: true,
        force: false,
        errorOnExist: true,
      },
    );

    return callback({
      rootDir,
      targetRoot: temporaryTargetRoot,
    });
  } finally {
    fs.rmSync(rootDir, {
      recursive: true,
      force: true,
    });
  }
}

/**
 * Executes the verifier against one temporary repository.
 *
 * @param {string} rootDir - Temporary repository root.
 * @returns {ReturnType<typeof verifyCommonFindingCaseStudy>}
 *   Verification result.
 */
function verify(rootDir) {
  return verifyCommonFindingCaseStudy({
    rootDir,
    targetProjectPath,
  });
}

/**
 * Asserts one expected failure rule.
 *
 * @param {ReturnType<typeof verifyCommonFindingCaseStudy>} result
 *   Verification result.
 * @param {string} ruleId - Expected diagnostic rule.
 * @returns {void}
 */
function assertFailureRule(result, ruleId) {
  assert.equal(
    result.valid,
    false,
    "Negative case unexpectedly passed.",
  );

  assert.ok(
    result.errors.some(
      (diagnostic) =>
        diagnostic.rule_id === ruleId,
    ),
    `Expected rule ${ruleId}; received:\n` +
      JSON.stringify(result.errors, null, 2),
  );
}

test(
  "canonical case study produces deterministic evidence",
  () => {
    withTemporaryRepository(({ rootDir }) => {
      const first = verify(rootDir);
      const second = verify(rootDir);

      assert.equal(
        first.valid,
        true,
        JSON.stringify(first.errors, null, 2),
      );

      assert.deepEqual(first.errors, []);
      assert.deepEqual(second, first);

      assert.equal(
        first.report.analysis_records.length,
        1,
      );

      assert.deepEqual(
        first.report.review_state_counts,
        {
          proposed: 1,
          accepted: 1,
          rejected: 1,
        },
      );

      assert.deepEqual(
        first.report.findings.map(
          ({ id, review_state: reviewState }) => ({
            id,
            review_state: reviewState,
          }),
        ),
        [
          {
            id: "FINDING-0001",
            review_state: "proposed",
          },
          {
            id: "FINDING-0002",
            review_state: "accepted",
          },
          {
            id: "FINDING-0003",
            review_state: "rejected",
          },
        ],
      );

      const acceptedFinding =
        first.report.findings.find(
          ({ id }) => id === "FINDING-0002",
        );

      assert.deepEqual(
        acceptedFinding.functional_requirement_ids,
        ["MR-0001ADR-0001REQ-0001"],
      );

      assert.deepEqual(
        first.report.simulation,
        {
          method_id: "stride",
          plugin_implemented: false,
          automatic_finding_derivation: false,
          security_requirement_created: false,
        },
      );

      assert.deepEqual(
        first.report.validation,
        {
          canonical_analysis_record_valid: true,
          canonical_common_findings_valid: true,
          governed_references_resolved: true,
          method_specific_data_confined: true,
          review_states_explicit: true,
        },
      );
    });
  },
);

test(
  "implemented STRIDE plugin claim is rejected",
  () => {
    withTemporaryRepository(
      ({ rootDir, targetRoot }) => {
        replaceExactlyOnce(
          targetPath(
            targetRoot,
            analysisRecordProjectPath,
          ),
          "  implementation_status: not_implemented\n",
          "  implementation_status: not_implemented\n" +
            "  plugin_implemented: true\n",
        );

        const result = verify(rootDir);

        assertFailureRule(
          result,
          "common-finding-case-study.implemented-plugin-claim",
        );

        assert.equal(
          result.report.simulation.plugin_implemented,
          true,
        );
      },
    );
  },
);

test(
  "automatic Finding derivation claim is rejected",
  () => {
    withTemporaryRepository(
      ({ rootDir, targetRoot }) => {
        replaceExactlyOnce(
          targetPath(
            targetRoot,
            analysisRecordProjectPath,
          ),
          "  implementation_status: not_implemented\n",
          "  implementation_status: not_implemented\n" +
            "  automatic_finding_derivation: true\n",
        );

        const result = verify(rootDir);

        assertFailureRule(
          result,
          "common-finding-case-study.automatic-derivation-claim",
        );

        assert.equal(
          result.report.simulation
            .automatic_finding_derivation,
          true,
        );
      },
    );
  },
);

test(
  "STRIDE-specific classification in a Finding is rejected",
  () => {
    withTemporaryRepository(
      ({ rootDir, targetRoot }) => {
        replaceExactlyOnce(
          targetPath(
            targetRoot,
            proposedFindingProjectPath,
          ),
          "analysis_record_id: ANALYSIS-0001\n",
          "analysis_record_id: ANALYSIS-0001\n" +
            "category: spoofing\n",
        );

        const result = verify(rootDir);

        assertFailureRule(
          result,
          "common-finding-case-study.method-data-boundary",
        );
      },
    );
  },
);

test(
  "omitted Finding review state is rejected",
  () => {
    withTemporaryRepository(
      ({ rootDir, targetRoot }) => {
        replaceExactlyOnce(
          targetPath(
            targetRoot,
            proposedFindingProjectPath,
          ),
          "review_state: proposed\n",
          "",
        );

        const result = verify(rootDir);

        assertFailureRule(
          result,
          "common-finding-case-study.explicit-review-state",
        );
      },
    );
  },
);

test(
  "unresolved affected subject is rejected",
  () => {
    withTemporaryRepository(
      ({ rootDir, targetRoot }) => {
        replaceExactlyOnce(
          targetPath(
            targetRoot,
            proposedFindingProjectPath,
          ),
          "    id: BAE-0005\n",
          "    id: BAE-9999\n",
        );

        const result = verify(rootDir);

        assert.equal(result.valid, false);

        assert.ok(
          result.errors.some(
            ({ rule_id: ruleId }) =>
              ruleId.includes(
                "unresolved-affected-subject",
              ),
          ),
          JSON.stringify(result.errors, null, 2),
        );
      },
    );
  },
);

test(
  "accepted Finding without Functional Requirement is rejected",
  () => {
    withTemporaryRepository(
      ({ rootDir, targetRoot }) => {
        replaceExactlyOnce(
          targetPath(
            targetRoot,
            acceptedFindingProjectPath,
          ),
          "  - kind: functional_requirement\n" +
            "    id: MR-0001ADR-0001REQ-0001\n",
          "",
        );

        const result = verify(rootDir);

        assertFailureRule(
          result,
          "common-finding-case-study.accepted-functional-requirement",
        );
      },
    );
  },
);

test(
  "Security Requirement implication is rejected",
  () => {
    withTemporaryRepository(
      ({ rootDir, targetRoot }) => {
        replaceExactlyOnce(
          targetPath(
            targetRoot,
            proposedFindingProjectPath,
          ),
          "review_state: proposed\n",
          "review_state: proposed\n" +
            "security_requirement_id: SR-0001\n",
        );

        const result = verify(rootDir);

        assertFailureRule(
          result,
          "common-finding-case-study.security-requirement-boundary",
        );

        assert.equal(
          result.report.simulation
            .security_requirement_created,
          true,
        );
      },
    );
  },
);
