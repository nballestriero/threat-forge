import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  caseStudyValidationPhases,
  historicalCommonFindingOnlyRevision,
  verifyCommonFindingCaseStudy,
} from "../check-common-finding-case-study.mjs";

/**
 * @file Phase-aware end-to-end analysis-core case-study verification suite.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0003
 * @implementsRequirement MR-0004ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0005/ADR-0002
 * @derivedFromDecision MR-0004/ADR-0002
 * @macroRequirement MR-0005
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Verifies deterministic historical and end-to-end phase evidence plus isolated
 * failure conditions. Every mutation operates on a temporary Target Project and
 * never modifies the canonical repository-contained case study.
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

const readmeProjectPath = "README.md";
const analysisRecordProjectPath =
  "analysis/ANALYSIS-0001.analysis-record.yml";
const proposedFindingProjectPath =
  "analysis/FINDING-0001.analysis-finding.yml";
const acceptedFindingProjectPath =
  "analysis/FINDING-0002.analysis-finding.yml";
const requirementsRegistryProjectPath =
  "docs/reference/project-model/registers/requirements/MR-0001.requirements.registry.yml";
const securityRequirementBodyProjectPath =
  "docs/reference/project-model/body/requirements/MR-0001/" +
  "MR-0001ADR-0001REQ-0001SEC-0001_body.md";

const historicalPhaseLine =
  `current_validation_phase: ${caseStudyValidationPhases.historical}`;
const currentPhaseLine =
  `current_validation_phase: ${caseStudyValidationPhases.current}`;
const historicalRevisionLine =
  `historical_common_finding_only_revision: ` +
  historicalCommonFindingOnlyRevision;

const securityRequirementRecord = `
  - id: MR-0001ADR-0001REQ-0001SEC-0001
    title: "Verify demonstration user identity"
    status: draft
    requirement_type: security
    macro_requirement_id: MR-0001
    decision_id: ADR-0001
    parent_requirement_id: MR-0001ADR-0001REQ-0001
    body_path: docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001SEC-0001_body.md
`;

const securityRequirementBody = `# MR-0001ADR-0001REQ-0001SEC-0001 — Verify demonstration user identity

## Intent

Prevent the accepted identity Finding from remaining unresolved in the demonstration interaction.

## Parent Functional Requirement

- Parent: [MR-0001ADR-0001REQ-0001] Describe the demonstration interaction

## Finding derivation

- Finding: [FINDING-0002] Unverified demonstration user identity

## Security obligation

- The demonstration service must verify the identity claimed by the demonstration user before accepting or processing the request.

## Scope

- Includes: [BAE-0001] Demonstration user
- Includes: [BAE-0002] Demonstration service
- Includes: [BAE-0004] Service domain boundary
- Includes: [BAE-0005] Demonstration request flow
- Excludes: Technology-specific identity-verification mechanisms

## Acceptance

- The requirement is accepted when the demonstration service rejects or defers requests whose claimed demonstration-user identity has not been verified.
`;

function targetPath(targetRoot, projectPath) {
  return path.join(
    targetRoot,
    ...projectPath.split("/"),
  );
}

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

function withTemporaryTargetProject(callback) {
  const root = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "threat-forge-analysis-core-case-study-test-",
    ),
  );
  const targetRoot = path.join(root, "target-project");

  try {
    fs.cpSync(
      canonicalTargetRoot,
      targetRoot,
      {
        recursive: true,
        force: false,
        errorOnExist: true,
      },
    );

    prepareHistoricalPhase(targetRoot);

    return callback({ targetRoot });
  } finally {
    fs.rmSync(root, {
      recursive: true,
      force: true,
    });
  }
}

function verify(targetRoot) {
  return verifyCommonFindingCaseStudy({
    rootDir: repositoryRoot,
    targetRoot,
    targetProjectPath,
  });
}

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

function removeCanonicalSecurityRequirement(targetRoot) {
  const registryPath = targetPath(
    targetRoot,
    requirementsRegistryProjectPath,
  );
  const bodyPath = targetPath(
    targetRoot,
    securityRequirementBodyProjectPath,
  );
  const registryText = fs.readFileSync(registryPath, "utf8");
  const recordMarker =
    "\n  - id: MR-0001ADR-0001REQ-0001SEC-0001";
  const recordStart = registryText.indexOf(recordMarker);
  const bodyExists = fs.existsSync(bodyPath);

  if (recordStart === -1 && !bodyExists) {
    return;
  }

  if (recordStart === -1 || !bodyExists) {
    throw new Error(
      "Canonical Security Requirement fixture is incomplete.",
    );
  }

  if (
    registryText.indexOf(
      recordMarker,
      recordStart + recordMarker.length,
    ) !== -1
  ) {
    throw new Error(
      "Canonical Security Requirement fixture is duplicated.",
    );
  }

  const nextRecordStart = registryText.indexOf(
    "\n  - id:",
    recordStart + recordMarker.length,
  );
  const recordEnd = nextRecordStart === -1
    ? registryText.length
    : nextRecordStart;

  fs.writeFileSync(
    registryPath,
    `${(
      registryText.slice(0, recordStart) +
      registryText.slice(recordEnd)
    ).trimEnd()}\n`,
    "utf8",
  );
  fs.rmSync(bodyPath);
}

function prepareHistoricalPhase(targetRoot) {
  const readmePath = targetPath(
    targetRoot,
    readmeProjectPath,
  );
  const readmeText = fs.readFileSync(readmePath, "utf8");

  if (readmeText.includes(currentPhaseLine)) {
    replaceExactlyOnce(
      readmePath,
      currentPhaseLine,
      historicalPhaseLine,
    );
  } else if (!readmeText.includes(historicalPhaseLine)) {
    throw new Error(
      "Canonical phase fixture is neither current nor historical.",
    );
  }

  removeCanonicalSecurityRequirement(targetRoot);
}

function setCurrentPhase(targetRoot) {
  replaceExactlyOnce(
    targetPath(targetRoot, readmeProjectPath),
    historicalPhaseLine,
    currentPhaseLine,
  );
}

function appendSecurityRequirement(targetRoot) {
  const registryPath = targetPath(
    targetRoot,
    requirementsRegistryProjectPath,
  );
  const current = fs.readFileSync(registryPath, "utf8");
  fs.writeFileSync(
    registryPath,
    `${current.trimEnd()}\n${securityRequirementRecord}`,
    "utf8",
  );

  const bodyPath = targetPath(
    targetRoot,
    securityRequirementBodyProjectPath,
  );
  fs.mkdirSync(path.dirname(bodyPath), {
    recursive: true,
  });
  fs.writeFileSync(
    bodyPath,
    securityRequirementBody,
    "utf8",
  );
}

function prepareCurrentPhase(targetRoot) {
  setCurrentPhase(targetRoot);
  appendSecurityRequirement(targetRoot);
}

test(
  "canonical historical phase produces deterministic evidence",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      const first = verify(targetRoot);
      const second = verify(targetRoot);

      assert.equal(
        first.valid,
        true,
        JSON.stringify(first.errors, null, 2),
      );
      assert.deepEqual(first.errors, []);
      assert.deepEqual(second, first);

      assert.deepEqual(
        first.report.phase,
        {
          current:
            caseStudyValidationPhases.historical,
          declaration_source: "README.md",
          historical_common_finding_only_revision:
            historicalCommonFindingOnlyRevision,
        },
      );

      assert.equal(
        first.report.security_requirements.length,
        0,
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
        first.report.simulation,
        {
          method_id: "stride",
          plugin_implemented: false,
          automatic_finding_derivation: false,
          security_requirement_created: false,
        },
      );

      assert.equal(
        first.report.target_project_check.status,
        "pass",
      );
      assert.deepEqual(
        first.report.validation,
        {
          phase_declared: true,
          historical_revision_identified: true,
          canonical_analysis_record_valid: true,
          canonical_common_findings_valid: true,
          target_project_valid: true,
          governed_references_resolved: true,
          method_specific_data_confined: true,
          review_states_explicit: true,
          security_requirement_phase_consistent: true,
          security_requirement_provenance_valid: true,
        },
      );
    });
  },
);

test(
  "synthetic current phase proves the complete common-core chain",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      prepareCurrentPhase(targetRoot);

      const first = verify(targetRoot);
      const second = verify(targetRoot);

      assert.equal(
        first.valid,
        true,
        JSON.stringify(first.errors, null, 2),
      );
      assert.deepEqual(second, first);
      assert.equal(
        first.report.phase.current,
        caseStudyValidationPhases.current,
      );
      assert.equal(
        first.report.security_requirements.length,
        1,
      );
      assert.deepEqual(
        first.report.security_requirements[0],
        {
          id: "MR-0001ADR-0001REQ-0001SEC-0001",
          title: "Verify demonstration user identity",
          registry_path:
            requirementsRegistryProjectPath,
          body_path:
            securityRequirementBodyProjectPath,
          parent_requirement_id:
            "MR-0001ADR-0001REQ-0001",
          parent_references: [
            {
              id: "MR-0001ADR-0001REQ-0001",
              title:
                "Describe the demonstration interaction",
            },
          ],
          finding_references: [
            {
              id: "FINDING-0002",
              title:
                "Unverified demonstration user identity",
            },
          ],
        },
      );
      assert.equal(
        first.report.simulation.security_requirement_created,
        true,
      );
      assert.equal(
        first.report.target_project_check.status,
        "pass",
      );
      assert.equal(
        first.report.validation
          .security_requirement_provenance_valid,
        true,
      );
    });
  },
);

test(
  "missing phase declaration is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(targetRoot, readmeProjectPath),
        `${historicalPhaseLine}\n`,
        "",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.phase-declaration",
      );
    });
  },
);

test(
  "unknown phase declaration is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(targetRoot, readmeProjectPath),
        historicalPhaseLine,
        "current_validation_phase: unknown_phase",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.phase-declaration",
      );
    });
  },
);

test(
  "divergent historical revision is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(targetRoot, readmeProjectPath),
        historicalRevisionLine,
        "historical_common_finding_only_revision: " +
          "0000000000000000000000000000000000000000",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.historical-revision",
      );
    });
  },
);

test(
  "historical phase rejects a Security Requirement",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      appendSecurityRequirement(targetRoot);

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.security-requirement-phase",
      );
    });
  },
);

test(
  "current phase requires exactly one Security Requirement",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      setCurrentPhase(targetRoot);

      const result = verify(targetRoot);

      assertFailureRule(
        result,
        "common-finding-case-study.security-requirement-phase",
      );
      assert.equal(
        result.report.validation
          .security_requirement_provenance_valid,
        false,
      );
    });
  },
);

test(
  "current phase rejects a mismatched Security Requirement parent",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      prepareCurrentPhase(targetRoot);
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          requirementsRegistryProjectPath,
        ),
        "    parent_requirement_id: MR-0001ADR-0001REQ-0001\n",
        "    parent_requirement_id: MR-0001ADR-0001REQ-9999\n",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.security-requirement-identity",
      );
    });
  },
);

test(
  "current phase rejects an unresolved Finding derivation",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      prepareCurrentPhase(targetRoot);
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          securityRequirementBodyProjectPath,
        ),
        "- Finding: [FINDING-0002] " +
          "Unverified demonstration user identity",
        "- Finding: [FINDING-9999] " +
          "Missing demonstration Finding",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.security-requirement-provenance",
      );
    });
  },
);
test(
  "current phase rejects a proposed Finding derivation",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      prepareCurrentPhase(targetRoot);
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          securityRequirementBodyProjectPath,
        ),
        "- Finding: [FINDING-0002] " +
          "Unverified demonstration user identity",
        "- Finding: [FINDING-0001] " +
          "Replayable demonstration request",
      );

      const result = verify(targetRoot);

      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          ({ rule_id: ruleId }) =>
            ruleId ===
              "common-finding-case-study.security-requirement-provenance" ||
            ruleId.includes(
              "security-requirement.cross-model.finding.accepted",
            ),
        ),
        JSON.stringify(result.errors, null, 2),
      );
    });
  },
);

test(
  "current phase rejects methodology leakage in Security content",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      prepareCurrentPhase(targetRoot);
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          securityRequirementBodyProjectPath,
        ),
        "Prevent the accepted identity Finding from remaining unresolved in the demonstration interaction.",
        "Prevent method_id stride evidence from remaining unresolved in the demonstration interaction.",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.target-project." +
          "security-requirement.body.methodology-neutrality",
      );
    });
  },
);

test(
  "accepted Analysis Record derivation state is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          analysisRecordProjectPath,
        ),
        "derivation_state: not_accepted\n",
        "derivation_state: accepted\n",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.derivation-state",
      );
    });
  },
);
test(
  "implemented STRIDE plugin claim is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          analysisRecordProjectPath,
        ),
        "  implementation_status: not_implemented\n",
        "  implementation_status: not_implemented\n" +
          "  plugin_implemented: true\n",
      );

      const result = verify(targetRoot);

      assertFailureRule(
        result,
        "common-finding-case-study.implemented-plugin-claim",
      );
      assert.equal(
        result.report.simulation.plugin_implemented,
        true,
      );
    });
  },
);

test(
  "automatic Finding derivation claim is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          analysisRecordProjectPath,
        ),
        "  implementation_status: not_implemented\n",
        "  implementation_status: not_implemented\n" +
          "  automatic_finding_derivation: true\n",
      );

      const result = verify(targetRoot);

      assertFailureRule(
        result,
        "common-finding-case-study.automatic-derivation-claim",
      );
      assert.equal(
        result.report.simulation
          .automatic_finding_derivation,
        true,
      );
    });
  },
);

test(
  "STRIDE-specific classification in a Finding is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          proposedFindingProjectPath,
        ),
        "analysis_record_id: ANALYSIS-0001\n",
        "analysis_record_id: ANALYSIS-0001\n" +
          "category: spoofing\n",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.method-data-boundary",
      );
    });
  },
);

test(
  "omitted Finding review state is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          proposedFindingProjectPath,
        ),
        "review_state: proposed\n",
        "",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.explicit-review-state",
      );
    });
  },
);

test(
  "unresolved affected subject is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          proposedFindingProjectPath,
        ),
        "    id: BAE-0005\n",
        "    id: BAE-9999\n",
      );

      const result = verify(targetRoot);

      assert.equal(result.valid, false);
      assert.ok(
        result.errors.some(
          ({ rule_id: ruleId }) =>
            ruleId.includes("unresolved-affected-subject"),
        ),
        JSON.stringify(result.errors, null, 2),
      );
    });
  },
);
test(
  "accepted Finding without Functional Requirement is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          acceptedFindingProjectPath,
        ),
        "  - kind: functional_requirement\n" +
          "    id: MR-0001ADR-0001REQ-0001\n",
        "",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.accepted-functional-requirement",
      );
    });
  },
);

test(
  "Finding without its originating Analysis Record is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          acceptedFindingProjectPath,
        ),
        "analysis_record_id: ANALYSIS-0001\n",
        "analysis_record_id: ANALYSIS-9999\n",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.analysis-reference",
      );
    });
  },
);
test(
  "Security Requirement implication inside a Finding is rejected",
  () => {
    withTemporaryTargetProject(({ targetRoot }) => {
      replaceExactlyOnce(
        targetPath(
          targetRoot,
          proposedFindingProjectPath,
        ),
        "review_state: proposed\n",
        "review_state: proposed\n" +
          "security_requirement_id: " +
          "MR-0001ADR-0001REQ-0001SEC-0001\n",
      );

      assertFailureRule(
        verify(targetRoot),
        "common-finding-case-study.security-requirement-boundary",
      );
    });
  },
);
