#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveSafeProjectPath,
} from "../MR-0001/lib/governed-document-model-validation.mjs";
import {
  readGovernedYamlFile,
} from "../MR-0001/lib/governed-yaml.mjs";
import {
  runTargetProjectCheck,
} from "../MR-0004/run-target-project-check.mjs";
import {
  validateMethodologySpecificAnalysisRecordRepository,
} from "./check-methodology-specific-analysis-records.mjs";
import {
  validateCommonAnalysisFindingRepository,
} from "./check-common-analysis-findings.mjs";

/**
 * @file Phase-aware repository-contained analysis-core case-study verifier.
 *
 * @implementsRequirement MR-0005ADR-0002REQ-0001GOV-0003
 * @implementsRequirement MR-0004ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0005/ADR-0002
 * @derivedFromDecision MR-0004/ADR-0002
 * @macroRequirement MR-0005
 * @macroRequirement MR-0004
 * @implementationStatus implemented
 *
 * Verifies the historical Common Finding-only phase and the current end-to-end
 * common-core phase without implementing a STRIDE plugin, automatic Finding
 * derivation or automatic Security Requirement generation. Canonical Target
 * Project validation owns governed-document and cross-model Security Requirement
 * semantics; this verifier owns the deterministic case-study phase contract.
 *
 * Side effects: creates and removes temporary validation overlays and writes
 * deterministic evidence to stdout or diagnostics to stderr. Repository files
 * are never modified.
 */

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const defaultRootDir = path.resolve(scriptDirectory, "..", "..");

const defaultTargetProjectPath =
  "examples/case-studies/documentation-to-base-analysis";

export const historicalCommonFindingOnlyRevision =
  "6897359da2e60db167ff523fc2ff67ad4f14a28b";

export const caseStudyValidationPhases = Object.freeze({
  historical: "historical_common_finding_only",
  current: "current_end_to_end_core",
});

const readmePath = "README.md";
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

