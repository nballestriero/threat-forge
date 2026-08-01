import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "./governed-yaml.mjs";
import {
  parseMarkdownDocument,
  resolveSafeProjectPath,
} from "./governed-document-model-validation.mjs";
import {
  validateGovernedDocumentModelCoherence,
} from "./governed-document-model-coherence-validation.mjs";
import {
  validateSecurityRequirementModel,
} from "./security-requirement-model-validation.mjs";
import {
  loadValidatedCommonAnalysisFindingRelationProjection,
} from "../../MR-0005/check-common-analysis-findings.mjs";

/**
 * @file Read-only Finding-to-Security-Requirement traceability projection.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Rebuilds one deterministic consultable projection from validated Common
 * Finding sources and governed Security Requirement Markdown references. It
 * never writes a second canonical inventory and never mutates either source.
 *
 * Side effects: reads governed repository files only.
 */

export const securityRequirementFindingTraceabilityProjectionId =
  "security-requirement-finding-traceability";

const requirementsDirectoryProjectPath =
  "docs/reference/project-model/registers/requirements";

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function diagnosticText(diagnostics) {
  return diagnostics
    .map((entry) => {
      const sourcePath = String(
        entry.source_path ?? entry.context ?? "",
      ).trim();
      const location = String(entry.location ?? "").trim();
      const context = [sourcePath, location]
        .filter(Boolean)
        .join(":");
      return (
        `${entry.rule_id}` +
        (context ? ` [${context}]` : "") +
        `: ${entry.message}`
      );
    })
    .join(" | ");
}

function assertValidSecurityBoundary(rootDir) {
  const model = validateSecurityRequirementModel({ rootDir });
  if (model.diagnostics.length > 0) {
    throw new Error(
      "Canonical Security Requirement repository is invalid: " +
      diagnosticText(model.diagnostics),
    );
  }

  const coherence = validateGovernedDocumentModelCoherence({
    rootDir,
  });
  if (coherence.diagnostics.length > 0) {
    throw new Error(
      "Canonical governed-document coherence is invalid: " +
      diagnosticText(coherence.diagnostics),
    );
  }
}

function listRequirementRegistryPaths(rootDir) {
  const directory = resolveSafeProjectPath(
    rootDir,
    requirementsDirectoryProjectPath,
  );

  if (!fs.existsSync(directory.absolute)) {
    throw new Error(
      "Canonical Requirement registry directory is missing: " +
      requirementsDirectoryProjectPath,
    );
  }

  return fs
    .readdirSync(directory.absolute, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        /^MR-\d{4}\.requirements\.registry\.yml$/u.test(
          entry.name,
        ),
    )
    .map(
      (entry) =>
        `${requirementsDirectoryProjectPath}/${entry.name}`,
    )
    .sort(compare);
}

function parseFindingReferences(bodyText, bodyPath) {
  const parsed = parseMarkdownDocument(bodyText);
  const section = parsed.sections.find(
    (entry) => entry.heading === "Finding derivation",
  );

  if (!section) {
    throw new Error(
      `Validated Security Requirement body lacks Finding derivation: ${bodyPath}.`,
    );
  }

  return section.items.map((item) => {
    const match = String(item)
      .trim()
      .match(/^Finding:\s+\[([^\]]+)\]\s+(.+)$/u);

    if (!match) {
      throw new Error(
        `Validated Security Requirement body contains an unreadable Finding reference: ${bodyPath}.`,
      );
    }

    return {
      id: match[1].trim(),
      title: match[2].trim(),
    };
  });
}

