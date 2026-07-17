/**
 * @file Base Analysis Element documentary precedence eligibility provider.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0002
 * @implementsRequirement MR-0003ADR-0001REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0002
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * Determines whether a canonical BAE may be referenced by the current governed
 * document. A BAE originating from the current document, an ancestor, or an
 * independent governed source is eligible; a BAE originating only from a
 * descendant document is ineligible.
 */

function normalizeProjectPath(value) {
  return String(value ?? "").replaceAll("\\", "/").trim();
}

function isDescendantDocument(currentDocument, sourceDocument) {
  const currentModel = String(currentDocument?.modelId ?? "");
  const sourceModel = String(sourceDocument?.modelId ?? "");

  if (currentModel === "macro-requirement") {
    return (
      sourceModel !== "macro-requirement" &&
      String(sourceDocument?.macroRequirementId ?? "") ===
        String(currentDocument?.id ?? "")
    );
  }
  if (currentModel === "decision") {
    return (
      (sourceModel === "functional-requirement" ||
        sourceModel === "governance-requirement") &&
      String(sourceDocument?.macroRequirementId ?? "") ===
        String(currentDocument?.macroRequirementId ?? "") &&
      String(sourceDocument?.decisionId ?? "") ===
        String(currentDocument?.id ?? "")
    );
  }
  if (currentModel === "functional-requirement") {
    return (
      sourceModel === "governance-requirement" &&
      String(sourceDocument?.parentRequirementId ?? "") ===
        String(currentDocument?.id ?? "")
    );
  }
  return false;
}

/**
 * Classifies an eligible governed-document origin relative to the current body.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0002
 * @implementsRequirement MR-0003ADR-0001REQ-0002GOV-0001
 * @implementsRequirement MR-0002ADR-0006REQ-0004GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 *
 * @param {Record<string, unknown>} currentDocument - Current governed document.
 * @param {Record<string, unknown>} sourceDocument - BAE origin document.
 * @returns {"ancestor_document" | "independent_source"}
 */
function classifyEligibleDocumentRelation(currentDocument, sourceDocument) {
  const currentModel = String(currentDocument?.modelId ?? "");
  const sourceModel = String(sourceDocument?.modelId ?? "");
  const currentMacro = String(currentDocument?.macroRequirementId ?? "");
  const sourceMacro =
    sourceModel === "macro-requirement"
      ? String(sourceDocument?.id ?? "")
      : String(sourceDocument?.macroRequirementId ?? "");

  if (
    currentModel === "decision" &&
    sourceModel === "macro-requirement" &&
    sourceMacro === currentMacro
  ) {
    return "ancestor_document";
  }

  if (currentModel === "functional-requirement") {
    if (
      sourceModel === "decision" &&
      sourceMacro === currentMacro &&
      String(sourceDocument?.id ?? "") ===
        String(currentDocument?.decisionId ?? "")
    ) {
      return "ancestor_document";
    }
    if (
      sourceModel === "macro-requirement" &&
      sourceMacro === currentMacro
    ) {
      return "ancestor_document";
    }
  }

  if (currentModel === "governance-requirement") {
    if (
      sourceModel === "functional-requirement" &&
      String(sourceDocument?.id ?? "") ===
        String(currentDocument?.parentRequirementId ?? "")
    ) {
      return "ancestor_document";
    }
    if (
      sourceModel === "decision" &&
      sourceMacro === currentMacro &&
      String(sourceDocument?.id ?? "") ===
        String(currentDocument?.decisionId ?? "")
    ) {
      return "ancestor_document";
    }
    if (
      sourceModel === "macro-requirement" &&
      sourceMacro === currentMacro
    ) {
      return "ancestor_document";
    }
  }

  return "independent_source";
}

/**
 * Evaluates BAE documentary precedence.
 *
 * @param {{
 *   currentDocument: Record<string, unknown>,
 *   entity: Record<string, unknown>,
 *   documentsByPath: Map<string, Record<string, unknown>>
 * }} input - Current document, BAE projection and governed document index.
 * @returns {{eligible: boolean, reason: string}}
 */
export function evaluateBaseAnalysisReferenceEligibility(input) {
  const entity = input?.entity ?? {};
  const origin = entity.origin ?? {};
  const originKind = String(origin.kind ?? "");
  if (originKind === "reviewed_analytical_addition") {
    return {
      eligible: true,
      reason: "Reviewed analytical additions are independently justified.",
      document_relation: "independent_source",
    };
  }
  if (originKind !== "governed_document") {
    return {
      eligible: false,
      reason: `BAE ${String(entity.id ?? "")} has an unsupported origin kind.`,
      document_relation: "unsupported_source",
    };
  }

  const sourcePath = normalizeProjectPath(origin.source_path);
  const currentPath = normalizeProjectPath(input?.currentDocument?.bodyPath);
  if (sourcePath && sourcePath === currentPath) {
    return {
      eligible: true,
      reason: "The BAE originates from the current governed document.",
      document_relation: "current_document",
    };
  }

  const documentsByPath =
    input?.documentsByPath instanceof Map ? input.documentsByPath : new Map();
  const sourceDocument = documentsByPath.get(sourcePath);
  if (!sourceDocument) {
    return {
      eligible: false,
      reason: `BAE ${String(entity.id ?? "")} origin document is not registered.`,
      document_relation: "unresolved_source",
    };
  }
  if (isDescendantDocument(input?.currentDocument ?? {}, sourceDocument)) {
    return {
      eligible: false,
      reason: `BAE ${String(entity.id ?? "")} originates only from a descendant governed document.`,
      document_relation: "descendant_document",
    };
  }
  return {
    eligible: true,
    reason: "The BAE originates from an ancestor or independent governed source.",
    document_relation: classifyEligibleDocumentRelation(
      input?.currentDocument ?? {},
      sourceDocument,
    ),
  };
}
