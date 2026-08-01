import {
  assertGovernedDocumentModelConsumerCoverage,
  buildGovernedRequirementVariantDispatch,
  canonicalGovernedDocumentModelIds,
  matchesGovernedRequirementVariantIdentity,
} from "./governed-document-model-sources.mjs";
import {
  createSecurityRequirementCrossModelProvider,
} from "./security-requirement-cross-model-provider.mjs";
import {
  createSecurityRequirementAuthoringReferenceService,
} from "./security-requirement-authoring-provider.mjs";

/**
 * @file Explicit provider catalog for governed-document cross-model relations.
 *
 * @implementsRequirement MR-0001ADR-0007REQ-0002
 * @implementsRequirement MR-0001ADR-0007REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0007
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Keeps model-specific relation behavior explicit while deriving the active
 * model inventory and Requirement dispatch from canonical sources. Provider
 * coverage is side-effect free and fails closed for missing, duplicate or
 * unregistered model identifiers.
 */

export const governedDocumentCrossModelConsumerId =
  "governed-document-cross-model-coherence";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function recordFor(context, modelId, identifier) {
  return context.recordsByModelId.get(modelId)?.get(identifier)?.record ?? null;
}

function identityMatchesPrefix(entry) {
  const id = text(entry.record?.id);
  const macroRequirementId = text(entry.record?.macro_requirement_id);
  const decisionId = text(entry.record?.decision_id);
  return (
    matchesGovernedRequirementVariantIdentity(entry.variant, id) &&
    id.startsWith(`${macroRequirementId}${decisionId}`)
  );
}

const macroRequirementProvider = Object.freeze({
  model_id: "macro-requirement",
  collect(context, entry) {
    for (const [field, kind] of [
      ["decisions_registry_path", "decision"],
      ["requirements_registry_path", "requirement"],
    ]) {
      context.addChildRegistryOwner(entry.record?.[field], {
        macroRequirementId: entry.id,
        kind,
        sourcePath: entry.sourcePath,
        location: `${entry.sourceLocation}/${field}`,
      });
    }
  },
  validate() {},
});

const decisionProvider = Object.freeze({
  model_id: "decision",
  collect(context, entry) {
    const macroRequirementId = text(entry.record?.macro_requirement_id);
    const key = `${macroRequirementId}/${entry.id}`;
    if (key !== "/") context.decisionByKey.set(key, entry.record);
  },
  validate(context, entry) {
    const macroRequirementId = text(entry.record?.macro_requirement_id);
    if (
      !context.macroById.has(macroRequirementId) ||
      macroRequirementId !== entry.rootMacroRequirementId ||
      macroRequirementId !== entry.declaredOwnerId
    ) {
      context.pushDiagnostic(
        context.ruleIds.decisionOwner,
        "logical_model",
        entry.sourcePath,
        entry.sourceLocation,
        `Decision ${entry.id || "<unknown>"} must resolve through exactly one owning Macro-requirement and its declared Decision registry.`,
      );
    }
  },
});

const functionalRequirementProvider = Object.freeze({
  model_id: "functional-requirement",
  collect() {},
  validate(context, entry) {
    const macroRequirementId = text(entry.record?.macro_requirement_id);
    const decisionId = text(entry.record?.decision_id);
    const decision = context.decisionByKey.get(
      `${macroRequirementId}/${decisionId}`,
    );
    if (
      !identityMatchesPrefix(entry) ||
      !decision ||
      macroRequirementId !== entry.rootMacroRequirementId ||
      macroRequirementId !== entry.declaredOwnerId
    ) {
      context.pushDiagnostic(
        context.ruleIds.functionalDecision,
        "logical_model",
        entry.sourcePath,
        entry.sourceLocation,
        `Functional Requirement ${entry.id || "<unknown>"} must resolve to the Decision encoded by its identity inside the same Macro-requirement registry topology.`,
      );
    }
  },
});