const expectedSecurityRequirementId =
  "MR-0001ADR-0001REQ-0001SEC-0001";

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

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function isRecord(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function problem(ruleId, message, context = "") {
  return {
    rule_id: ruleId,
    message,
    context,
  };
}

function stableProblems(diagnostics) {
  return [...diagnostics].sort((left, right) =>
    compare(
      `${left.rule_id}|${left.context}|${left.message}`,
      `${right.rule_id}|${right.context}|${right.message}`,
    ),
  );
}

function projectPath(rootDir, absolutePath) {
  return path.relative(rootDir, absolutePath).replaceAll("\\", "/");
}

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

function isAffirmativeClaim(value) {
  if (value === true) {
    return true;
  }

  return affirmativeClaimValues.has(
    String(value ?? "").trim().toLowerCase(),
  );
}

function readMapping(absolutePath) {
  const value = readGovernedYamlFile(absolutePath);

  if (!isRecord(value)) {
    throw new Error(
      `Expected a YAML mapping: ${absolutePath}`,
    );
  }

  return value;
}

function createOverlay(rootDir, targetRoot, temporaryParent) {
  const overlayRoot = fs.mkdtempSync(
    path.join(
      temporaryParent,
      "threat-forge-analysis-core-case-study-",
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
    title: String(finding.title ?? "").trim(),
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

function singleMatch(text, pattern) {
  const values = [...String(text).matchAll(pattern)]
    .map((match) => String(match[1] ?? "").trim());
  return {
    count: values.length,
    value: values.length === 1 ? values[0] : "",
  };
}

function readPhaseDeclaration(targetRoot) {
  const absolute = path.join(targetRoot, readmePath);
  const text = fs.readFileSync(absolute, "utf8");
  const phase = singleMatch(
    text,
    /^current_validation_phase:\s*([a-z0-9_]+)\s*$/gmu,
  );
  const historicalRevision = singleMatch(
    text,
    /^historical_common_finding_only_revision:\s*([0-9a-f]{40})\s*$/gmu,
  );

  return {
    source_path: readmePath,
    phase,
    historical_revision: historicalRevision,
  };
}

function loadSecurityRequirementRecords(targetRoot) {
  const directory = path.join(
    targetRoot,
    "docs",
    "reference",
    "project-model",
    "registers",
    "requirements",
  );
  const records = [];

  for (const entry of fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (item) =>
        item.isFile() &&
        /^MR-\d{4}\.requirements\.registry\.yml$/u.test(item.name),
    )
    .sort((left, right) => compare(left.name, right.name))) {
    const registry = readMapping(path.join(directory, entry.name));
    for (const record of registry.requirements ?? []) {
      const id = String(record?.id ?? "").trim();
      if (
        record?.requirement_type === "security" ||
        /^MR-\d{4}ADR-\d{4}REQ-\d{4}SEC-\d{4}$/u.test(id)
      ) {
        records.push({
          ...structuredClone(record),
          registry_path:
            `docs/reference/project-model/registers/requirements/${entry.name}`,
        });
      }
    }
  }

  return records.sort((left, right) => compare(left.id, right.id));
}

function classifiedReferences(bodyText, prefix, idPattern) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const matcher = new RegExp(
    `^\\s*-\\s*${escaped}:\\s*\\[(${idPattern})\\]\\s+(.+?)\\s*$`,
    "gmu",
  );

  return [...String(bodyText).matchAll(matcher)].map((match) => ({
    id: String(match[1]).trim(),
    title: String(match[2]).trim(),
  }));
}

function securityRequirementEvidence(targetRoot, record) {
  const bodyPath = String(record.body_path ?? "")
    .replaceAll("\\", "/")
    .trim();
  const bodyText = bodyPath
    ? fs.readFileSync(
      resolveSafeProjectPath(targetRoot, bodyPath).absolute,
      "utf8",
    )
    : "";

  return {
    id: String(record.id ?? "").trim(),
    title: String(record.title ?? "").trim(),
    registry_path: record.registry_path,
    body_path: bodyPath,
    parent_requirement_id:
      String(record.parent_requirement_id ?? "").trim(),
    parent_references: classifiedReferences(
      bodyText,
      "Parent",
      "MR-\\d{4}ADR-\\d{4}REQ-\\d{4}",
    ),
    finding_references: classifiedReferences(
      bodyText,
      "Finding",
      "FINDING-\\d{4}",
    ),
  };
}

function targetProjectErrorEvidence(report) {
  return (report.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) =>
      problem(
        `common-finding-case-study.target-project.${diagnostic.rule_id}`,
        diagnostic.message,
        `${diagnostic.source_path}:${diagnostic.location}`,
      ),
    );
}

/**
 * Verifies the repository-contained phase-aware analysis-core case study.
 *
 * @param {{
 *   rootDir?: string,
 *   targetProjectPath?: string,
 *   targetRoot?: string,
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
    input.targetRoot ??
      path.join(
        rootDir,
        ...targetProjectPath.split("/"),
      ),
  );

  const temporaryParent = path.resolve(
    input.temporaryParent ?? os.tmpdir(),
  );

  const errors = [];
  let overlayRoot = "";
  let analysisRecord = {};
  let findings = [];
  let phaseDeclaration = {
    source_path: readmePath,
    phase: { count: 0, value: "" },
    historical_revision: { count: 0, value: "" },
  };
  let securityRequirements = [];
  let securityRequirementEvidenceRecords = [];
  let targetProjectReport = {
    status: "fail",
    checks: [],
    diagnostics: [],
  };
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
    phaseDeclaration = readPhaseDeclaration(targetRoot);
    const currentPhase = phaseDeclaration.phase.value;

    if (
      phaseDeclaration.phase.count !== 1 ||
      !Object.values(caseStudyValidationPhases).includes(currentPhase)
    ) {
      errors.push(
        problem(
          "common-finding-case-study.phase-declaration",
          "The case study README must declare exactly one supported current_validation_phase.",
          readmePath,
        ),
      );
    }

    if (
      phaseDeclaration.historical_revision.count !== 1 ||
      phaseDeclaration.historical_revision.value !==
        historicalCommonFindingOnlyRevision
    ) {
      errors.push(
        problem(
          "common-finding-case-study.historical-revision",
          `The historical Common Finding-only revision must be ${historicalCommonFindingOnlyRevision}.`,
          readmePath,
        ),
      );
    }

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

    securityRequirements =
      loadSecurityRequirementRecords(targetRoot);
    securityRequirementClaimed =
      securityRequirements.length > 0;
    securityRequirementEvidenceRecords =
      securityRequirements.map((record) =>
        securityRequirementEvidence(targetRoot, record),
      );

    if (
      currentPhase === caseStudyValidationPhases.historical &&
      securityRequirements.length !== 0
    ) {
      errors.push(
        problem(
          "common-finding-case-study.security-requirement-phase",
          "The historical Common Finding-only phase must not contain a Security Requirement.",
          securityRequirements.map(({ id }) => id).join(", "),
        ),
      );
    }

    if (
      currentPhase === caseStudyValidationPhases.current &&
      securityRequirements.length !== 1
    ) {
      errors.push(
        problem(
          "common-finding-case-study.security-requirement-phase",
          "The current end-to-end core phase must contain exactly one Security Requirement.",
          `count:${securityRequirements.length}`,
        ),
      );
    }

    if (
      currentPhase === caseStudyValidationPhases.current &&
      securityRequirements.length === 1
    ) {
      const securityRequirement =
        securityRequirementEvidenceRecords[0];

      if (
        securityRequirement.id !== expectedSecurityRequirementId ||
        securityRequirement.parent_requirement_id !==
          expectedFunctionalRequirementId ||
        securityRequirement.parent_references.length !== 1 ||
        securityRequirement.parent_references[0].id !==
          expectedFunctionalRequirementId
      ) {
        errors.push(
          problem(
            "common-finding-case-study.security-requirement-identity",
            `The end-to-end Security Requirement must be ${expectedSecurityRequirementId} under ${expectedFunctionalRequirementId}.`,
            securityRequirement.id,
          ),
        );
      }

      const referencedFindings =
        securityRequirement.finding_references;
      const findingsById = new Map(
        findings.map(({ value }) => [
          String(value.id ?? "").trim(),
          value,
        ]),
      );
      const provenanceValid =
        referencedFindings.length >= 1 &&
        referencedFindings.every(({ id }) => {
          const finding = findingsById.get(id);
          const affectedSubjects =
            Array.isArray(finding?.affected_subjects)
              ? finding.affected_subjects
              : [];
          return Boolean(finding) &&
            finding.review_state === "accepted" &&
            finding.analysis_record_id === "ANALYSIS-0001" &&
            affectedSubjects.some(
              (subject) =>
                subject?.kind === "functional_requirement" &&
                subject?.id === expectedFunctionalRequirementId,
            );
        });

      if (!provenanceValid) {
        errors.push(
          problem(
            "common-finding-case-study.security-requirement-provenance",
            "Every Security Requirement Finding reference must resolve to an accepted Finding affecting its parent and preserving ANALYSIS-0001 provenance.",
            securityRequirement.body_path,
          ),
        );
      }
    }

    targetProjectReport = runTargetProjectCheck({
      engineRoot: rootDir,
      targetRoot,
      writeReports: false,
    });

    if (targetProjectReport.status !== "pass") {
      errors.push(...targetProjectErrorEvidence(
        targetProjectReport,
      ));
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

  const currentPhase = phaseDeclaration.phase.value;
  const phaseDeclared =
    phaseDeclaration.phase.count === 1 &&
    Object.values(caseStudyValidationPhases).includes(
      currentPhase,
    );
  const historicalRevisionIdentified =
    phaseDeclaration.historical_revision.count === 1 &&
    phaseDeclaration.historical_revision.value ===
      historicalCommonFindingOnlyRevision;
  const phaseSecurityRequirementConsistent =
    currentPhase === caseStudyValidationPhases.historical
      ? securityRequirements.length === 0
      : currentPhase === caseStudyValidationPhases.current
        ? securityRequirements.length === 1
        : false;
  const securityRequirementProvenanceValid =
    currentPhase === caseStudyValidationPhases.historical
      ? securityRequirements.length === 0
      : currentPhase === caseStudyValidationPhases.current &&
        securityRequirements.length === 1 &&
        !errors.some(
          ({ rule_id: ruleId }) =>
            ruleId ===
              "common-finding-case-study.security-requirement-provenance" ||
            ruleId.includes("security-requirement.cross-model"),
        );

  const valid = errors.length === 0;

  const report = {
    schema_version: 2,
    case_study_id:
      "documentation-to-base-analysis-analysis-core",
    target_project: targetProjectPath,
    phase: {
      current: currentPhase,
      declaration_source: readmePath,
      historical_common_finding_only_revision:
        phaseDeclaration.historical_revision.value,
    },
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
    security_requirements:
      securityRequirementEvidenceRecords,
    review_state_counts: reviewStateCounts,
    target_project_check: {
      status: targetProjectReport.status,
      checks: targetProjectReport.checks ?? [],
      warning_count:
        Number(targetProjectReport.warning_count ?? 0),
      error_count:
        Number(targetProjectReport.error_count ?? 0),
    },
    validation: {
      phase_declared: phaseDeclared,
      historical_revision_identified:
        historicalRevisionIdentified,
      canonical_analysis_record_valid:
        analysisValidation.valid === true,
      canonical_common_findings_valid:
        findingValidation.valid === true,
      target_project_valid:
        targetProjectReport.status === "pass",
      governed_references_resolved:
        analysisValidation.valid === true &&
        findingValidation.valid === true &&
        targetProjectReport.status === "pass",
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
      security_requirement_phase_consistent:
        phaseSecurityRequirementConsistent,
      security_requirement_provenance_valid:
        securityRequirementProvenanceValid,
    },
  };

  return {
    valid,
    report,
    errors: stableProblems(errors),
  };
}

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
      `Analysis-core case-study validation failed with ` +
      `${result.errors.length} error(s).`,
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    "Analysis-core case-study validation passed.",
  );
  console.log(JSON.stringify(result.report, null, 2));
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === scriptPath
) {
  run();
}
