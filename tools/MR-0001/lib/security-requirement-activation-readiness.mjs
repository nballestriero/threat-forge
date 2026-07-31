import path from "node:path";

/**
 * @file Security Requirement integrated pre-activation readiness boundary.
 *
 * @implementsRequirement MR-0001ADR-0009REQ-0001
 * @implementsRequirement MR-0001ADR-0009REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0001/ADR-0009
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 *
 * Builds one detached readiness snapshot from the real complete-model,
 * cross-model, governed-reference, authoring, editor and Target Project
 * providers. The pure validator requires exact provider coverage and proves that
 * Security Requirement remains absent from the active source set while the
 * activation candidate contains exactly the active inventory plus Security.
 * No canonical source is modified and no activation operation is performed.
 */

export const securityRequirementActivationReadinessRuleIds = Object.freeze({
  state: "security-requirement.activation-readiness.state",
  activeIsolation: "security-requirement.activation-readiness.active-isolation",
  candidateInventory:
    "security-requirement.activation-readiness.candidate-inventory",
  missingProvider:
    "security-requirement.activation-readiness.provider.missing",
  duplicateProvider:
    "security-requirement.activation-readiness.provider.duplicate",
  unknownProvider:
    "security-requirement.activation-readiness.provider.unknown",
  providerIdentity:
    "security-requirement.activation-readiness.provider.identity",
  providerReadiness:
    "security-requirement.activation-readiness.provider.not-ready",
});

export const securityRequirementActivationReadinessProviderIds = Object.freeze([
  "security-complete-model-validator",
  "security-cross-model-provider",
  "security-governed-reference-service",
  "security-runtime-authoring-provider",
  "security-editor-schema-provider",
  "security-target-project-validator-provider",
  "security-target-project-authoring-provider",
]);

const securityModelId = "security-requirement";

function compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function array(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function text(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${label} must be a non-empty string.`);
  return normalized;
}

function diagnostic(ruleId, location, message) {
  return Object.freeze({
    severity: "error",
    rule_id: ruleId,
    source_path: "security-requirement-activation-readiness",
    location,
    message,
  });
}

function stableDiagnostics(values) {
  return [...values].sort((left, right) =>
    compare(
      `${left.rule_id}|${left.location}|${left.message}`,
      `${right.rule_id}|${right.location}|${right.message}`,
    ),
  );
}

function normalizedUniqueIds(values, label, diagnostics, ruleId) {
  const ids = [];
  const seen = new Set();
  for (const [index, value] of array(values, label).entries()) {
    const id = String(value ?? "").trim();
    if (!id || seen.has(id)) {
      diagnostics.push(
        diagnostic(
          ruleId,
          `${label}[${index}]`,
          `${label} must contain unique non-empty identifiers.`,
        ),
      );
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids.sort(compare);
}

function sameSet(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/**
 * Validates one detached integrated readiness snapshot.
 *
 * @param {Record<string, unknown>} snapshot Candidate snapshot.
 * @returns {{
 *   pre_activation_ready: boolean,
 *   activation_state: string,
 *   active_models_checked: number,
 *   candidate_models_checked: number,
 *   providers_checked: number,
 *   missing_provider_ids: string[],
 *   duplicate_provider_ids: string[],
 *   unknown_provider_ids: string[],
 *   diagnostics: Array<Record<string, unknown>>
 * }} Deterministic readiness report.
 */
export function validateSecurityRequirementActivationReadiness(snapshot) {
  const value = object(snapshot, "Security Requirement readiness snapshot");
  const diagnostics = [];
  const activationState = String(value.activation_state ?? "").trim();

  if (activationState !== "inactive") {
    diagnostics.push(
      diagnostic(
        securityRequirementActivationReadinessRuleIds.state,
        "activation_state",
        `Pre-activation readiness requires activation_state inactive; found ${activationState || "<empty>"}.`,
      ),
    );
  }

  const activeModelIds = normalizedUniqueIds(
    value.active_model_ids,
    "active_model_ids",
    diagnostics,
    securityRequirementActivationReadinessRuleIds.activeIsolation,
  );
  const candidateModelIds = normalizedUniqueIds(
    value.candidate_model_ids,
    "candidate_model_ids",
    diagnostics,
    securityRequirementActivationReadinessRuleIds.candidateInventory,
  );

  if (activeModelIds.includes(securityModelId)) {
    diagnostics.push(
      diagnostic(
        securityRequirementActivationReadinessRuleIds.activeIsolation,
        "active_model_ids",
        "Security Requirement must remain absent from the canonical active model inventory before atomic activation.",
      ),
    );
  }

  const expectedCandidateModelIds = [...activeModelIds, securityModelId]
    .sort(compare);
  if (!sameSet(candidateModelIds, expectedCandidateModelIds)) {
    diagnostics.push(
      diagnostic(
        securityRequirementActivationReadinessRuleIds.candidateInventory,
        "candidate_model_ids",
        `The activation candidate must equal the active inventory plus exactly ${securityModelId}. Expected: ${expectedCandidateModelIds.join(", ")}. Found: ${candidateModelIds.join(", ")}.`,
      ),
    );
  }

  const providers = array(value.providers, "providers").map((entry, index) => {
    try {
      return object(entry, `providers[${index}]`);
    } catch (error) {
      diagnostics.push(
        diagnostic(
          securityRequirementActivationReadinessRuleIds.providerIdentity,
          `providers[${index}]`,
          error.message,
        ),
      );
      return {};
    }
  });
  const expectedProviderIds = [...securityRequirementActivationReadinessProviderIds]
    .sort(compare);
  const providerCounts = new Map();
  for (const provider of providers) {
    const providerId = String(provider.provider_id ?? "").trim();
    if (!providerId) {
      diagnostics.push(
        diagnostic(
          securityRequirementActivationReadinessRuleIds.providerIdentity,
          "providers",
          "Every coordinated provider must declare provider_id.",
        ),
      );
      continue;
    }
    providerCounts.set(providerId, (providerCounts.get(providerId) ?? 0) + 1);
  }

  const missingProviderIds = expectedProviderIds.filter(
    (providerId) => !providerCounts.has(providerId),
  );
  const duplicateProviderIds = [...providerCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([providerId]) => providerId)
    .sort(compare);
  const unknownProviderIds = [...providerCounts.keys()]
    .filter((providerId) => !expectedProviderIds.includes(providerId))
    .sort(compare);

  for (const providerId of missingProviderIds) {
    diagnostics.push(
      diagnostic(
        securityRequirementActivationReadinessRuleIds.missingProvider,
        `providers/${providerId}`,
        `Atomic activation is blocked because coordinated provider ${providerId} is missing.`,
      ),
    );
  }
  for (const providerId of duplicateProviderIds) {
    diagnostics.push(
      diagnostic(
        securityRequirementActivationReadinessRuleIds.duplicateProvider,
        `providers/${providerId}`,
        `Atomic activation is blocked because coordinated provider ${providerId} is registered more than once.`,
      ),
    );
  }
  for (const providerId of unknownProviderIds) {
    diagnostics.push(
      diagnostic(
        securityRequirementActivationReadinessRuleIds.unknownProvider,
        `providers/${providerId}`,
        `Atomic activation is blocked because provider ${providerId} is not part of the governed readiness contract.`,
      ),
    );
  }

  for (const [index, provider] of providers.entries()) {
    const providerId = String(provider.provider_id ?? "").trim();
    if (!expectedProviderIds.includes(providerId)) continue;
    const modelId = String(provider.model_id ?? "").trim();
    const providerActivationState = String(
      provider.activation_state ?? "",
    ).trim();
    const consumerId = String(provider.consumer_id ?? "").trim();
    if (
      modelId !== securityModelId ||
      providerActivationState !== "inactive" ||
      !consumerId
    ) {
      diagnostics.push(
        diagnostic(
          securityRequirementActivationReadinessRuleIds.providerIdentity,
          `providers[${index}]`,
          `${providerId} must identify model ${securityModelId}, activation_state inactive and one non-empty consumer_id.`,
        ),
      );
    }
    if (provider.ready !== true) {
      diagnostics.push(
        diagnostic(
          securityRequirementActivationReadinessRuleIds.providerReadiness,
          `providers/${providerId}`,
          `${providerId} did not produce successful integrated evidence.`,
        ),
      );
    }
  }

  const orderedDiagnostics = stableDiagnostics(diagnostics);
  return {
    pre_activation_ready: orderedDiagnostics.length === 0,
    activation_state: activationState,
    active_models_checked: activeModelIds.length,
    candidate_models_checked: candidateModelIds.length,
    providers_checked: providers.length,
    missing_provider_ids: missingProviderIds,
    duplicate_provider_ids: duplicateProviderIds,
    unknown_provider_ids: unknownProviderIds,
    diagnostics: orderedDiagnostics,
  };
}

/**
 * Throws when one readiness snapshot is not complete and coherent.
 *
 * @param {Record<string, unknown>} snapshot Candidate snapshot.
 * @returns {ReturnType<typeof validateSecurityRequirementActivationReadiness>}
 */
export function assertSecurityRequirementActivationReadiness(snapshot) {
  const report = validateSecurityRequirementActivationReadiness(snapshot);
  if (!report.pre_activation_ready) {
    const error = new Error(
      report.diagnostics
        .map((entry) => `[${entry.rule_id}] ${entry.message}`)
        .join(" | "),
    );
    error.diagnostics = report.diagnostics;
    throw error;
  }
  return report;
}

async function loadDefaultModules() {
  const [
    modelSources,
    securityModel,
    crossModel,
    securityAuthoring,
    securityEditor,
    authoringRunner,
    authoringCore,
    targetProjectCheck,
    targetProjectAuthoring,
  ] = await Promise.all([
    import("./governed-document-model-sources.mjs"),
    import("./security-requirement-model-validation.mjs"),
    import("./security-requirement-cross-model-provider.mjs"),
    import("./security-requirement-authoring-provider.mjs"),
    import("./security-requirement-authoring-editor-assistance.mjs"),
    import("../../MR-0002/run-governed-document-authoring.mjs"),
    import("../../MR-0002/create-governed-document.mjs"),
    import("../../MR-0004/run-target-project-check.mjs"),
    import("../../MR-0004/lib/target-project-authoring.mjs"),
  ]);
  return {
    modelSources,
    securityModel,
    crossModel,
    securityAuthoring,
    securityEditor,
    authoringRunner,
    authoringCore,
    targetProjectCheck,
    targetProjectAuthoring,
  };
}

function provider(providerId, consumerId, ready, evidence = {}) {
  return Object.freeze({
    provider_id: providerId,
    consumer_id: consumerId,
    model_id: securityModelId,
    activation_state: "inactive",
    ready: ready === true,
    evidence: structuredClone(evidence),
  });
}

/**
 * Builds one integrated, detached pre-activation readiness snapshot from the
 * actual repository providers. Optional module injection exists only for
 * deterministic verification fixtures.
 *
 * @param {{rootDir: string, modules?: Record<string, unknown>}} options Context.
 * @returns {Promise<Record<string, unknown>>} Detached readiness snapshot.
 */
export async function buildSecurityRequirementActivationReadinessSnapshot(
  options = {},
) {
  const rootDir = path.resolve(text(options.rootDir, "rootDir"));
  const modules = options.modules ?? await loadDefaultModules();
  const modelSources = object(modules.modelSources, "modelSources module");
  const securityModel = object(modules.securityModel, "securityModel module");
  const crossModel = object(modules.crossModel, "crossModel module");
  const securityAuthoring = object(
    modules.securityAuthoring,
    "securityAuthoring module",
  );
  const securityEditor = object(modules.securityEditor, "securityEditor module");
  const authoringRunner = object(modules.authoringRunner, "authoringRunner module");
  const authoringCore = object(modules.authoringCore, "authoringCore module");
  const targetProjectCheck = object(
    modules.targetProjectCheck,
    "targetProjectCheck module",
  );
  const targetProjectAuthoring = object(
    modules.targetProjectAuthoring,
    "targetProjectAuthoring module",
  );

  const activeSourceSet = modelSources.loadGovernedDocumentModelSourceSet({
    rootDir,
  });
  const activeModelIds = modelSources.canonicalGovernedDocumentModelIds(
    activeSourceSet,
  );
  const loadedCandidate =
    securityModel.loadSecurityRequirementValidationSourceSet({ rootDir });
  const candidateSourceSet = loadedCandidate.sourceSet;
  const candidateModelIds = modelSources.canonicalGovernedDocumentModelIds(
    candidateSourceSet,
  );
  const activationState = String(loadedCandidate.activation_state ?? "");

  const modelResult = securityModel.validateSecurityRequirementModel({
    rootDir,
    sourceSet: candidateSourceSet,
    activationState,
  });
  const modelDiagnostics = Array.isArray(modelResult?.diagnostics)
    ? modelResult.diagnostics
    : [];

  const activeCatalog = authoringRunner.loadGovernedDocumentAuthoringCatalog({
    rootDir,
  });
  const referenceService =
    securityAuthoring.createSecurityRequirementAuthoringReferenceService({
      rootDir,
    });
  const crossModelProvider =
    crossModel.createSecurityRequirementCrossModelProvider({
      referenceService,
    });
  const projectedAuthoring =
    securityAuthoring.buildSecurityRequirementAuthoringCatalog({
      rootDir,
      activeCatalog,
      loadedSourceSet: loadedCandidate,
    });
  const runtimeAuthoringProvider =
    securityAuthoring.createSecurityRequirementAuthoringProvider({
      referenceService,
    });
  const activeAuthoringProviders = Array.isArray(
    authoringCore.governedDocumentAuthoringProviders,
  )
    ? authoringCore.governedDocumentAuthoringProviders
    : [];
  const authoringCoverageDiagnostics =
    authoringCore.validateGovernedDocumentAuthoringProviderCoverage(
      projectedAuthoring.catalog,
      [...activeAuthoringProviders, runtimeAuthoringProvider],
    );

  const editorSchema =
    securityEditor.buildSecurityRequirementAuthoringEditorSchema({
      rootDir,
      activeCatalog,
      referenceService,
      loadedSourceSet: loadedCandidate,
    });
  const editorValidation =
    securityEditor.validateSecurityRequirementAuthoringEditorSchema(
      editorSchema,
    );

  const targetProviders =
    targetProjectCheck.resolveTargetProjectModelValidationProviders(
      candidateSourceSet,
    );
  const targetSecurityProviders = targetProviders.filter(
    (entry) => entry.model_id === securityModelId,
  );

  const coordinatedProviders = [
    provider(
      "security-complete-model-validator",
      "security-requirement-complete-model-validation",
      modelResult?.model_id === securityModelId &&
        modelDiagnostics.length === 0,
      {
        records_checked: Number(modelResult?.records_checked ?? 0),
        diagnostic_count: modelDiagnostics.length,
      },
    ),
    provider(
      "security-cross-model-provider",
      "governed-document-cross-model-coherence",
      crossModelProvider?.model_id === securityModelId &&
        typeof crossModelProvider?.validate === "function",
      { provider_model_id: crossModelProvider?.model_id ?? null },
    ),
    provider(
      "security-governed-reference-service",
      "governed-entity-reference-service",
      typeof referenceService?.analyzePayload === "function" &&
        typeof referenceService?.listEligibleCandidates === "function",
      {
        analyze_payload: typeof referenceService?.analyzePayload === "function",
        list_candidates:
          typeof referenceService?.listEligibleCandidates === "function",
      },
    ),
    provider(
      "security-runtime-authoring-provider",
      "governed-document-authoring-runtime",
      runtimeAuthoringProvider?.model_id === securityModelId &&
        authoringCoverageDiagnostics.length === 0 &&
        projectedAuthoring.activation_state === "inactive",
      {
        provider_model_id: runtimeAuthoringProvider?.model_id ?? null,
        coverage_diagnostic_count: authoringCoverageDiagnostics.length,
        candidate_document_types:
          projectedAuthoring.catalog?.document_types?.length ?? 0,
      },
    ),
    provider(
      "security-editor-schema-provider",
      "security-requirement-authoring-editor",
      editorValidation?.activation_state === "inactive" &&
        editorSchema?.["x-threatforge"]?.create_available === false &&
        editorSchema?.["x-threatforge"]?.preview_available === true,
      {
        parent_candidates: Number(editorValidation?.parent_candidates ?? 0),
        finding_candidates: Number(editorValidation?.finding_candidates ?? 0),
      },
    ),
    provider(
      "security-target-project-validator-provider",
      "target-project-model-validation",
      targetSecurityProviders.length === 1 &&
        typeof targetSecurityProviders[0]?.run === "function",
      { matching_provider_count: targetSecurityProviders.length },
    ),
    provider(
      "security-target-project-authoring-provider",
      "target-project-authoring",
      typeof targetProjectAuthoring?.planTargetProjectAuthoring === "function" &&
        runtimeAuthoringProvider?.model_id === securityModelId &&
        projectedAuthoring.activation_state === "inactive",
      {
        shared_runtime_provider: runtimeAuthoringProvider?.model_id ?? null,
        preview_only: true,
      },
    ),
  ];

  return {
    schema_version: 1,
    snapshot_id: "security-requirement-pre-activation-readiness",
    activation_state: activationState,
    active_model_ids: [...activeModelIds],
    candidate_model_ids: [...candidateModelIds],
    providers: coordinatedProviders,
    atomic_activation_performed: false,
  };
}
