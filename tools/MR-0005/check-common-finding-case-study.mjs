#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  readGovernedYamlFile,
} from "../MR-0001/lib/governed-yaml.mjs";
import {
  validateMethodologySpecificAnalysisRecordRepository,
} from "./check-methodology-specific-analysis-records.mjs";
import {
  validateCommonAnalysisFindingRepository,
} from "./check-common-analysis-findings.mjs";

/**
 * @file Repository-contained Common Finding case-study verifier.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0003
 * @derivedFromDecision MR-0005/ADR-0002
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Verifies the repository-contained Target Project demonstration by composing
 * engine-owned canonical reference rules with target-owned governed sources.
 * The demonstration uses a manually authored STRIDE-labelled Analysis Record
 * and manually authored methodology-neutral Common Findings. It does not
 * implement a STRIDE plugin, automatic Finding derivation or a Security
 * Requirement.
 *
 * Side effects: creates and removes one temporary validation overlay and writes
 * deterministic evidence to stdout or diagnostics to stderr. Repository files
 * are never modified.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDirectory, "..", "..");

const defaultTargetProjectPath =
  "examples/case-studies/documentation-to-base-analysis";

const analysisRecordPath =
  "analysis/ANALYSIS-0001.analysis-record.yml";

const findingPaths = Object.freeze([
  "analysis/FINDING-0001.analysis-finding.yml",
  "analysis/FINDING-0002.analysis-finding.yml",
  "analysis/FINDING-0003.analysis-finding.yml",
]);

const expectedFindingStates = Object.freeze({
  "FINDING-0001": "proposed",
  "FINDING-0002": "accepted",
  "FINDING-0003": "rejected",
});

const expectedFunctionalRequirementId =
  "MR-0001ADR-0001REQ-0001";

const methodSpecificFindingMembers = new Set([
  "method_payload",
  "category",
  "classifications",
  "applicability_rules",
  "failure_modes",
  "attack_classes",
]);

const securityRequirementMembers = new Set([
  "security_requirement",
  "security_requirements",
  "security_requirement_created",
  "security_requirement_id",
  "security_requirement_ids",
]);

const implementedPluginClaimMembers = new Set([
  "plugin_implemented",
  "analysis_engine_implemented",
  "requires_implemented_plugin",
  "requires_stride_plugin",
]);

const automaticDerivationClaimMembers = new Set([
  "automatic_finding_derivation",
  "automatic_finding_derivation_implemented",
]);

const affirmativeClaimValues = new Set([
  "true",
  "yes",
  "implemented",
  "required",
]);

/**
 * Compares values deterministically.
 *
 * @param {unknown} left - Left value.
 * @param {unknown} right - Right value.
 * @returns {number} Stable comparison result.
 */
function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Returns true when a value is a mapping.
 *
 * @param {unknown} value - Candidate value.
 * @returns {boolean} Whether the value is a mapping.
 */
