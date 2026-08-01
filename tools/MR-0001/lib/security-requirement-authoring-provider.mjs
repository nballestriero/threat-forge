import path from "node:path";

import {
  createGovernedEntityReferenceService,
  loadGovernedEntityResolverRegistry,
} from "./governed-entity-references.mjs";
import {
  createFunctionalRequirementReferenceProviders,
} from "./governed-document-reference-providers.mjs";
import {
  inactiveSecurityRequirementBodyProfileProjectPath,
  inactiveSecurityRequirementModelProjectPath,
  loadSecurityRequirementValidationSourceSet,
} from "./security-requirement-model-validation.mjs";
import {
  governedDocumentAuthoringProviders,
  planGeneratedDocument,
  validateGovernedDocumentAuthoringProviderCoverage,
} from "../../MR-0002/create-governed-document.mjs";
import {
  loadAndValidateBaseAnalysisRegistry,
} from "../../MR-0003/lib/base-analysis-registry.mjs";
import {
  evaluateBaseAnalysisReferenceEligibility,
} from "../../MR-0003/lib/base-analysis-reference-eligibility.mjs";
import {
  loadValidatedCommonAnalysisFindingRelationProjection,
} from "../../MR-0005/check-common-analysis-findings.mjs";
import {
  createCommonAnalysisFindingReferenceProviders,
} from "../../MR-0005/lib/common-analysis-finding-reference-eligibility.mjs";

/**
 * @file Security Requirement governed authoring activation-candidate provider.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0004REQ-0004GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0002/ADR-0004
 * @macroRequirement MR-0001
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 *
 * Resolves the canonical or retained activation-candidate Security Requirement
 * authoring catalog, one Functional parent and one or more accepted Common
 * Findings, then delegates deterministic registry and Markdown generation to
 * the shared governed-document transaction core. Creation remains fail-closed
 * unless the canonical model is active.
 */

export const securityRequirementAuthoringRuleIds = Object.freeze({
  requestShape: "security-requirement.authoring.request.shape",
  activation: "security-requirement.authoring.activation",
  parent: "security-requirement.authoring.parent",
  findingResolution: "security-requirement.authoring.finding.resolution",
  findingAffectedParent:
    "security-requirement.authoring.finding.affected-parent",
  findingProvenance: "security-requirement.authoring.finding.provenance",
  catalog: "security-requirement.authoring.catalog",
});

const securityModelId = "security-requirement";
const functionalModelId = "functional-requirement";
const commonFindingEntityType = "common_analysis_finding";
const functionalEntityType = "functional_requirement";

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function text(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw failure(
    securityRequirementAuthoringRuleIds.requestShape,
    `${label} must be a non-empty string.`,
  );
  return normalized;
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw failure(
      securityRequirementAuthoringRuleIds.requestShape,
      `${label} must be an object.`,
    );
  }
  return value;
}

function array(value, label) {
  if (!Array.isArray(value)) {
    throw failure(
      securityRequirementAuthoringRuleIds.requestShape,
      `${label} must be an array.`,
    );
  }
  return value;
}

function failure(ruleId, message) {
  const error = new Error(`[${ruleId}] ${message}`);
  error.rule_id = ruleId;
  return error;
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort(compare);
  const canonical = [...expected].sort(compare);
  if (JSON.stringify(actual) !== JSON.stringify(canonical)) {
    throw failure(
      securityRequirementAuthoringRuleIds.requestShape,
      `${label} fields must be exactly: ${canonical.join(", ")}. Found: ${actual.join(", ")}.`,
    );
  }
}

function sectionInputName(sectionId) {
  return String(sectionId)
    .replace(/^.*\.section\./u, "")
    .replaceAll("-", "_");
}

function projectStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const entries = Object.entries(entry);
      if (entries.length === 1 && String(entries[0][1] ?? "") === "") {
        return `${String(entries[0][0]).replace(/^"/u, "")}:`;
      }
    }
    throw failure(
      securityRequirementAuthoringRuleIds.catalog,
      `Security authoring profile list entry ${index} is not a canonical string.`,
    );
  });
}

