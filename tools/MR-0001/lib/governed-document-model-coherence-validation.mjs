import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "./governed-yaml.mjs";
import {
  createDiagnostic,
  normalizeProjectPath,
  resolveSafeProjectPath,
  sortDiagnostics,
} from "./governed-document-model-validation.mjs";

/**
 * @file Cross-model relational coherence validation for governed documents.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @derivedFromDecision MR-0001/ADR-0007
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Validates inverse registry ownership, the complete MR-to-Decision-to-
 * Functional-to-Governance relation chain, unique body ownership and orphan
 * governed representations. Side effects: reads governed YAML and Markdown
 * paths under the supplied repository root.
 */

export const governedDocumentModelCoherenceRuleIds = Object.freeze({
  childRegistryOwnership:
    "governed-document.cross-model.registry.child-ownership",
  orphanRegistry: "governed-document.cross-model.registry.orphan",
  decisionOwner: "governed-document.cross-model.decision.owner",
  functionalDecision: "governed-document.cross-model.functional.decision",
  governanceParent: "governed-document.cross-model.governance.parent",
  bodyPathUniqueness: "governed-document.cross-model.body.path-uniqueness",
  orphanBody: "governed-document.cross-model.body.orphan",
});

const macroRegistryPath =
  "docs/reference/project-model/registers/macro-requirements.registry.yml";
const decisionsRegistryDir =
  "docs/reference/project-model/registers/decisions";
const requirementsRegistryDir =
  "docs/reference/project-model/registers/requirements";
const governedBodyRoots = Object.freeze([
  "docs/reference/project-model/body/macro-requirements",
  "docs/reference/project-model/body/decisions",
  "docs/reference/project-model/body/requirements",
]);

function diagnostic(ruleId, representation, sourcePath, location, message) {
  return createDiagnostic(
    ruleId,
    "governed-document-cross-model",
    representation,
    sourcePath,
    location,
    message,
  );
}

