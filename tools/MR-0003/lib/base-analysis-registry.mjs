import fs from "node:fs";
import path from "node:path";

import { readGovernedYamlFile } from "../../MR-0001/lib/governed-yaml.mjs";
import {
  baseAnalysisSourceContinuityRuleIds,
  canonicalSourceHistoryOutcomes,
  loadBaseAnalysisDocumentContext,
  validateBaseAnalysisSourceContinuity,
} from "./base-analysis-source-continuity.mjs";

/**
 * @file Canonical Base Analysis Element registry validation and projection core.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0005
 * @implementsRequirement MR-0003ADR-0001REQ-0005GOV-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Validates canonical BAE inventory and taxonomy sources, resolves documentary
 * provenance without mutating repository files, and derives the deterministic
 * reference-source projection consumed by governed reference tooling.
 */

export const baseAnalysisRegistryRuleIds = Object.freeze({
  missingInventory: "bae.registry.missing-inventory",
  missingTaxonomies: "bae.registry.missing-taxonomies",
  inventoryRoot: "bae.registry.inventory-root",
  taxonomyRoot: "bae.registry.taxonomy-root",
  unknownRootMember: "bae.registry.unknown-root-member",
  taxonomyValues: "bae.registry.taxonomy-values",
  elementRecord: "bae.registry.element-record",
  duplicateElementId: "bae.registry.duplicate-element-id",
  invalidElementId: "bae.registry.invalid-element-id",
  unknownBaseType: "bae.registry.unknown-base-type",
  unknownLifecycleState: "bae.registry.unknown-lifecycle-state",
  unknownOriginKind: "bae.registry.unknown-origin-kind",
  missingReviewEvidence: "bae.registry.missing-review-evidence",
  unresolvedOriginSource: "bae.registry.unresolved-origin-source",
  unresolvedProvenanceSource: "bae.registry.unresolved-provenance-source",
  missingOriginProvenance: "bae.registry.missing-origin-provenance",
  multipleOriginProvenance: "bae.registry.multiple-origin-provenance",
  divergentOriginProvenance: "bae.registry.divergent-origin-provenance",
  relationRecord: "bae.registry.relation-record",
  duplicateRelationId: "bae.registry.duplicate-relation-id",
  invalidRelationId: "bae.registry.invalid-relation-id",
  unknownRelationEndpoint: "bae.registry.unknown-relation-endpoint",
  unknownRelationPredicate: "bae.registry.unknown-relation-predicate",
  invalidRelationEndpointType: "bae.registry.invalid-relation-endpoint-type",
  missingSourceEndpoint: "bae.registry.missing-source-endpoint",
  multipleSourceEndpoints: "bae.registry.multiple-source-endpoints",
  missingTargetEndpoint: "bae.registry.missing-target-endpoint",
  multipleTargetEndpoints: "bae.registry.multiple-target-endpoints",
  projectionDivergence: "bae.registry.projection-divergence",
});

export const canonicalBaseAnalysisRegistryPaths = Object.freeze({
  inventory:
    "docs/reference/project-model/registers/base-analysis/base-analysis-elements.registry.yml",
  taxonomies:
    "docs/reference/project-model/registers/base-analysis/base-analysis-taxonomies.registry.yml",
});

const requiredTaxonomyValues = Object.freeze({
  base_types: Object.freeze([
    "actor",
    "component",
    "data_resource",
    "boundary",
    "data_flow",
  ]),
  lifecycle_states: Object.freeze(["active", "superseded", "deprecated"]),
  origin_kinds: Object.freeze([
    "governed_document",
    "reviewed_analytical_addition",
  ]),
  provenance_relations: Object.freeze(["origin", "support"]),
  source_history_outcomes: Object.freeze(
    canonicalSourceHistoryOutcomes,
  ),
  relation_predicates: Object.freeze([
    "has_source_endpoint",
    "has_target_endpoint",
    "crosses_boundary",
  ]),
});