function controlledValuesByValueSet(catalog) {
  const result = new Map();
  for (const documentType of catalog.document_types ?? []) {
    for (const field of documentType.record_fields ?? []) {
      const valueSetId = String(field.value_set_id ?? "").trim();
      if (!valueSetId || result.has(valueSetId)) continue;
      result.set(valueSetId, {
        description: String(field.description ?? ""),
        controlled_values: structuredClone(field.controlled_values ?? []),
      });
    }
  }
  return result;
}

function projectSecurityField(field, valueSets) {
  const valueSetId = String(field.value_set_id ?? "").trim();
  const metadata = valueSetId
    ? valueSets.get(valueSetId) ?? {
      description: `${field.name} controlled values`,
      controlled_values: [],
    }
    : {
      description:
        `${field.name} is a ${field.value_kind} field whose canonical source kind is ${field.source_kind}.`,
      controlled_values: [],
    };
  const controlledValues = structuredClone(metadata.controlled_values);
  const requiredValue = String(field.required_value ?? "").trim();
  if (
    requiredValue &&
    !controlledValues.some((entry) => String(entry.value) === requiredValue)
  ) {
    controlledValues.push({
      value: requiredValue,
      label: requiredValue === "security" ? "Security" : requiredValue,
      meaning:
        "Activation-candidate value declared by the inactive Security Requirement model variant.",
    });
  }
  return {
    id: field.id,
    name: field.name,
    order: field.order,
    cardinality: field.cardinality,
    source_kind: field.source_kind,
    value_kind: field.value_kind,
    authored: [
      "authored",
      "authored_or_configured",
      "authored_relation",
      "controlled",
    ].includes(field.source_kind),
    generated: [
      "generated",
      "derived",
      "path_derived",
      "workspace_derived",
      "format_managed",
    ].includes(field.source_kind),
    mutable: field.mutable !== false,
    pattern: field.pattern ?? null,
    required_value: field.required_value ?? null,
    template: field.template ?? null,
    parent_model_id: field.parent_model_id ?? null,
    value_set_id: valueSetId || undefined,
    description: metadata.description,
    controlled_values: controlledValues,
  };
}

function projectSecuritySection(section) {
  const cardinality = String(section.cardinality ?? "");
  return {
    id: section.id,
    input_name: sectionInputName(section.id),
    heading: section.heading,
    order: section.order,
    cardinality,
    required: cardinality === "exactly_one",
    content_kind: section.content_kind,
    description:
      `${section.heading} uses canonical content kind ${section.content_kind}.`,
    minimum_items:
      section.minimum_items ?? section.minimum_items_when_present ?? null,
    minimum_paragraphs: section.minimum_paragraphs ?? null,
    allowed_prefixes: projectStringList(section.allowed_prefixes),
    required_item_prefix: section.required_item_prefix ?? null,
    terminal_punctuation: section.terminal_punctuation ?? null,
    normative_keywords: projectStringList(section.normative_keywords),
    forbidden_normative_keywords:
      projectStringList(section.forbidden_normative_keywords),
  };
}

/**
 * Builds an explicit Security Requirement authoring catalog projection without
 * mutating the active catalog or canonical model index.
 *
 * @param {{
 *   rootDir: string,
 *   activeCatalog: Record<string, unknown>,
 *   loadedSourceSet?: Record<string, unknown>
 * }} input Authoring projection context.
 * @returns {{catalog: Record<string, unknown>, activation_state: string, scaffold_sources_checked: string[]}}
 *   Detached authoring catalog and activation metadata.
 */