function isRecord(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

/**
 * Creates one deterministic case-study diagnostic.
 *
 * @param {string} ruleId - Stable local rule identifier.
 * @param {string} message - Human-readable diagnostic.
 * @param {string} [context] - Evidence context.
 * @returns {{rule_id: string, message: string, context: string}}
 *   Diagnostic record.
 */
function problem(ruleId, message, context = "") {
  return {
    rule_id: ruleId,
    message,
    context,
  };
}

/**
 * Returns deterministic diagnostic ordering.
 *
 * @param {Array<Record<string, string>>} diagnostics - Diagnostics.
 * @returns {Array<Record<string, string>>} Sorted diagnostics.
 */
function stableProblems(diagnostics) {
  return [...diagnostics].sort((left, right) =>
    compare(
      `${left.rule_id}|${left.context}|${left.message}`,
      `${right.rule_id}|${right.context}|${right.message}`,
    ),
  );
}

/**
 * Converts an absolute path to repository notation.
 *
 * @param {string} rootDir - Repository root.
 * @param {string} absolutePath - Absolute path.
 * @returns {string} Repository-relative path.
 */
function projectPath(rootDir, absolutePath) {
  return path.relative(rootDir, absolutePath).replaceAll("\\", "/");
}

/**
 * Discovers files with one suffix below a directory.
 *
 * @param {string} rootDir - Discovery root.
 * @param {string} suffix - Required filename suffix.
 * @returns {string[]} Deterministically sorted relative paths.
 */
function discoverPaths(rootDir, suffix) {
  const discovered = [];

  function visit(directory) {
    const entries = fs.readdirSync(directory, {
      withFileTypes: true,
    }).sort((left, right) => compare(left.name, right.name));

    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(suffix)) {
        discovered.push(projectPath(rootDir, absolute));
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    visit(rootDir);
  }

  return discovered.sort(compare);
}

/**
 * Collects all mapping keys recursively.
 *
 * @param {unknown} value - Source value.
 * @param {Set<string>} [keys] - Accumulator.
 * @returns {Set<string>} Collected keys.
 */
function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }

    return keys;
  }

  if (!isRecord(value)) {
    return keys;
  }

  for (const [key, member] of Object.entries(value)) {
    keys.add(key);
    collectKeys(member, keys);
  }

  return keys;
}

/**
 * Determines whether an authored value makes an affirmative implementation
 * or requirement claim.
 *
 * @param {unknown} value - Authored claim value.
 * @returns {boolean} Whether the value is affirmative.
 */
function isAffirmativeClaim(value) {
  if (value === true) {
    return true;
  }

  return affirmativeClaimValues.has(
    String(value ?? "").trim().toLowerCase(),
  );
}

/**
 * Reads one governed YAML source.
 *
 * @param {string} absolutePath - YAML source path.
 * @returns {Record<string, unknown>} Parsed mapping.
 */
function readMapping(absolutePath) {
  const value = readGovernedYamlFile(absolutePath);

  if (!isRecord(value)) {
    throw new Error(
      `Expected a YAML mapping: ${absolutePath}`,
    );
  }

  return value;
}

/**
 * Creates the temporary engine-plus-target validation overlay.
 *
 * @param {string} rootDir - Engine repository root.
 * @param {string} targetRoot - Target Project root.
 * @param {string} temporaryParent - Temporary parent directory.
 * @returns {string} Temporary overlay root.
 */
function createOverlay(rootDir, targetRoot, temporaryParent) {
  const overlayRoot = fs.mkdtempSync(
    path.join(
      temporaryParent,
      "threat-forge-common-finding-case-study-",
    ),
  );

  fs.cpSync(
    path.join(targetRoot, "docs"),
    path.join(overlayRoot, "docs"),
    {
      recursive: true,
      force: false,
      errorOnExist: true,
    },
  );

  fs.cpSync(
    path.join(targetRoot, "analysis"),
    path.join(overlayRoot, "analysis"),
    {
      recursive: true,
      force: false,
      errorOnExist: true,
    },
  );

  const overlayRegistersDirectory = path.join(
    overlayRoot,
    "docs",
    "reference",
    "project-model",
    "registers",
  );

  fs.mkdirSync(overlayRegistersDirectory, {
    recursive: true,
  });

  fs.cpSync(
    path.join(
      rootDir,
      "docs",
      "reference",
      "project-model",
      "registers",
      "references",
    ),
    path.join(
      overlayRegistersDirectory,
      "references",
    ),
    {
      recursive: true,
      force: false,
      errorOnExist: true,
    },
  );

  return overlayRoot;
}

/**
 * Produces deterministic evidence for one Common Finding.
 *
 * @param {string} sourcePath - Target-owned source path.
 * @param {Record<string, unknown>} finding - Parsed Finding.
 * @returns {Record<string, unknown>} Evidence projection.
 */