const allowedInventoryRootMembers = new Set([
  "schema_version",
  "registry_id",
  "macro_requirement_id",
  "elements",
  "relations",
]);
const allowedTaxonomyRootMembers = new Set([
  "schema_version",
  "registry_id",
  "macro_requirement_id",
  ...Object.keys(requiredTaxonomyValues),
]);

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function problem(ruleId, message, context = "") {
  return {
    rule_id: ruleId,
    message,
    context,
  };
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredText(record, fieldName) {
  return String(record?.[fieldName] ?? "").trim();
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compare)
      .map((key) => [key, stableJson(value[key])]),
  );
}

function canonicalSourceKey(source) {
  return [
    requiredText(source, "source_kind"),
    requiredText(source, "source_id"),
    requiredText(source, "source_path").replaceAll("\\", "/"),
  ].join("|");
}

function validateRootMembers(record, allowedMembers, context, errors) {
  if (!isRecord(record)) return;
  for (const member of Object.keys(record)) {
    if (!allowedMembers.has(member)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.unknownRootMember,
          `${context} contains unknown top-level member ${member}.`,
          context,
        ),
      );
    }
  }
}

function validateRegistryIdentity(
  record,
  expectedRegistryId,
  context,
  ruleId,
  errors,
) {
  if (!isRecord(record)) {
    errors.push(problem(ruleId, `${context} must be a mapping.`, context));
    return false;
  }
  if (record.schema_version !== 1) {
    errors.push(
      problem(ruleId, `${context} schema_version must equal 1.`, context),
    );
  }
  if (requiredText(record, "registry_id") !== expectedRegistryId) {
    errors.push(
      problem(
        ruleId,
        `${context} registry_id must equal ${expectedRegistryId}.`,
        context,
      ),
    );
  }
  if (requiredText(record, "macro_requirement_id") !== "MR-0003") {
    errors.push(
      problem(
        ruleId,
        `${context} macro_requirement_id must equal MR-0003.`,
        context,
      ),
    );
  }
  return true;
}

function validateTaxonomyList(taxonomies, memberName, errors) {
  const entries = Array.isArray(taxonomies?.[memberName])
    ? taxonomies[memberName]
    : [];
  const expected = requiredTaxonomyValues[memberName];
  const values = [];
  const seen = new Set();

  if (!Array.isArray(taxonomies?.[memberName])) {
    errors.push(
      problem(
        baseAnalysisRegistryRuleIds.taxonomyValues,
        `BAE taxonomy member ${memberName} must be a list.`,
        memberName,
      ),
    );
    return { entries, byValue: new Map() };
  }

  for (const [index, entry] of entries.entries()) {
    const context = `${memberName}[${index}]`;
    if (!isRecord(entry)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.taxonomyValues,
          `${context} must be a mapping.`,
          context,
        ),
      );
      continue;
    }
    const value = requiredText(entry, "value");
    const label = requiredText(entry, "label");
    const meaning = requiredText(entry, "meaning");
    if (!value || !label || !meaning) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.taxonomyValues,
          `${context} must declare value, label and meaning.`,
          context,
        ),
      );
    }
    if (value && seen.has(value)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.taxonomyValues,
          `${memberName} contains duplicate value ${value}.`,
          context,
        ),
      );
    }
    if (value) {
      seen.add(value);
      values.push(value);
    }
  }

  const actual = [...values].sort(compare);
  const canonical = [...expected].sort(compare);
  if (JSON.stringify(actual) !== JSON.stringify(canonical)) {
    errors.push(
      problem(
        baseAnalysisRegistryRuleIds.taxonomyValues,
        `${memberName} values must equal ${canonical.join(", ")}.`,
        memberName,
      ),
    );
  }

  return {
    entries,
    byValue: new Map(
      entries
        .filter(isRecord)
        .map((entry) => [requiredText(entry, "value"), entry])
        .filter(([value]) => value),
    ),
  };
}