export function buildSecurityRequirementAuthoringCatalog(input) {
  const rootDir = path.resolve(text(input?.rootDir, "rootDir"));
  const activeCatalog = structuredClone(
    record(input?.activeCatalog, "activeCatalog"),
  );
  const loaded = input?.loadedSourceSet ??
    loadSecurityRequirementValidationSourceSet({ rootDir });
  const sourceSet = record(loaded.sourceSet, "Security validation sourceSet");
  const activationState = text(
    loaded.activation_state,
    "Security activation_state",
  );
  const existing = (activeCatalog.document_types ?? []).filter(
    (entry) => entry.id === securityModelId,
  );

  if (activationState === "active") {
    if (existing.length !== 1) {
      throw failure(
        securityRequirementAuthoringRuleIds.catalog,
        "Active Security Requirement authoring requires exactly one active catalog document type.",
      );
    }
    return {
      catalog: activeCatalog,
      activation_state: activationState,
      scaffold_sources_checked: [],
    };
  }

  if (activationState !== "inactive" || existing.length !== 0) {
    throw failure(
      securityRequirementAuthoringRuleIds.catalog,
      "Inactive Security Requirement authoring requires an active catalog without Security Requirement.",
    );
  }

  const model = sourceSet.models?.find(
    (entry) => entry.value?.model_id === securityModelId,
  )?.value;
  const bodyProfile = sourceSet.profiles?.find(
    (entry) => entry.value?.profile_id === "security-requirement-body",
  )?.value;
  const requirementProfile = sourceSet.profiles?.find(
    (entry) => entry.value?.profile_id === "requirement-registry",
  )?.value;
  const variant = requirementProfile?.record_variants?.find(
    (entry) => entry.model_id === securityModelId,
  );
  if (!model || !bodyProfile || !variant) {
    throw failure(
      securityRequirementAuthoringRuleIds.catalog,
      "Inactive Security Requirement model, body profile or registry variant is unavailable.",
    );
  }

  const valueSets = controlledValuesByValueSet(activeCatalog);
  activeCatalog.document_types.push({
    id: securityModelId,
    title: String(model.title),
    description: String(model.description),
    registry_profile_id: "requirement-registry",
    body_profile_id: "security-requirement-body",
    registry_source_path:
      "docs/reference/project-model/registers/requirements/MR-*.requirements.registry.yml",
    body_source_path: bodyProfile.source_path_pattern,
    record_fields: variant.fields
      .map((field) => projectSecurityField(field, valueSets))
      .sort((left, right) => left.order - right.order),
    body_sections: bodyProfile.sections
      .map(projectSecuritySection)
      .sort((left, right) => left.order - right.order),
    header_template: bodyProfile.header.template,
    activation_candidate: true,
  });
  activeCatalog.document_types.sort((left, right) => compare(left.id, right.id));
  activeCatalog.activation_candidate = {
    model_id: securityModelId,
    activation_state: activationState,
    model_path: inactiveSecurityRequirementModelProjectPath,
    body_profile_path: inactiveSecurityRequirementBodyProfileProjectPath,
  };

  return {
    catalog: activeCatalog,
    activation_state: activationState,
    scaffold_sources_checked: [
      inactiveSecurityRequirementModelProjectPath,
      inactiveSecurityRequirementBodyProfileProjectPath,
    ],
  };
}

/**
 * Creates the full governed reference service required by Security authoring.
 *
 * @param {{rootDir: string, findingProjectionLoader?: Function}} input Context.
 * @returns {Record<string, unknown>} Governed reference service.
 */