function loadSecurityRequirementRelations(rootDir) {
  const relations = [];

  for (const registryPath of listRequirementRegistryPaths(
    rootDir,
  )) {
    const registryResolved = resolveSafeProjectPath(
      rootDir,
      registryPath,
    );
    const registry = readGovernedYamlFile(
      registryResolved.absolute,
    );

    for (const record of Array.isArray(registry.requirements)
      ? registry.requirements
      : []) {
      if (
        String(record.requirement_type ?? "").trim() !==
        "security"
      ) {
        continue;
      }

      const bodyPath = String(record.body_path ?? "")
        .replaceAll("\\", "/")
        .trim();
      const bodyResolved = resolveSafeProjectPath(
        rootDir,
        bodyPath,
      );
      const bodyText = fs.readFileSync(
        bodyResolved.absolute,
        "utf8",
      );

      relations.push({
        id: String(record.id),
        title: String(record.title),
        parent_requirement_id: String(
          record.parent_requirement_id,
        ),
        registry_path: registryPath,
        body_path: bodyPath,
        finding_references: parseFindingReferences(
          bodyText,
          bodyPath,
        ),
      });
    }
  }

  return relations.sort((left, right) =>
    compare(
      `${left.id}|${left.registry_path}|${left.body_path}`,
      `${right.id}|${right.registry_path}|${right.body_path}`,
    ),
  );
}

/**
 * Loads the deterministic reverse Finding traceability projection.
 *
 * The supplied root must already represent one complete canonical validation
 * view. For a Target Project, callers compose the existing engine-plus-target
 * validation overlay and pass that overlay as rootDir.
 *
 * @param {{rootDir: string}} input - Complete validation-view root.
 * @returns {{
 *   schema_version: number,
 *   projection_id: string,
 *   findings: Array<{
 *     id: string,
 *     title: string,
 *     review_state: string,
 *     analysis_record_id: string,
 *     affected_subjects: Array<Record<string, string>>,
 *     source_path: string,
 *     security_requirements: Array<{
 *       id: string,
 *       title: string,
 *       parent_requirement_id: string,
 *       registry_path: string,
 *       body_path: string
 *     }>
 *   }>
 * }} Detached read-only projection.
 */
export function loadSecurityRequirementFindingTraceabilityProjection(
  input,
) {
  const rootDir = path.resolve(
    String(input?.rootDir ?? "").trim(),
  );

  if (!String(input?.rootDir ?? "").trim()) {
    throw new Error(
      "An explicit complete validation-view rootDir is required.",
    );
  }

  assertValidSecurityBoundary(rootDir);

  const findings =
    loadValidatedCommonAnalysisFindingRelationProjection({
      rootDir,
    });
  const findingById = new Map(
    findings.map((finding) => [finding.id, finding]),
  );
  const securityRequirements =
    loadSecurityRequirementRelations(rootDir);
  const securityByFindingId = new Map(
    findings.map((finding) => [finding.id, []]),
  );

  for (const securityRequirement of securityRequirements) {
    for (const reference of securityRequirement.finding_references) {
      const finding = findingById.get(reference.id);

      if (!finding || finding.title !== reference.title) {
        throw new Error(
          "Validated Security Requirement Finding reference " +
          `${reference.id} does not resolve exactly.`,
        );
      }

      securityByFindingId.get(reference.id).push({
        id: securityRequirement.id,
        title: securityRequirement.title,
        parent_requirement_id:
          securityRequirement.parent_requirement_id,
        registry_path: securityRequirement.registry_path,
        body_path: securityRequirement.body_path,
      });
    }
  }

  return {
    schema_version: 1,
    projection_id:
      securityRequirementFindingTraceabilityProjectionId,
    findings: findings
      .map((finding) => ({
        id: finding.id,
        title: finding.title,
        review_state: finding.review_state,
        analysis_record_id: finding.analysis_record_id,
        affected_subjects: structuredClone(
          finding.affected_subjects,
        ),
        source_path: finding.source_path,
        security_requirements: [
          ...(securityByFindingId.get(finding.id) ?? []),
        ].sort((left, right) =>
          compare(
            `${left.id}|${left.body_path}`,
            `${right.id}|${right.body_path}`,
          ),
        ),
      }))
      .sort((left, right) =>
        compare(
          `${left.id}|${left.source_path}`,
          `${right.id}|${right.source_path}`,
        ),
      ),
  };
}