function findingEvidence(sourcePath, finding) {
  const affectedSubjects = Array.isArray(finding.affected_subjects)
    ? finding.affected_subjects
      .filter(isRecord)
      .map((subject) => ({
        kind: String(subject.kind ?? "").trim(),
        id: String(subject.id ?? "").trim(),
      }))
      .sort((left, right) =>
        compare(
          `${left.kind}|${left.id}`,
          `${right.kind}|${right.id}`,
        ),
      )
    : [];

  return {
    id: String(finding.id ?? "").trim(),
    source_path: sourcePath,
    analysis_record_id:
      String(finding.analysis_record_id ?? "").trim(),
    review_state:
      String(finding.review_state ?? "").trim(),
    affected_subjects: affectedSubjects,
    functional_requirement_ids: affectedSubjects
      .filter(
        ({ kind }) =>
          kind === "functional_requirement",
      )
      .map(({ id }) => id)
      .sort(compare),
  };
}

/**
 * Verifies the repository-contained Common Finding case study.
 *
 * @param {{
 *   rootDir?: string,
 *   targetProjectPath?: string,
 *   temporaryParent?: string
 * }} [input] - Verification context.
 * @returns {{
 *   valid: boolean,
 *   report: Record<string, unknown>,
 *   errors: Array<Record<string, string>>
 * }} Deterministic verification result.
 */