export function createSecurityRequirementAuthoringReferenceService(input) {
  const rootDir = path.resolve(text(input?.rootDir, "rootDir"));
  const resolverRootDir = path.resolve(
    String(input?.resolverRootDir ?? rootDir),
  );
  const bae = loadAndValidateBaseAnalysisRegistry({ rootDir });
  if (!bae.valid) {
    throw failure(
      securityRequirementAuthoringRuleIds.catalog,
      `Canonical Base Analysis registry is invalid: ${bae.errors
        .map((entry) => `${entry.rule_id}: ${entry.message}`)
        .join(" | ")}`,
    );
  }
  const commonFindingProviders =
    createCommonAnalysisFindingReferenceProviders({
      rootDir,
      loadProjection:
        input?.findingProjectionLoader ??
        loadValidatedCommonAnalysisFindingRelationProjection,
    });
  const functionalProviders =
    createFunctionalRequirementReferenceProviders({ rootDir });
  return createGovernedEntityReferenceService({
    registry: loadGovernedEntityResolverRegistry({ rootDir: resolverRootDir }),
    sourceProjectionProviders: new Map([
      ["base-analysis-registry-reference-source", () => bae.projection],
      ...commonFindingProviders.sourceProjectionProviders,
      ...functionalProviders.sourceProjectionProviders,
    ]),
    eligibilityProviders: new Map([
      [
        "base-analysis-documentary-precedence",
        ({ currentDocument, entity }) =>
          evaluateBaseAnalysisReferenceEligibility({
            currentDocument,
            entity,
            documentsByPath: new Map(),
          }),
      ],
      ...commonFindingProviders.eligibilityProviders,
      ...functionalProviders.eligibilityProviders,
    ]),
  });
}

function macroDecisionContext(catalog, macroId, decisionId) {
  const macro = array(catalog.macro_requirements, "catalog.macro_requirements")
    .find((entry) => entry.id === macroId);
  if (!macro) {
    throw failure(
      securityRequirementAuthoringRuleIds.parent,
      `Unknown Macro-requirement ${macroId}.`,
    );
  }
  const decision = array(macro.decisions, `${macroId}.decisions`)
    .find((entry) => entry.id === decisionId);
  if (!decision) {
    throw failure(
      securityRequirementAuthoringRuleIds.parent,
      `Decision ${decisionId} does not belong to ${macroId}.`,
    );
  }
  return { macro, decision };
}

function canonicalParent(catalog, referenceService, input) {
  const macroId = text(input.macro_requirement_id, "macro_requirement_id");
  const decisionId = text(input.decision_id, "decision_id");
  const parentId = text(input.parent_requirement_id, "parent_requirement_id");
  const { decision } = macroDecisionContext(catalog, macroId, decisionId);
  const parent = array(decision.requirements, `${macroId}/${decisionId}.requirements`)
    .find(
      (entry) =>
        entry.id === parentId && entry.model_id === functionalModelId,
    );
  if (!parent) {
    throw failure(
      securityRequirementAuthoringRuleIds.parent,
      `Functional Requirement parent ${parentId} does not belong to ${macroId}/${decisionId}.`,
    );
  }
  const payload = `[${parent.id}] ${parent.title}`;
  const result = referenceService.analyzePayload({
    payload,
    allowedEntityTypes: [functionalEntityType],
    currentDocument: {
      model_id: securityModelId,
      macro_requirement_id: macroId,
      decision_id: decisionId,
      parent_requirement_id: parentId,
    },
    positionId:
      "security-requirement.body.reference.parent-functional-requirement",
  });
  if (!result.valid || result.entity?.id !== parentId) {
    throw failure(
      securityRequirementAuthoringRuleIds.parent,
      `Functional Requirement parent ${parentId} is not an eligible canonical parent.`,
    );
  }
  return structuredClone(parent);
}

function canonicalFindingCandidates(referenceService, currentDocument) {
  return referenceService.listEligibleCandidates({
    allowedEntityTypes: [commonFindingEntityType],
    currentDocument,
    positionId: "security-requirement.body.reference.finding-derivation",
  });
}

