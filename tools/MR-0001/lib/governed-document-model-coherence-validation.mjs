import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "./governed-yaml.mjs";
import {
  createDiagnostic,
  normalizeProjectPath,
  resolveSafeProjectPath,
  sortDiagnostics,
} from "./governed-document-model-validation.mjs";
import {
  loadGovernedDocumentModelSourceSet,
  resolveGovernedRequirementVariant,
} from "./governed-document-model-sources.mjs";
import {
  buildGovernedDocumentCrossModelProviderCatalog,
  governedDocumentCrossModelProviders,
} from "./governed-document-cross-model-providers.mjs";

/**
 * @file Cross-model relational coherence validation for governed documents.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0007
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Coordinates registry topology, exclusive body ownership and explicit
 * model-specific relation providers derived from the canonical model inventory.
 * Side effects: reads governed YAML and Markdown paths under the supplied root.
 */

export const governedDocumentModelCoherenceRuleIds = Object.freeze({
  childRegistryOwnership:
    "governed-document.cross-model.registry.child-ownership",
  orphanRegistry: "governed-document.cross-model.registry.orphan",
  decisionOwner: "governed-document.cross-model.decision.owner",
  functionalDecision: "governed-document.cross-model.functional.decision",
  governanceParent: "governed-document.cross-model.governance.parent",
  requirementType: "governed-document.cross-model.requirement.type",
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

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function addRecord(context, entry) {
  const byId = context.recordsByModelId.get(entry.modelId);
  if (!byId) {
    throw new Error(
      `Cross-model provider catalog has no record index for ${entry.modelId}.`,
    );
  }
  if (entry.id) byId.set(entry.id, entry);
  context.modelCounts[entry.modelId] += 1;
  addOwner(context.bodyOwners, entry.record?.body_path, {
    modelId: entry.modelId,
    id: entry.id,
    sourcePath: entry.sourcePath,
    location: `${entry.sourceLocation}/body_path`,
  });
  context.providerCatalog.by_model_id.get(entry.modelId).collect(context, entry);
}

/**
 * Validates cross-model coherence across the active governed-document corpus.
 *
 * @param {{rootDir: string, sourceSet?: Record<string, unknown>, providers?: ReadonlyArray<Record<string, unknown>>}} input - Repository root and optional synthetic sources/providers.
 * @returns {{model_counts: Record<string, number>, provider_model_ids: string[], child_registries_checked: number, bodies_checked: number, diagnostics: Array<Record<string, unknown>>}} Deterministic validation result.
 */
export function validateGovernedDocumentModelCoherence({
  rootDir,
  sourceSet = loadGovernedDocumentModelSourceSet({ rootDir }),
  providers = governedDocumentCrossModelProviders,
}) {
  const providerCatalog = buildGovernedDocumentCrossModelProviderCatalog(
    sourceSet,
    providers,
  );
  const diagnostics = [];
  const macroRegistry = readYaml(rootDir, macroRegistryPath);
  const macroRequirements = Array.isArray(macroRegistry.macro_requirements)
    ? macroRegistry.macro_requirements
    : [];
  const macroById = new Map();
  const childRegistryOwners = new Map();
  const bodyOwners = new Map();
  const recordsByModelId = new Map(
    providerCatalog.canonical_model_ids.map((modelId) => [modelId, new Map()]),
  );
  const modelCounts = Object.fromEntries(
    providerCatalog.canonical_model_ids.map((modelId) => [modelId, 0]),
  );

  const context = {
    rootDir,
    ruleIds: governedDocumentModelCoherenceRuleIds,
    providerCatalog,
    macroById,
    childRegistryOwners,
    bodyOwners,
    recordsByModelId,
    modelCounts,
    decisionByKey: new Map(),
    addChildRegistryOwner(projectPath, owner) {
      addOwner(childRegistryOwners, projectPath, owner);
    },
    pushDiagnostic(ruleId, representation, sourcePath, location, message) {
      diagnostics.push(
        diagnostic(ruleId, representation, sourcePath, location, message),
      );
    },
  };

  macroRequirements.forEach((record, index) => {
    const id = text(record?.id);
    if (id) macroById.set(id, record);
    addRecord(context, {
      modelId: "macro-requirement",
      id,
      record,
      sourcePath: macroRegistryPath,
      sourceLocation: `$/macro_requirements/${index}`,
      rootMacroRequirementId: id,
      declaredOwnerId: id,
      variant: null,
    });
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

  for (const registryPath of actualDecisionRegistryPaths) {
    const registry = readYaml(rootDir, registryPath);
    const rootMacroRequirementId = text(registry.macro_requirement_id);
    const declaredOwners = childRegistryOwners.get(registryPath) ?? [];
    const declaredOwnerId = declaredOwners.length === 1
      ? declaredOwners[0].macroRequirementId
      : "";
    const decisions = Array.isArray(registry.decisions)
      ? registry.decisions
      : [];

    decisions.forEach((record, index) => {
      addRecord(context, {
        modelId: "decision",
        id: text(record?.id),
        record,
        sourcePath: registryPath,
        sourceLocation: `$/decisions/${index}`,
        rootMacroRequirementId,
        declaredOwnerId,
        variant: null,
      });
    });
  }

  for (const registryPath of actualRequirementRegistryPaths) {
    const registry = readYaml(rootDir, registryPath);
    const rootMacroRequirementId = text(registry.macro_requirement_id);
    const declaredOwners = childRegistryOwners.get(registryPath) ?? [];
    const declaredOwnerId = declaredOwners.length === 1
      ? declaredOwners[0].macroRequirementId
      : "";
    const requirements = Array.isArray(registry.requirements)
      ? registry.requirements
      : [];

    requirements.forEach((record, index) => {
      const requirementType = text(record?.requirement_type);
      const sourceLocation = `$/requirements/${index}`;
      let variant;
      try {
        variant = resolveGovernedRequirementVariant(
          providerCatalog.requirement_dispatch,
          requirementType,
        );
      } catch (error) {
        diagnostics.push(diagnostic(
          governedDocumentModelCoherenceRuleIds.requirementType,
          "logical_model",
          registryPath,
          `${sourceLocation}/requirement_type`,
          error.message,
        ));
        return;
      }

      addRecord(context, {
        modelId: variant.model_id,
        id: text(record?.id),
        record,
        sourcePath: registryPath,
        sourceLocation,
        rootMacroRequirementId,
        declaredOwnerId,
        variant,
      });
    });
  }

  for (const provider of providerCatalog.providers) {
    for (const entry of recordsByModelId.get(provider.model_id).values()) {
      provider.validate(context, entry);
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
    model_counts: modelCounts,
    provider_model_ids: [...providerCatalog.provider_model_ids],
    child_registries_checked: actualRegistryPaths.length,
    bodies_checked: actualBodyPaths.length,
    diagnostics: sortDiagnostics(diagnostics),
  };
}