export function verifyCommonFindingCaseStudy(input = {}) {
  const rootDir = path.resolve(
    input.rootDir ?? defaultRootDir,
  );

  const targetProjectPath = String(
    input.targetProjectPath ??
      defaultTargetProjectPath,
  ).replaceAll("\\", "/");

  const targetRoot = path.resolve(
    rootDir,
    ...targetProjectPath.split("/"),
  );

  const temporaryParent = path.resolve(
    input.temporaryParent ?? os.tmpdir(),
  );

  const errors = [];
  let overlayRoot = "";
  let analysisRecord = {};
  let findings = [];
  let pluginImplementationClaimed = false;
  let automaticFindingDerivationClaimed = false;
  let securityRequirementClaimed = false;

  const reviewStateCounts = {
    proposed: 0,
    accepted: 0,
    rejected: 0,
  };

  let analysisValidation = {
    valid: false,
    record_count: 0,
    record_paths: [],
    errors: [],
  };

  let findingValidation = {
    valid: false,
    finding_count: 0,
    finding_paths: [],
    errors: [],
  };

  try {
    const targetAnalysisDirectory = path.join(
      targetRoot,
      "analysis",
    );

    const discoveredRecordPaths = discoverPaths(
      targetAnalysisDirectory,
      ".analysis-record.yml",
    ).map((value) => `analysis/${value}`);

    const discoveredFindingPaths = discoverPaths(
      targetAnalysisDirectory,
      ".analysis-finding.yml",
    ).map((value) => `analysis/${value}`);

    if (
      discoveredRecordPaths.length !== 1 ||
      discoveredRecordPaths[0] !== analysisRecordPath
    ) {
      errors.push(
        problem(
          "common-finding-case-study.analysis-record-set",
          "The case study must contain exactly the canonical simulated Analysis Record.",
          discoveredRecordPaths.join(", "),
        ),
      );
    }

    if (
      JSON.stringify(discoveredFindingPaths) !==
      JSON.stringify(findingPaths)
    ) {
      errors.push(
        problem(
          "common-finding-case-study.finding-set",
          "The case study must contain exactly the three canonical Common Findings.",
          discoveredFindingPaths.join(", "),
        ),
      );
    }

    analysisRecord = readMapping(
      path.join(
        targetRoot,
        ...analysisRecordPath.split("/"),
      ),
    );

    findings = findingPaths.map((findingPath) => ({
      path: findingPath,
      value: readMapping(
        path.join(
          targetRoot,
          ...findingPath.split("/"),
        ),
      ),
    }));

    overlayRoot = createOverlay(
      rootDir,
      targetRoot,
      temporaryParent,
    );

    analysisValidation =
      validateMethodologySpecificAnalysisRecordRepository({
        rootDir: overlayRoot,
        recordPaths: [analysisRecordPath],
      });

    findingValidation =
      validateCommonAnalysisFindingRepository({
        rootDir: overlayRoot,
        findingPaths,
      });

    for (const diagnostic of analysisValidation.errors) {
      errors.push(
        problem(
          `common-finding-case-study.${diagnostic.rule_id}`,
          diagnostic.message,
          diagnostic.context,
        ),
      );
    }

    for (const diagnostic of findingValidation.errors) {
      errors.push(
        problem(
          `common-finding-case-study.${diagnostic.rule_id}`,
          diagnostic.message,
          diagnostic.context,
        ),
      );
    }

    if (analysisRecord.id !== "ANALYSIS-0001") {
      errors.push(
        problem(
          "common-finding-case-study.analysis-id",
          "The simulated Analysis Record id must be ANALYSIS-0001.",
          analysisRecordPath,
        ),
      );
    }

    if (analysisRecord.method_id !== "stride") {
      errors.push(
        problem(
          "common-finding-case-study.method-id",
          "The simulated Analysis Record method_id must be stride.",
          analysisRecordPath,
        ),
      );
    }

    if (analysisRecord.derivation_state !== "not_accepted") {
      errors.push(
        problem(
          "common-finding-case-study.derivation-state",
          "The simulated Analysis Record must remain not_accepted so no automatic Finding derivation is implied.",
          analysisRecordPath,
        ),
      );
    }

    const methodPayload = isRecord(
      analysisRecord.method_payload,
    )
      ? analysisRecord.method_payload
      : {};

    if (
      !isRecord(analysisRecord.method_payload) ||
      methodPayload.simulation_only !== true ||
      methodPayload.implementation_status !==
        "not_implemented"
    ) {
      if (
        isRecord(analysisRecord.method_payload) &&
        methodPayload.implementation_status !== undefined &&
        methodPayload.implementation_status !==
          "not_implemented"
      ) {
        pluginImplementationClaimed = true;
      }

      errors.push(
        problem(
          "common-finding-case-study.simulation-boundary",
          "The Analysis Record method_payload must explicitly declare simulation_only true and implementation_status not_implemented.",
          `${analysisRecordPath}:method_payload`,
        ),
      );
    }

    for (const member of implementedPluginClaimMembers) {
      if (
        Object.prototype.hasOwnProperty.call(
          methodPayload,
          member,
        ) &&
        isAffirmativeClaim(methodPayload[member])
      ) {
        pluginImplementationClaimed = true;

        errors.push(
          problem(
            "common-finding-case-study.implemented-plugin-claim",
            `The simulated method_payload claims or requires an implemented STRIDE plugin through member ${member}.`,
            `${analysisRecordPath}:method_payload.${member}`,
          ),
        );
      }
    }

    for (const member of automaticDerivationClaimMembers) {
      if (
        Object.prototype.hasOwnProperty.call(
          methodPayload,
          member,
        ) &&
        isAffirmativeClaim(methodPayload[member])
      ) {
        automaticFindingDerivationClaimed = true;

        errors.push(
          problem(
            "common-finding-case-study.automatic-derivation-claim",
            `The simulated method_payload claims automatic Finding derivation through member ${member}.`,
            `${analysisRecordPath}:method_payload.${member}`,
          ),
        );
      }
    }

    for (const member of methodSpecificFindingMembers) {
      if (
        member !== "method_payload" &&
        Object.prototype.hasOwnProperty.call(
          analysisRecord,
          member,
        )
      ) {
        errors.push(
          problem(
            "common-finding-case-study.method-data-boundary",
            `STRIDE-specific member ${member} occurs outside method_payload.`,
            analysisRecordPath,
          ),
        );
      }
    }

    const analysisRecordKeys = collectKeys(analysisRecord);

    for (const member of securityRequirementMembers) {
      if (analysisRecordKeys.has(member)) {
        securityRequirementClaimed = true;

        errors.push(
          problem(
            "common-finding-case-study.security-requirement-boundary",
            `The simulated Analysis Record implies a Security Requirement through member ${member}.`,
            analysisRecordPath,
          ),
        );
      }
    }

    const findingIds = new Set();

    for (const { path: findingPath, value: finding } of findings) {
      const findingId = String(finding.id ?? "").trim();
      const reviewState =
        String(finding.review_state ?? "").trim();

      findingIds.add(findingId);

      if (
        !Object.prototype.hasOwnProperty.call(
          finding,
          "review_state",
        )
      ) {
        errors.push(
          problem(
            "common-finding-case-study.explicit-review-state",
            "Every Common Finding must explicitly author review_state.",
            findingPath,
          ),
        );
      }

      if (
        expectedFindingStates[findingId] !== reviewState
      ) {
        errors.push(
          problem(
            "common-finding-case-study.review-state",
            `Unexpected review state for ${findingId || "<empty>"}.`,
            findingPath,
          ),
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          reviewStateCounts,
          reviewState,
        )
      ) {
        reviewStateCounts[reviewState] += 1;
      }

      if (finding.analysis_record_id !== "ANALYSIS-0001") {
        errors.push(
          problem(
            "common-finding-case-study.analysis-reference",
            "Every Common Finding must reference ANALYSIS-0001.",
            findingPath,
          ),
        );
      }

      const keys = collectKeys(finding);

      for (const member of methodSpecificFindingMembers) {
        if (keys.has(member)) {
          errors.push(
            problem(
              "common-finding-case-study.method-data-boundary",
              `Common Finding contains method-specific member ${member}.`,
              findingPath,
            ),
          );
        }
      }

      for (const member of securityRequirementMembers) {
        if (keys.has(member)) {
          securityRequirementClaimed = true;

          errors.push(
            problem(
              "common-finding-case-study.security-requirement-boundary",
              `Common Finding implies a Security Requirement through member ${member}.`,
              findingPath,
            ),
          );
        }
      }
    }

    const expectedFindingIds = Object.keys(
      expectedFindingStates,
    ).sort(compare);

    if (
      JSON.stringify([...findingIds].sort(compare)) !==
      JSON.stringify(expectedFindingIds)
    ) {
      errors.push(
        problem(
          "common-finding-case-study.finding-identities",
          "The canonical Finding identities are incomplete or divergent.",
          [...findingIds].sort(compare).join(", "),
        ),
      );
    }

    for (const [state, count] of Object.entries(
      reviewStateCounts,
    )) {
      if (count !== 1) {
        errors.push(
          problem(
            "common-finding-case-study.review-state-count",
            `Exactly one ${state} Common Finding is required.`,
            `${state}:${count}`,
          ),
        );
      }
    }

    const acceptedFinding = findings
      .map(({ value }) => value)
      .find(
        (finding) =>
          finding.review_state === "accepted",
      );

    const acceptedFunctionalRequirementIds =
      Array.isArray(acceptedFinding?.affected_subjects)
        ? acceptedFinding.affected_subjects
          .filter(
            (subject) =>
              isRecord(subject) &&
              subject.kind === "functional_requirement",
          )
          .map((subject) =>
            String(subject.id ?? "").trim(),
          )
          .sort(compare)
        : [];

    if (
      !acceptedFunctionalRequirementIds.includes(
        expectedFunctionalRequirementId,
      )
    ) {
      errors.push(
        problem(
          "common-finding-case-study.accepted-functional-requirement",
          `The accepted Common Finding must reference ${expectedFunctionalRequirementId}.`,
          "FINDING-0002",
        ),
      );
    }

    const securityRequirementArtifacts = discoverPaths(
      targetAnalysisDirectory,
      ".security-requirement.yml",
    );

    if (securityRequirementArtifacts.length !== 0) {
      securityRequirementClaimed = true;

      errors.push(
        problem(
          "common-finding-case-study.security-requirement-artifact",
          "The simulation must not create a Security Requirement artifact.",
          securityRequirementArtifacts.join(", "),
        ),
      );
    }
  } catch (error) {
    errors.push(
      problem(
        "common-finding-case-study.execution",
        error.message,
      ),
    );
  } finally {
    if (overlayRoot && fs.existsSync(overlayRoot)) {
      fs.rmSync(overlayRoot, {
        recursive: true,
        force: true,
      });
    }
  }

  const findingEvidenceRecords = findings
    .map(({ path: findingPath, value }) =>
      findingEvidence(findingPath, value),
    )
    .sort((left, right) => compare(left.id, right.id));

  const analysisSubjects = Array.isArray(
    analysisRecord.subjects,
  )
    ? analysisRecord.subjects
      .filter(isRecord)
      .map((subject) => ({
        kind: String(subject.kind ?? "").trim(),
        id: String(subject.id ?? "").trim(),
      }))
      .sort((left, right) =>
        compare(
          `${left.kind}|${left.id}`,
          `${right.kind}|${right.id}`,
        ),
      )
    : [];

  const methodPayloadKeys = isRecord(
    analysisRecord.method_payload,
  )
    ? Object.keys(analysisRecord.method_payload).sort(compare)
    : [];

  const valid = errors.length === 0;

  const report = {
    schema_version: 1,
    case_study_id:
      "documentation-to-base-analysis-common-finding",
    target_project: targetProjectPath,
    simulation: {
      method_id:
        String(analysisRecord.method_id ?? "").trim(),
      plugin_implemented:
        pluginImplementationClaimed,
      automatic_finding_derivation:
        automaticFindingDerivationClaimed,
      security_requirement_created:
        securityRequirementClaimed,
    },
    analysis_records: [
      {
        id: String(analysisRecord.id ?? "").trim(),
        source_path: analysisRecordPath,
        derivation_state:
          String(
            analysisRecord.derivation_state ?? "",
          ).trim(),
        subjects: analysisSubjects,
        method_payload_keys: methodPayloadKeys,
      },
    ],
    findings: findingEvidenceRecords,
    review_state_counts: reviewStateCounts,
    validation: {
      canonical_analysis_record_valid:
        analysisValidation.valid === true,
      canonical_common_findings_valid:
        findingValidation.valid === true,
      governed_references_resolved:
        analysisValidation.valid === true &&
        findingValidation.valid === true,
      method_specific_data_confined:
        !errors.some(
          ({ rule_id: ruleId }) =>
            ruleId ===
            "common-finding-case-study.method-data-boundary",
        ),
      review_states_explicit:
        !errors.some(
          ({ rule_id: ruleId }) =>
            ruleId ===
            "common-finding-case-study.explicit-review-state",
        ),
    },
  };

  return {
    valid,
    report,
    errors: stableProblems(errors),
  };
}

/**
 * Executes the repository-contained case-study verifier.
 *
 * @returns {void}
 */
function run() {
  const result = verifyCommonFindingCaseStudy();

  if (!result.valid) {
    for (const diagnostic of result.errors) {
      const context = diagnostic.context
        ? ` [${diagnostic.context}]`
        : "";

      console.error(
        `${diagnostic.rule_id}${context}: ${diagnostic.message}`,
      );
    }

    console.error(
      `Common Finding case-study validation failed with ` +
      `${result.errors.length} error(s).`,
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    "Common Finding case-study validation passed.",
  );
  console.log(JSON.stringify(result.report, null, 2));
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === scriptPath
) {
  run();
}