function selectedFindings(referenceService, findingIds, currentDocument) {
  const identifiers = array(findingIds, "finding_ids")
    .map((value, index) => text(value, `finding_ids[${index}]`));
  if (identifiers.length === 0) {
    throw failure(
      securityRequirementAuthoringRuleIds.findingResolution,
      "finding_ids must contain one or more Common Finding identifiers.",
    );
  }
  if (
    identifiers.some((id) => !/^FINDING-\d{4}$/u.test(id)) ||
    new Set(identifiers).size !== identifiers.length
  ) {
    throw failure(
      securityRequirementAuthoringRuleIds.findingResolution,
      "finding_ids must contain unique canonical FINDING-#### identifiers.",
    );
  }

  const candidates = canonicalFindingCandidates(referenceService, currentDocument);
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return [...identifiers].sort(compare).map((id) => {
    const candidate = byId.get(id);
    if (!candidate) {
      throw failure(
        securityRequirementAuthoringRuleIds.findingResolution,
        `Common Finding ${id} does not resolve uniquely as an accepted authoring candidate.`,
      );
    }
    const entity = candidate.entity ?? {};
    const affected = Array.isArray(entity.affected_subjects)
      ? entity.affected_subjects
      : [];
    if (
      !affected.some(
        (subject) =>
          subject?.kind === "functional_requirement" &&
          subject?.id === currentDocument.parent_requirement_id,
      )
    ) {
      throw failure(
        securityRequirementAuthoringRuleIds.findingAffectedParent,
        `Common Finding ${id} does not affect parent Functional Requirement ${currentDocument.parent_requirement_id}.`,
      );
    }
    if (
      !/^ANALYSIS-\d{4}$/u.test(String(entity.analysis_record_id ?? "")) ||
      !String(entity.source_path ?? "").trim()
    ) {
      throw failure(
        securityRequirementAuthoringRuleIds.findingProvenance,
        `Common Finding ${id} lacks navigable Analysis Record provenance.`,
      );
    }
    return structuredClone(candidate);
  });
}

/**
 * Converts one Security-specific authoring request into the shared governed
 * document request shape with canonical parent and Finding payloads.
 *
 * @param {Record<string, unknown>} request Security authoring request.
 * @param {{catalog: Record<string, unknown>, referenceService: Record<string, unknown>}} context Context.
 * @returns {Record<string, unknown>} Canonical generic authoring request.
 */
export function normalizeSecurityRequirementAuthoringRequest(request, context) {
  const input = record(request, "Security Requirement authoring request");
  assertExactKeys(
    input,
    [
      "document_type",
      "title",
      "macro_requirement_id",
      "decision_id",
      "parent_requirement_id",
      "finding_ids",
      "body",
    ],
    "Security Requirement authoring request",
  );
  if (text(input.document_type, "document_type") !== securityModelId) {
    throw failure(
      securityRequirementAuthoringRuleIds.requestShape,
      `document_type must be ${securityModelId}.`,
    );
  }
  const body = record(input.body, "body");
  assertExactKeys(
    body,
    ["intent", "security_obligation", "scope", "acceptance"],
    "Security Requirement authored body",
  );
  const catalog = record(context?.catalog, "catalog");
  const referenceService = record(
    context?.referenceService,
    "referenceService",
  );
  const parent = canonicalParent(catalog, referenceService, input);
  const currentDocument = {
    model_id: securityModelId,
    macro_requirement_id: String(input.macro_requirement_id),
    decision_id: String(input.decision_id),
    parent_requirement_id: String(input.parent_requirement_id),
  };
  const findings = selectedFindings(
    referenceService,
    input.finding_ids,
    currentDocument,
  );

  return {
    document_type: securityModelId,
    title: text(input.title, "title"),
    macro_requirement_id: currentDocument.macro_requirement_id,
    decision_id: currentDocument.decision_id,
    parent_requirement_id: currentDocument.parent_requirement_id,
    body: {
      intent: body.intent,
      parent_functional_requirement: {
        parent: [`[${parent.id}] ${parent.title}`],
      },
      finding_derivation: {
        finding: findings.map(
          (candidate) => `[${candidate.id}] ${candidate.title}`,
        ),
      },
      security_obligation: body.security_obligation,
      scope: body.scope,
      acceptance: body.acceptance,
    },
  };
}

function payloadList(body, sectionName, key) {
  const section = record(body?.[sectionName], sectionName);
  return array(section[key], `${sectionName}.${key}`)
    .map((value, index) => text(value, `${sectionName}.${key}[${index}]`));
}