const governanceRequirementProvider = Object.freeze({
  model_id: "governance-requirement",
  collect() {},
  validate(context, entry) {
    const record = entry.record;
    const macroRequirementId = text(record?.macro_requirement_id);
    const decisionId = text(record?.decision_id);
    const parentMetadata = entry.variant?.parent_requirement;
    const parentId = text(record?.[parentMetadata?.field_name]);
    const parent = recordFor(
      context,
      text(parentMetadata?.parent_model_id),
      parentId,
    );
    const id = text(record?.id);
    const identityPrefixValid =
      parentMetadata?.identity_prefix_required !== true || id.startsWith(parentId);
    const sameMacroRequirement =
      parentMetadata?.same_macro_requirement !== true ||
      text(parent?.macro_requirement_id) === macroRequirementId;
    const sameDecision =
      parentMetadata?.same_decision !== true ||
      text(parent?.decision_id) === decisionId;

    if (
      !matchesGovernedRequirementVariantIdentity(entry.variant, id) ||
      !identityPrefixValid ||
      !parent ||
      macroRequirementId !== entry.rootMacroRequirementId ||
      macroRequirementId !== entry.declaredOwnerId ||
      !sameMacroRequirement ||
      !sameDecision
    ) {
      context.pushDiagnostic(
        context.ruleIds.governanceParent,
        "logical_model",
        entry.sourcePath,
        entry.sourceLocation,
        `Governance Requirement ${id || "<unknown>"} must resolve to the Functional Requirement encoded by its identity and preserve the same Macro-requirement and Decision chain.`,
      );
    }
  },
});

export const governedDocumentCrossModelProviders = Object.freeze([
  macroRequirementProvider,
  decisionProvider,
  functionalRequirementProvider,
  governanceRequirementProvider,
]);

export const governedDocumentCrossModelProviderModelIds = Object.freeze(
  governedDocumentCrossModelProviders.map((provider) => provider.model_id),
);

/**
 * Builds the exact cross-model provider catalog for one canonical source set.
 *
 * @param {Record<string, unknown>} sourceSet - Canonical model source set.
 * @param {ReadonlyArray<Record<string, unknown>>} [providers] - Explicit providers.
 * @returns {{providers: ReadonlyArray<Record<string, unknown>>, by_model_id: ReadonlyMap<string, Record<string, unknown>>, provider_model_ids: ReadonlyArray<string>, requirement_dispatch: ReturnType<typeof buildGovernedRequirementVariantDispatch>}}
 */
export function buildGovernedDocumentCrossModelProviderCatalog(
  sourceSet,
  providers = governedDocumentCrossModelProviders,
) {
  const providerList = [...providers];
  const providerModelIds = providerList.map((provider) =>
    text(provider?.model_id),
  );
  assertGovernedDocumentModelConsumerCoverage({
    consumerId: governedDocumentCrossModelConsumerId,
    sourceSet,
    providerModelIds,
  });

  for (const provider of providerList) {
    if (
      !provider ||
      typeof provider.collect !== "function" ||
      typeof provider.validate !== "function"
    ) {
      throw new Error(
        `Cross-model provider ${text(provider?.model_id) || "<unknown>"} must expose collect and validate functions.`,
      );
    }
  }

  const byModelId = new Map(
    providerList.map((provider) => [provider.model_id, provider]),
  );
  return Object.freeze({
    providers: Object.freeze(providerList),
    by_model_id: byModelId,
    provider_model_ids: Object.freeze(providerModelIds),
    canonical_model_ids: Object.freeze(
      canonicalGovernedDocumentModelIds(sourceSet),
    ),
    requirement_dispatch: buildGovernedRequirementVariantDispatch(sourceSet),
  });
}

/**
 * Resolves the exact active cross-model provider catalog for one source set.
 * Security reference sources are loaded only when a Security Requirement record
 * is actually validated. Empty active repositories and synthetic non-Security
 * fixtures therefore do not require Base Analysis or Common Finding sources.
 */
export function resolveGovernedDocumentCrossModelProviders({
  rootDir,
  sourceSet,
  referenceService,
}) {
  const canonicalModelIds = canonicalGovernedDocumentModelIds(sourceSet);
  if (!canonicalModelIds.includes("security-requirement")) {
    return [...governedDocumentCrossModelProviders];
  }
  let resolvedReferenceService = referenceService ?? null;
  const lazyReferenceService = referenceService ?? Object.freeze({
    analyzePayload(input) {
      resolvedReferenceService ??=
        createSecurityRequirementAuthoringReferenceService({ rootDir });
      return resolvedReferenceService.analyzePayload(input);
    },
  });
  return [
    ...governedDocumentCrossModelProviders.filter(
      (provider) => provider.model_id !== "security-requirement",
    ),
    createSecurityRequirementCrossModelProvider({
      referenceService: lazyReferenceService,
    }),
  ];
}