function listFilesRecursive(rootDir, directoryProjectPath, predicate) {
  const resolved = resolveSafeProjectPath(rootDir, directoryProjectPath);
  if (!fs.existsSync(resolved.absolute)) return [];
  const results = [];

  function visit(absoluteDirectory, projectDirectory) {
    for (const entry of fs.readdirSync(absoluteDirectory, {
      withFileTypes: true,
    })) {
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const projectPath = `${projectDirectory}/${entry.name}`;
      if (entry.isDirectory()) {
        visit(absolutePath, projectPath);
      } else if (entry.isFile() && predicate(projectPath)) {
        results.push(projectPath);
      }
    }
  }

  visit(resolved.absolute, directoryProjectPath);
  return results.sort((left, right) =>
    left.localeCompare(right, "en", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function listRegistryPaths(rootDir, directoryProjectPath, pattern) {
  return listFilesRecursive(
    rootDir,
    directoryProjectPath,
    (projectPath) => pattern.test(path.posix.basename(projectPath)),
  );
}

function listGovernedBodyPaths(rootDir) {
  return governedBodyRoots.flatMap((directoryProjectPath) =>
    listFilesRecursive(
      rootDir,
      directoryProjectPath,
      (projectPath) => /_body\.md$/u.test(projectPath),
    ),
  ).sort((left, right) =>
    left.localeCompare(right, "en", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function addOwner(map, projectPath, owner) {
  const normalized = normalizeProjectPath(projectPath);
  if (!normalized) return;
  const owners = map.get(normalized) ?? [];
  owners.push(owner);
  map.set(normalized, owners);
}

function readYaml(rootDir, projectPath) {
  return readGovernedYamlFile(
    resolveSafeProjectPath(rootDir, projectPath).absolute,
  );
}

function parseFunctionalIdentity(value) {
  const match = String(value ?? "").match(
    /^(MR-\d{4})(ADR-\d{4})(REQ-\d{4})$/u,
  );
  return match
    ? { macroRequirementId: match[1], decisionId: match[2], id: match[0] }
    : null;
}

function parseGovernanceIdentity(value) {
  const match = String(value ?? "").match(
    /^(MR-\d{4})(ADR-\d{4})(REQ-\d{4})(GOV-\d{4})$/u,
  );
  return match
    ? {
        macroRequirementId: match[1],
        decisionId: match[2],
        parentRequirementId: `${match[1]}${match[2]}${match[3]}`,
        id: match[0],
      }
    : null;
}

/**
 * Validates the active governed-document corpus as one relation graph.
 *
 * @param {{rootDir: string}} input - Repository root.
 * @returns {{
 *   macro_requirements_checked: number,
 *   decisions_checked: number,
 *   functional_requirements_checked: number,
 *   governance_requirements_checked: number,
 *   child_registries_checked: number,
 *   bodies_checked: number,
 *   diagnostics: Array<Record<string, unknown>>
 * }} Deterministic validation result.
 */
export function validateGovernedDocumentModelCoherence({ rootDir }) {
  const diagnostics = [];
  const macroRegistry = readYaml(rootDir, macroRegistryPath);
  const macroRequirements = Array.isArray(macroRegistry.macro_requirements)
    ? macroRegistry.macro_requirements
    : [];
  const macroById = new Map();
  const childRegistryOwners = new Map();
  const bodyOwners = new Map();

  macroRequirements.forEach((record, index) => {
    const id = String(record?.id ?? "").trim();
    if (id) macroById.set(id, record);
    addOwner(bodyOwners, record?.body_path, {
      modelId: "macro-requirement",
      id,
      sourcePath: macroRegistryPath,
      location: `$/macro_requirements/${index}/body_path`,
    });
    for (const [field, kind] of [
      ["decisions_registry_path", "decision"],
      ["requirements_registry_path", "requirement"],
    ]) {
      addOwner(childRegistryOwners, record?.[field], {
        macroRequirementId: id,
        kind,
        sourcePath: macroRegistryPath,
        location: `$/macro_requirements/${index}/${field}`,
      });
    }
  });

  for (const [registryPath, owners] of childRegistryOwners) {
    if (owners.length !== 1) {
      diagnostics.push(diagnostic(
        governedDocumentModelCoherenceRuleIds.childRegistryOwnership,
        "logical_model",
        macroRegistryPath,
        owners[0]?.location ?? "$",
        `${registryPath} must be owned by exactly one Macro-requirement; found ${owners.length}.`,
      ));
    }
    const resolved = resolveSafeProjectPath(rootDir, registryPath);
    if (!fs.existsSync(resolved.absolute)) {
      diagnostics.push(diagnostic(
        governedDocumentModelCoherenceRuleIds.childRegistryOwnership,
        "yaml_registry",
        registryPath,
        "$",
        `Declared child registry does not exist: ${registryPath}.`,
      ));
    }
  }

  const actualDecisionRegistryPaths = listRegistryPaths(
    rootDir,
    decisionsRegistryDir,
    /^MR-\d{4}\.decisions\.registry\.yml$/u,
  );
  const actualRequirementRegistryPaths = listRegistryPaths(
    rootDir,
    requirementsRegistryDir,
    /^MR-\d{4}\.requirements\.registry\.yml$/u,
  );
  const actualRegistryPaths = [
    ...actualDecisionRegistryPaths,
    ...actualRequirementRegistryPaths,
  ];

  for (const registryPath of actualRegistryPaths) {
    const owners = childRegistryOwners.get(registryPath) ?? [];
    if (owners.length !== 1) {
      diagnostics.push(diagnostic(
        governedDocumentModelCoherenceRuleIds.orphanRegistry,
        "yaml_registry",
        registryPath,
        "$",
        owners.length === 0
          ? `Canonical child registry is not declared by a Macro-requirement: ${registryPath}.`
          : `Canonical child registry has ambiguous Macro-requirement ownership: ${registryPath}.`,
      ));
    }
  }

  const decisionByKey = new Map();
  let decisionsChecked = 0;
  for (const registryPath of actualDecisionRegistryPaths) {
    const registry = readYaml(rootDir, registryPath);
    const rootMacroRequirementId = String(
      registry.macro_requirement_id ?? "",
    ).trim();
    const declaredOwners = childRegistryOwners.get(registryPath) ?? [];
    const declaredOwnerId = declaredOwners.length === 1
      ? declaredOwners[0].macroRequirementId
      : "";
    const decisions = Array.isArray(registry.decisions)
      ? registry.decisions
      : [];

    decisions.forEach((record, index) => {
      decisionsChecked += 1;
      const id = String(record?.id ?? "").trim();
      const recordMacroRequirementId = String(
        record?.macro_requirement_id ?? "",
      ).trim();
      const key = `${recordMacroRequirementId}/${id}`;
      if (key !== "/") decisionByKey.set(key, record);
      if (
        !macroById.has(recordMacroRequirementId) ||
        recordMacroRequirementId !== rootMacroRequirementId ||
        recordMacroRequirementId !== declaredOwnerId
      ) {
        diagnostics.push(diagnostic(
          governedDocumentModelCoherenceRuleIds.decisionOwner,
          "logical_model",
          registryPath,
          `$/decisions/${index}`,
          `Decision ${id || "<unknown>"} must resolve through exactly one owning Macro-requirement and its declared Decision registry.`,
        ));
      }
      addOwner(bodyOwners, record?.body_path, {
        modelId: "decision",
        id,
        sourcePath: registryPath,
        location: `$/decisions/${index}/body_path`,
      });
    });
  }

  const functionalById = new Map();
  const governanceRecords = [];
  let functionalRequirementsChecked = 0;
  let governanceRequirementsChecked = 0;

  for (const registryPath of actualRequirementRegistryPaths) {
    const registry = readYaml(rootDir, registryPath);
    const rootMacroRequirementId = String(
      registry.macro_requirement_id ?? "",
    ).trim();
    const declaredOwners = childRegistryOwners.get(registryPath) ?? [];
    const declaredOwnerId = declaredOwners.length === 1
      ? declaredOwners[0].macroRequirementId
      : "";
    const requirements = Array.isArray(registry.requirements)
      ? registry.requirements
      : [];

    requirements.forEach((record, index) => {
      const type = String(record?.requirement_type ?? "").trim();
      const id = String(record?.id ?? "").trim();
      const recordMacroRequirementId = String(
        record?.macro_requirement_id ?? "",
      ).trim();
      const decisionId = String(record?.decision_id ?? "").trim();
      const sourceLocation = `$/requirements/${index}`;

      addOwner(bodyOwners, record?.body_path, {
        modelId: type === "governance"
          ? "governance-requirement"
          : "functional-requirement",
        id,
        sourcePath: registryPath,
        location: `${sourceLocation}/body_path`,
      });

      if (type === "functional") {
        functionalRequirementsChecked += 1;
        const identity = parseFunctionalIdentity(id);
        const decision = decisionByKey.get(
          `${recordMacroRequirementId}/${decisionId}`,
        );
        if (id) functionalById.set(id, record);
        if (
          !identity ||
          !decision ||
          recordMacroRequirementId !== rootMacroRequirementId ||
          recordMacroRequirementId !== declaredOwnerId ||
          identity.macroRequirementId !== recordMacroRequirementId ||
          identity.decisionId !== decisionId
        ) {
          diagnostics.push(diagnostic(
            governedDocumentModelCoherenceRuleIds.functionalDecision,
            "logical_model",
            registryPath,
            sourceLocation,
            `Functional Requirement ${id || "<unknown>"} must resolve to the Decision encoded by its identity inside the same Macro-requirement registry topology.`,
          ));
        }
      } else if (type === "governance") {
        governanceRequirementsChecked += 1;
        governanceRecords.push({
          record,
          registryPath,
          sourceLocation,
          rootMacroRequirementId,
          declaredOwnerId,
        });
      }
    });
  }

  for (const entry of governanceRecords) {
    const record = entry.record;
    const id = String(record?.id ?? "").trim();
    const recordMacroRequirementId = String(
      record?.macro_requirement_id ?? "",
    ).trim();
    const decisionId = String(record?.decision_id ?? "").trim();
    const parentId = String(record?.parent_requirement_id ?? "").trim();
    const identity = parseGovernanceIdentity(id);
    const parent = functionalById.get(parentId);
    if (
      !identity ||
      !parent ||
      recordMacroRequirementId !== entry.rootMacroRequirementId ||
      recordMacroRequirementId !== entry.declaredOwnerId ||
      identity.macroRequirementId !== recordMacroRequirementId ||
      identity.decisionId !== decisionId ||
      identity.parentRequirementId !== parentId ||
      String(parent?.macro_requirement_id ?? "").trim() !==
        recordMacroRequirementId ||
      String(parent?.decision_id ?? "").trim() !== decisionId
    ) {
      diagnostics.push(diagnostic(
        governedDocumentModelCoherenceRuleIds.governanceParent,
        "logical_model",
        entry.registryPath,
        entry.sourceLocation,
        `Governance Requirement ${id || "<unknown>"} must resolve to the Functional Requirement encoded by its identity and preserve the same Macro-requirement and Decision chain.`,
      ));
    }
  }

  for (const [bodyPath, owners] of bodyOwners) {
    if (owners.length !== 1) {
      diagnostics.push(diagnostic(
        governedDocumentModelCoherenceRuleIds.bodyPathUniqueness,
        "logical_model",
        owners[0]?.sourcePath ?? bodyPath,
        owners[0]?.location ?? "$",
        `${bodyPath} must be owned by exactly one governed document record; found ${owners.length}.`,
      ));
    }
  }

  const actualBodyPaths = listGovernedBodyPaths(rootDir);
  for (const bodyPath of actualBodyPaths) {
    const owners = bodyOwners.get(bodyPath) ?? [];
    if (owners.length !== 1) {
      diagnostics.push(diagnostic(
        governedDocumentModelCoherenceRuleIds.orphanBody,
        "markdown_body",
        bodyPath,
        "$",
        owners.length === 0
          ? `Governed body is not linked by any canonical document record: ${bodyPath}.`
          : `Governed body has ambiguous record ownership: ${bodyPath}.`,
      ));
    }
  }

  return {
    macro_requirements_checked: macroRequirements.length,
    decisions_checked: decisionsChecked,
    functional_requirements_checked: functionalRequirementsChecked,
    governance_requirements_checked: governanceRequirementsChecked,
    child_registries_checked: actualRegistryPaths.length,
    bodies_checked: actualBodyPaths.length,
    diagnostics: sortDiagnostics(diagnostics),
  };
}