function nextSecurityId(requirements, parentId) {
  const expression = new RegExp(`^${parentId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}SEC-(\\d{4})$`, "u");
  let maximum = 0;
  for (const requirement of requirements) {
    const match = String(requirement.id ?? "").match(expression);
    if (match) maximum = Math.max(maximum, Number.parseInt(match[1], 10));
  }
  return `${parentId}SEC-${String(maximum + 1).padStart(4, "0")}`;
}

/**
 * Creates the explicit Security Requirement authoring provider consumed through
 * the shared governed-document transaction core.
 *
 * @param {{referenceService: Record<string, unknown>}} input Context.
 * @returns {Readonly<Record<string, unknown>>} Authoring provider.
 */
export function createSecurityRequirementAuthoringProvider(input) {
  const referenceService = record(input?.referenceService, "referenceService");
  return Object.freeze({
    model_id: securityModelId,
    required_request_fields: Object.freeze([
      "macro_requirement_id",
      "decision_id",
      "parent_requirement_id",
    ]),
    validate_request({ input: request, catalog }) {
      const parent = canonicalParent(catalog, referenceService, request);
      const currentDocument = {
        model_id: securityModelId,
        macro_requirement_id: String(request.macro_requirement_id),
        decision_id: String(request.decision_id),
        parent_requirement_id: String(request.parent_requirement_id),
      };
      const parentPayloads = payloadList(
        request.body,
        "parent_functional_requirement",
        "parent",
      );
      if (
        parentPayloads.length !== 1 ||
        parentPayloads[0] !== `[${parent.id}] ${parent.title}`
      ) {
        throw failure(
          securityRequirementAuthoringRuleIds.parent,
          "Generated parent body payload must mirror the canonical Functional Requirement.",
        );
      }
      const findingPayloads = payloadList(
        request.body,
        "finding_derivation",
        "finding",
      );
      if (findingPayloads.length === 0) {
        throw failure(
          securityRequirementAuthoringRuleIds.findingResolution,
          "Generated Finding derivation must contain one or more references.",
        );
      }
      for (const payload of findingPayloads) {
        const result = referenceService.analyzePayload({
          payload,
          allowedEntityTypes: [commonFindingEntityType],
          currentDocument,
          positionId: "security-requirement.body.reference.finding-derivation",
        });
        if (!result.valid) {
          throw failure(
            securityRequirementAuthoringRuleIds.findingResolution,
            `Generated Common Finding payload does not resolve: ${payload}.`,
          );
        }
        const affected = result.entity?.affected_subjects ?? [];
        if (
          !affected.some(
            (subject) =>
              subject?.kind === "functional_requirement" &&
              subject?.id === currentDocument.parent_requirement_id,
          )
        ) {
          throw failure(
            securityRequirementAuthoringRuleIds.findingAffectedParent,
            `Common Finding ${result.entity?.id} does not affect ${currentDocument.parent_requirement_id}.`,
          );
        }
        if (
          !/^ANALYSIS-\d{4}$/u.test(
            String(result.entity?.analysis_record_id ?? ""),
          ) ||
          !String(result.entity?.source_path ?? "").trim()
        ) {
          throw failure(
            securityRequirementAuthoringRuleIds.findingProvenance,
            `Common Finding ${result.entity?.id} lacks navigable provenance.`,
          );
        }
      }
      return {
        macro_requirement_id: currentDocument.macro_requirement_id,
        decision_id: currentDocument.decision_id,
        parent_requirement_id: currentDocument.parent_requirement_id,
      };
    },
    plan({ input: request, catalog, documentType, recordValues }) {
      const macroId = String(request.macro_requirement_id);
      const decisionId = String(request.decision_id);
      const parentId = String(request.parent_requirement_id);
      const { macro } = macroDecisionContext(catalog, macroId, decisionId);
      const requirements = array(macro.requirements, `${macroId}.requirements`);
      const id = nextSecurityId(requirements, parentId);
      const requirementTypeField = array(
        documentType.record_fields,
        `${securityModelId}.record_fields`,
      ).find((field) => field.name === "requirement_type");
      if (String(requirementTypeField?.required_value ?? "") !== "security") {
        throw failure(
          securityRequirementAuthoringRuleIds.catalog,
          "Security Requirement authoring catalog must require requirement_type security.",
        );
      }
      Object.assign(recordValues, {
        id,
        requirement_type: "security",
        macro_requirement_id: macroId,
        decision_id: decisionId,
        parent_requirement_id: parentId,
        body_path:
          `docs/reference/project-model/body/requirements/${macroId}/${id}_body.md`,
      });
      return {
        id,
        registryPath: String(macro.requirements_registry_path),
        collectionName: "requirements",
        extraChanges: [],
      };
    },
  });
}