function validateRelationPredicateTaxonomy(predicateCatalog, baseTypeCatalog, errors) {
  for (const [value, entry] of predicateCatalog.byValue.entries()) {
    const context = `relation_predicates.${value}`;
    const sourceTypes = Array.isArray(entry.allowed_source_base_types)
      ? entry.allowed_source_base_types.map(String)
      : [];
    const targetTypes = Array.isArray(entry.allowed_target_base_types)
      ? entry.allowed_target_base_types.map(String)
      : [];
    if (sourceTypes.length === 0 || targetTypes.length === 0) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.taxonomyValues,
          `${context} must declare non-empty allowed source and target base types.`,
          context,
        ),
      );
    }
    for (const type of [...sourceTypes, ...targetTypes]) {
      if (!baseTypeCatalog.byValue.has(type)) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.taxonomyValues,
            `${context} references unknown base type ${type}.`,
            context,
          ),
        );
      }
    }
  }
}

export function validateBaseAnalysisRegistrySources(input) {
  const inventory = input?.inventory;
  const taxonomies = input?.taxonomies;
  const sourceResolver =
    typeof input?.sourceResolver === "function"
      ? input.sourceResolver
      : () => true;
  const errors = [];
  const warnings = [];

  if (!inventory) {
    errors.push(
      problem(
        baseAnalysisRegistryRuleIds.missingInventory,
        "Canonical BAE inventory is missing.",
        canonicalBaseAnalysisRegistryPaths.inventory,
      ),
    );
  }
  if (!taxonomies) {
    errors.push(
      problem(
        baseAnalysisRegistryRuleIds.missingTaxonomies,
        "Canonical BAE taxonomy catalog is missing.",
        canonicalBaseAnalysisRegistryPaths.taxonomies,
      ),
    );
  }

  validateRegistryIdentity(
    inventory,
    "base-analysis-elements-registry",
    "BAE inventory registry",
    baseAnalysisRegistryRuleIds.inventoryRoot,
    errors,
  );
  validateRegistryIdentity(
    taxonomies,
    "base-analysis-taxonomies-registry",
    "BAE taxonomy registry",
    baseAnalysisRegistryRuleIds.taxonomyRoot,
    errors,
  );
  validateRootMembers(
    inventory,
    allowedInventoryRootMembers,
    "BAE inventory registry",
    errors,
  );
  validateRootMembers(
    taxonomies,
    allowedTaxonomyRootMembers,
    "BAE taxonomy registry",
    errors,
  );

  const taxonomyCatalogs = {};
  for (const memberName of Object.keys(requiredTaxonomyValues)) {
    taxonomyCatalogs[memberName] = validateTaxonomyList(
      taxonomies,
      memberName,
      errors,
    );
  }
  validateRelationPredicateTaxonomy(
    taxonomyCatalogs.relation_predicates,
    taxonomyCatalogs.base_types,
    errors,
  );

  const elements = Array.isArray(inventory?.elements) ? inventory.elements : [];
  const relations = Array.isArray(inventory?.relations)
    ? inventory.relations
    : [];

  const continuity = validateBaseAnalysisSourceContinuity({
    inventory,
    documents: input?.documents,
    profiles: input?.profiles,
    sourceResolver,
    reviewEvidenceResolver: input?.reviewEvidenceResolver,
    allowedOutcomes: requiredTaxonomyValues.source_history_outcomes,
    candidateOccurrenceProjection:
      input?.candidateOccurrenceProjection,
  });
  errors.push(...continuity.errors);
  warnings.push(...continuity.warnings);

  if (!Array.isArray(inventory?.elements)) {
    errors.push(
      problem(
        baseAnalysisRegistryRuleIds.inventoryRoot,
        "BAE inventory elements must be a list.",
        "elements",
      ),
    );
  }
  if (!Array.isArray(inventory?.relations)) {
    errors.push(
      problem(
        baseAnalysisRegistryRuleIds.inventoryRoot,
        "BAE inventory relations must be a list.",
        "relations",
      ),
    );
  }

  const elementsById = new Map();
  for (const [index, element] of elements.entries()) {
    const context = `elements[${index}]`;
    if (!isRecord(element)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.elementRecord,
          `${context} must be a mapping.`,
          context,
        ),
      );
      continue;
    }
    const id = requiredText(element, "id");
    const title = requiredText(element, "title");
    const baseType = requiredText(element, "base_type");
    const meaning = requiredText(element, "meaning");
    const lifecycleState = requiredText(element, "lifecycle_state");
    const origin = element.origin;
    const provenance = Array.isArray(element.provenance)
      ? element.provenance
      : [];

    if (!id || !title || !baseType || !meaning || !lifecycleState) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.elementRecord,
          `${context} must declare id, title, base_type, meaning and lifecycle_state.`,
          context,
        ),
      );
    }
    if (id && !/^BAE-\d{4}$/u.test(id)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.invalidElementId,
          `${context} id ${id} must match BAE-[0-9]{4}.`,
          context,
        ),
      );
    }
    if (id && elementsById.has(id)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.duplicateElementId,
          `Duplicate BAE identifier ${id}.`,
          context,
        ),
      );
    } else if (id) {
      elementsById.set(id, element);
    }
    if (baseType && !taxonomyCatalogs.base_types.byValue.has(baseType)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.unknownBaseType,
          `${context} uses unknown base_type ${baseType}.`,
          context,
        ),
      );
    }
    if (
      lifecycleState &&
      !taxonomyCatalogs.lifecycle_states.byValue.has(lifecycleState)
    ) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.unknownLifecycleState,
          `${context} uses unknown lifecycle_state ${lifecycleState}.`,
          context,
        ),
      );
    }

    if (!isRecord(origin)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.elementRecord,
          `${context} origin must be a mapping.`,
          context,
        ),
      );
    } else {
      const originKind = requiredText(origin, "kind");
      const source = {
        source_kind: originKind,
        source_id: requiredText(origin, "source_id"),
        source_path: requiredText(origin, "source_path"),
      };
      if (!originKind || !source.source_id || !source.source_path) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.elementRecord,
            `${context} origin must declare kind, source_id and source_path.`,
            context,
          ),
        );
      }
      if (
        originKind &&
        !taxonomyCatalogs.origin_kinds.byValue.has(originKind)
      ) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.unknownOriginKind,
            `${context} uses unknown origin kind ${originKind}.`,
            context,
          ),
        );
      }
      if (
        originKind === "reviewed_analytical_addition" &&
        !requiredText(origin, "review_evidence_id")
      ) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.missingReviewEvidence,
            `${context} reviewed analytical addition must declare review_evidence_id.`,
            context,
          ),
        );
      }
      if (
        source.source_kind &&
        source.source_id &&
        source.source_path &&
        !sourceResolver(source)
      ) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.unresolvedOriginSource,
            `${context} origin source does not resolve.`,
            context,
          ),
        );
      }

      const originProvenance = provenance.filter(
        (entry) => requiredText(entry, "relation") === "origin",
      );
      if (originProvenance.length === 0) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.missingOriginProvenance,
            `${context} must contain exactly one origin provenance entry.`,
            context,
          ),
        );
      } else if (originProvenance.length > 1) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.multipleOriginProvenance,
            `${context} contains multiple origin provenance entries.`,
            context,
          ),
        );
      } else if (
        canonicalSourceKey(originProvenance[0]) !== canonicalSourceKey(source)
      ) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.divergentOriginProvenance,
            `${context} origin provenance differs from declared origin.`,
            context,
          ),
        );
      }
    }

    if (!Array.isArray(element.provenance)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.elementRecord,
          `${context} provenance must be a list.`,
          context,
        ),
      );
    }
    for (const [provenanceIndex, entry] of provenance.entries()) {
      const provenanceContext = `${context}.provenance[${provenanceIndex}]`;
      if (!isRecord(entry)) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.elementRecord,
            `${provenanceContext} must be a mapping.`,
            provenanceContext,
          ),
        );
        continue;
      }
      const relation = requiredText(entry, "relation");
      const source = {
        source_kind: requiredText(entry, "source_kind"),
        source_id: requiredText(entry, "source_id"),
        source_path: requiredText(entry, "source_path"),
      };
      if (
        !relation ||
        !source.source_kind ||
        !source.source_id ||
        !source.source_path
      ) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.elementRecord,
            `${provenanceContext} must declare relation, source_kind, source_id and source_path.`,
            provenanceContext,
          ),
        );
      }
      if (
        relation &&
        !taxonomyCatalogs.provenance_relations.byValue.has(relation)
      ) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.taxonomyValues,
            `${provenanceContext} uses unknown provenance relation ${relation}.`,
            provenanceContext,
          ),
        );
      }
      if (
        source.source_kind &&
        source.source_id &&
        source.source_path &&
        !sourceResolver(source)
      ) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.unresolvedProvenanceSource,
            `${provenanceContext} source does not resolve.`,
            provenanceContext,
          ),
        );
      }
    }
  }

  const relationsById = new Map();
  const relationCounts = new Map();
  for (const [index, relation] of relations.entries()) {
    const context = `relations[${index}]`;
    if (!isRecord(relation)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.relationRecord,
          `${context} must be a mapping.`,
          context,
        ),
      );
      continue;
    }
    const id = requiredText(relation, "id");
    const sourceId = requiredText(relation, "source_bae_id");
    const predicate = requiredText(relation, "predicate");
    const targetId = requiredText(relation, "target_bae_id");
    if (!id || !sourceId || !predicate || !targetId) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.relationRecord,
          `${context} must declare id, source_bae_id, predicate and target_bae_id.`,
          context,
        ),
      );
    }
    if (id && !/^BAE-REL-\d{4}$/u.test(id)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.invalidRelationId,
          `${context} id ${id} must match BAE-REL-[0-9]{4}.`,
          context,
        ),
      );
    }
    if (id && relationsById.has(id)) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.duplicateRelationId,
          `Duplicate BAE relation identifier ${id}.`,
          context,
        ),
      );
    } else if (id) {
      relationsById.set(id, relation);
    }

    const sourceElement = elementsById.get(sourceId);
    const targetElement = elementsById.get(targetId);
    if (!sourceElement || !targetElement) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.unknownRelationEndpoint,
          `${context} references an unknown BAE endpoint.`,
          context,
        ),
      );
    }
    const predicateRecord =
      taxonomyCatalogs.relation_predicates.byValue.get(predicate);
    if (!predicateRecord) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.unknownRelationPredicate,
          `${context} uses unknown predicate ${predicate}.`,
          context,
        ),
      );
    } else if (sourceElement && targetElement) {
      const sourceAllowed = (
        predicateRecord.allowed_source_base_types ?? []
      ).map(String);
      const targetAllowed = (
        predicateRecord.allowed_target_base_types ?? []
      ).map(String);
      if (
        !sourceAllowed.includes(requiredText(sourceElement, "base_type")) ||
        !targetAllowed.includes(requiredText(targetElement, "base_type"))
      ) {
        errors.push(
          problem(
            baseAnalysisRegistryRuleIds.invalidRelationEndpointType,
            `${context} endpoint types violate predicate ${predicate}.`,
            context,
          ),
        );
      }
    }

    if (sourceId && predicate) {
      const key = `${sourceId}|${predicate}`;
      relationCounts.set(key, (relationCounts.get(key) ?? 0) + 1);
    }
  }

  for (const [id, element] of elementsById.entries()) {
    if (requiredText(element, "base_type") !== "data_flow") continue;
    const sourceCount = relationCounts.get(`${id}|has_source_endpoint`) ?? 0;
    const targetCount = relationCounts.get(`${id}|has_target_endpoint`) ?? 0;
    if (sourceCount === 0) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.missingSourceEndpoint,
          `Data Flow ${id} has no source endpoint.`,
          id,
        ),
      );
    } else if (sourceCount > 1) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.multipleSourceEndpoints,
          `Data Flow ${id} has multiple source endpoints.`,
          id,
        ),
      );
    }
    if (targetCount === 0) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.missingTargetEndpoint,
          `Data Flow ${id} has no target endpoint.`,
          id,
        ),
      );
    } else if (targetCount > 1) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.multipleTargetEndpoints,
          `Data Flow ${id} has multiple target endpoints.`,
          id,
        ),
      );
    }
  }

  const projection = [...elementsById.entries()]
    .sort(([left], [right]) => compare(left, right))
    .map(([id, element]) => ({
      id,
      title: requiredText(element, "title"),
      entity_type: "base_analysis_element",
      base_type: requiredText(element, "base_type"),
      meaning: requiredText(element, "meaning"),
      lifecycle_state: requiredText(element, "lifecycle_state"),
      origin: structuredClone(element.origin),
      authoritative_source: structuredClone(
        element.authoritative_source,
      ),
      source_history: structuredClone(element.source_history),
      provenance: structuredClone(element.provenance),
      registry_path: canonicalBaseAnalysisRegistryPaths.inventory,
    }));

  if (input?.candidateProjection !== undefined) {
    if (
      JSON.stringify(stableJson(input.candidateProjection)) !==
      JSON.stringify(stableJson(projection))
    ) {
      errors.push(
        problem(
          baseAnalysisRegistryRuleIds.projectionDivergence,
          "Candidate BAE reference-source projection differs from canonical sources.",
          "reference-source-projection",
        ),
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.sort((left, right) =>
      compare(
        `${left.rule_id}|${left.context}|${left.message}`,
        `${right.rule_id}|${right.context}|${right.message}`,
      ),
    ),
    warnings,
    element_count: elements.length,
    relation_count: relations.length,
    source_history_count: continuity.source_history_count,
    origin_evidence_count: continuity.origin_evidence_count,
    occurrence_count: continuity.occurrences.length,
    occurrence_projection: continuity.occurrences,
    projection,
  };
}

function safeProjectPath(rootDir, projectPath) {
  const normalized = String(projectPath ?? "").replaceAll("\\", "/");
  const absolute = path.resolve(rootDir, ...normalized.split("/"));
  const relative = path.relative(path.resolve(rootDir), absolute);
  if (
    !normalized ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Unsafe project path: ${projectPath}`);
  }
  return { normalized, absolute };
}

function defaultSourceResolver(rootDir) {
  return (source) => {
    try {
      const resolved = safeProjectPath(rootDir, source.source_path);
      if (!fs.existsSync(resolved.absolute) || !fs.statSync(resolved.absolute).isFile()) {
        return false;
      }
      return fs
        .readFileSync(resolved.absolute, "utf8")
        .includes(String(source.source_id));
    } catch {
      return false;
    }
  };
}

export function loadAndValidateBaseAnalysisRegistry(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const inventoryPath =
    options.inventoryPath ?? canonicalBaseAnalysisRegistryPaths.inventory;
  const taxonomyPath =
    options.taxonomyPath ?? canonicalBaseAnalysisRegistryPaths.taxonomies;

  let inventory = null;
  let taxonomies = null;
  const loadingErrors = [];

  try {
    inventory = readGovernedYamlFile(
      safeProjectPath(rootDir, inventoryPath).absolute,
    );
  } catch (error) {
    loadingErrors.push(
      problem(
        baseAnalysisRegistryRuleIds.missingInventory,
        error.message,
        inventoryPath,
      ),
    );
  }
  try {
    taxonomies = readGovernedYamlFile(
      safeProjectPath(rootDir, taxonomyPath).absolute,
    );
  } catch (error) {
    loadingErrors.push(
      problem(
        baseAnalysisRegistryRuleIds.missingTaxonomies,
        error.message,
        taxonomyPath,
      ),
    );
  }

  let documentContext = options.documentContext ?? null;
  if (!documentContext) {
    try {
      documentContext = loadBaseAnalysisDocumentContext({ rootDir });
    } catch (error) {
      loadingErrors.push(
        problem(
          baseAnalysisSourceContinuityRuleIds.documentContext,
          error.message,
          "governed-document-context",
        ),
      );
    }
  }

  const result = validateBaseAnalysisRegistrySources({
    inventory,
    taxonomies,
    sourceResolver:
      options.sourceResolver ?? defaultSourceResolver(rootDir),
    documents: documentContext?.documents,
    profiles: documentContext?.profiles,
    reviewEvidenceResolver:
      options.reviewEvidenceResolver ??
      documentContext?.reviewEvidenceResolver,
    candidateProjection: options.candidateProjection,
    candidateOccurrenceProjection:
      options.candidateOccurrenceProjection,
  });
  result.errors = [...loadingErrors, ...result.errors].sort((left, right) =>
    compare(
      `${left.rule_id}|${left.context}|${left.message}`,
      `${right.rule_id}|${right.context}|${right.message}`,
    ),
  );
  result.valid = result.errors.length === 0;
  return result;
}
