import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "./governed-yaml.mjs";
import { validateFunctionalRequirementModel } from "./functional-requirement-model-validation.mjs";
import { resolveSafeProjectPath } from "./governed-document-model-validation.mjs";

/**
 * @file Governed document entity reference providers.
 *
 * @implementsRequirement MR-0001ADR-0008REQ-0002
 * @implementsRequirement MR-0001ADR-0008REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0008
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Projects canonical Functional Requirement identities from validated Requirement
 * registries and evaluates parent-reference eligibility from the current governed
 * document ownership context. The module is side-effect free apart from read-only
 * repository access performed lazily by the source projection provider.
 */

export const governedDocumentReferenceProviderIds = Object.freeze({
  functionalRequirementSource:
    "functional-requirement-registry-reference-source",
  functionalRequirementEligibility:
    "functional-requirement-parent-context",
});

const requirementRegistryDirectory =
  "docs/reference/project-model/registers/requirements";

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function listRequirementRegistryPaths(rootDir) {
  const resolved = resolveSafeProjectPath(rootDir, requirementRegistryDirectory);
  if (!fs.existsSync(resolved.absolute)) {
    throw new Error(
      `Requirement registry directory is missing: ${requirementRegistryDirectory}.`,
    );
  }
  return fs
    .readdirSync(resolved.absolute, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        /^MR-\d{4}\.requirements\.registry\.yml$/u.test(entry.name),
    )
    .map((entry) => `${requirementRegistryDirectory}/${entry.name}`)
    .sort(compare);
}

/**
 * Loads a detached canonical Functional Requirement reference projection.
 *
 * @param {{rootDir: string}} input - Repository root.
 * @returns {Array<Record<string, unknown>>} Deterministic projection.
 */
export function loadValidatedFunctionalRequirementReferenceProjection(input) {
  const rootDir = path.resolve(input?.rootDir ?? process.cwd());
  const validation = validateFunctionalRequirementModel({ rootDir });
  if (validation.diagnostics.length > 0) {
    throw new Error(
      `Canonical Functional Requirement corpus is invalid: ${validation.diagnostics
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | ")}`,
    );
  }

  const projection = [];
  const identifiers = new Set();
  for (const registryPath of listRequirementRegistryPaths(rootDir)) {
    const resolved = resolveSafeProjectPath(rootDir, registryPath);
    const registry = readGovernedYamlFile(resolved.absolute);
    for (const record of Array.isArray(registry.requirements)
      ? registry.requirements
      : []) {
      if (String(record?.requirement_type ?? "") !== "functional") continue;
      const id = String(record?.id ?? "").trim();
      const title = String(record?.title ?? "").trim();
      if (!id || !title) {
        throw new Error(
          `Validated Functional Requirement projection contains an incomplete identity in ${registryPath}.`,
        );
      }
      if (identifiers.has(id)) {
        throw new Error(
          `Functional Requirement identity resolves more than once: ${id}.`,
        );
      }
      identifiers.add(id);
      projection.push({
        id,
        title,
        status: String(record.status ?? ""),
        requirement_type: "functional",
        macro_requirement_id: String(record.macro_requirement_id ?? ""),
        decision_id: String(record.decision_id ?? ""),
        source_path: registryPath,
      });
    }
  }
  return structuredClone(
    projection.sort((left, right) => compare(left.id, right.id)),
  );
}

/**
 * Evaluates one Functional Requirement as a parent-reference candidate.
 *
 * @param {{entity?: Record<string, unknown>, currentDocument?: Record<string, unknown>}} input
 *   Reference service request context.
 * @returns {{eligible: boolean, reason: string, macro_requirement_id: string, decision_id: string}}
 *   Eligibility metadata.
 */
export function evaluateFunctionalRequirementParentEligibility(input) {
  const entity = input?.entity ?? {};
  const currentDocument = input?.currentDocument ?? {};
  const entityId = String(entity.id ?? "").trim();
  const entityMacro = String(entity.macro_requirement_id ?? "").trim();
  const entityDecision = String(entity.decision_id ?? "").trim();
  const currentMacro = String(currentDocument.macro_requirement_id ?? "").trim();
  const currentDecision = String(currentDocument.decision_id ?? "").trim();

  if (String(entity.requirement_type ?? "") !== "functional") {
    return {
      eligible: false,
      reason: `Governed entity ${entityId || "<unknown>"} is not a Functional Requirement.`,
      macro_requirement_id: entityMacro,
      decision_id: entityDecision,
    };
  }
  if (currentMacro && entityMacro !== currentMacro) {
    return {
      eligible: false,
      reason:
        `Functional Requirement ${entityId || "<unknown>"} belongs to ${entityMacro || "<empty>"}, ` +
        `not current Macro-requirement ${currentMacro}.`,
      macro_requirement_id: entityMacro,
      decision_id: entityDecision,
    };
  }
  if (currentDecision && entityDecision !== currentDecision) {
    return {
      eligible: false,
      reason:
        `Functional Requirement ${entityId || "<unknown>"} belongs to ${entityDecision || "<empty>"}, ` +
        `not current Decision ${currentDecision}.`,
      macro_requirement_id: entityMacro,
      decision_id: entityDecision,
    };
  }
  return {
    eligible: true,
    reason: "The Functional Requirement shares the current Macro-requirement and Decision context.",
    macro_requirement_id: entityMacro,
    decision_id: entityDecision,
  };
}

/**
 * Creates fresh Functional Requirement provider maps.
 *
 * @param {{rootDir: string, loadProjection?: Function}} input - Repository context.
 * @returns {{sourceProjectionProviders: Map<string, Function>, eligibilityProviders: Map<string, Function>}}
 *   Provider bundle.
 */
export function createFunctionalRequirementReferenceProviders(input) {
  const rootDir = String(input?.rootDir ?? "").trim();
  const loadProjection =
    input?.loadProjection ?? loadValidatedFunctionalRequirementReferenceProjection;
  if (!rootDir) {
    throw new TypeError(
      "Functional Requirement reference providers require a non-empty rootDir.",
    );
  }
  if (typeof loadProjection !== "function") {
    throw new TypeError(
      "Functional Requirement reference providers require a loadProjection function.",
    );
  }
  return {
    sourceProjectionProviders: new Map([
      [
        governedDocumentReferenceProviderIds.functionalRequirementSource,
        () => {
          const projection = loadProjection({ rootDir });
          if (!Array.isArray(projection)) {
            throw new TypeError(
              "Functional Requirement reference projection loader must return an array.",
            );
          }
          return structuredClone(projection);
        },
      ],
    ]),
    eligibilityProviders: new Map([
      [
        governedDocumentReferenceProviderIds.functionalRequirementEligibility,
        evaluateFunctionalRequirementParentEligibility,
      ],
    ]),
  };
}