/**
 * Plans one Security Requirement through an explicit candidate catalog and
 * provider set.
 *
 * @param {Record<string, unknown>} request Security-specific request.
 * @param {{rootDir: string, activeCatalog: Record<string, unknown>, referenceService?: Record<string, unknown>, today?: string, loadedSourceSet?: Record<string, unknown>}} options Context.
 * @returns {Record<string, unknown>} Deterministic activation-aware plan.
 */
export function planSecurityRequirementAuthoring(request, options) {
  const rootDir = path.resolve(text(options?.rootDir, "rootDir"));
  const projected = buildSecurityRequirementAuthoringCatalog({
    rootDir,
    activeCatalog: options.activeCatalog,
    loadedSourceSet: options.loadedSourceSet,
  });
  const referenceService = options.referenceService ??
    createSecurityRequirementAuthoringReferenceService({ rootDir });
  const canonicalRequest = normalizeSecurityRequirementAuthoringRequest(
    request,
    {
      catalog: projected.catalog,
      referenceService,
    },
  );
  const providers = resolveGovernedDocumentAuthoringProviders({
    rootDir,
    catalog: projected.catalog,
    referenceService,
  });
  const coverage = validateGovernedDocumentAuthoringProviderCoverage(
    projected.catalog,
    providers,
  );
  if (coverage.length > 0) {
    throw failure(
      securityRequirementAuthoringRuleIds.catalog,
      coverage.map((entry) => `${entry.rule_id}: ${entry.message}`).join(" | "),
    );
  }
  const documentPlan = planGeneratedDocument(
    canonicalRequest,
    projected.catalog,
    {
      rootDir,
      today: options.today,
      providers,
    },
  );
  return {
    activation_state: projected.activation_state,
    scaffold_sources_checked: projected.scaffold_sources_checked,
    request: canonicalRequest,
    selected_finding_ids: canonicalRequest.body.finding_derivation.finding
      .map((payload) => payload.match(/^\[([^\]]+)\]/u)?.[1] ?? "")
      .filter(Boolean),
    documentPlan,
  };
}

/**
 * Enforces the atomic activation boundary before any create transaction.
 *
 * @param {Record<string, unknown>} plan Security authoring plan.
 * @returns {true} Creation permission for an active model.
 */
export function assertSecurityRequirementCreationAllowed(plan) {
  const activationState = String(plan?.activation_state ?? "").trim();
  if (activationState !== "active") {
    throw failure(
      securityRequirementAuthoringRuleIds.activation,
      "Security Requirement create is unavailable until the canonical model is atomically activated.",
    );
  }
  return true;
}

/** Resolves the exact runtime authoring provider catalog for an active catalog. */
export function resolveGovernedDocumentAuthoringProviders({
  rootDir,
  catalog,
  referenceService,
}) {
  const documentTypes = array(catalog?.document_types, "catalog.document_types");
  if (!documentTypes.some((entry) => entry.id === securityModelId)) {
    return [...governedDocumentAuthoringProviders];
  }
  const service = referenceService ??
    createSecurityRequirementAuthoringReferenceService({ rootDir });
  return [
    ...governedDocumentAuthoringProviders.filter(
      (provider) => provider.model_id !== securityModelId,
    ),
    createSecurityRequirementAuthoringProvider({ referenceService: service }),
  ];
}
