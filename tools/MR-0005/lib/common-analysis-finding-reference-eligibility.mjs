/**
 * @file Common Finding accepted-state reference eligibility provider.
 *
 * @implementsRequirement MR-0005ADR-0004REQ-0001GOV-0001
 * @derivedFromDecision MR-0005/ADR-0004
 * @macroRequirement MR-0005
 * @implementationStatus implemented
 *
 * Evaluates only the methodology-neutral Common Finding lifecycle criterion.
 * The governed reference service and the owning document profile remain
 * responsible for entity-type and reference-position authorization.
 *
 * Side effects: none. Provider-bundle creation is lazy and never reads the
 * repository; the injected fail-closed source loader runs only when the source
 * projection provider is invoked.
 */

/**
 * Stable provider identifiers owned by the Common Finding boundary.
 */
export const commonAnalysisFindingReferenceProviderIds = Object.freeze({
  sourceProjection: "common-analysis-finding-reference-source",
  eligibility: "common-analysis-finding-accepted-state",
});

/**
 * Evaluates whether one validated Common Finding projection is
 * reference-eligible.
 *
 * @param {{entity?: Record<string, unknown>}} input
 *   Reference-service input containing a validated Finding projection.
 * @returns {{eligible: boolean, reason: string, review_state: string}}
 *   Deterministic lifecycle eligibility metadata.
 */
export function evaluateCommonAnalysisFindingReferenceEligibility(input) {
  const entity = input?.entity ?? {};
  const findingId = String(entity.id ?? "").trim();
  const reviewState = String(entity.review_state ?? "");

  if (reviewState === "accepted") {
    return {
      eligible: true,
      reason: "The Common Finding is explicitly accepted.",
      review_state: reviewState,
    };
  }

  return {
    eligible: false,
    reason:
      `Common Finding ${findingId || "<unknown>"} is not accepted ` +
      `(review_state: ${reviewState || "<empty>"}).`,
    review_state: reviewState,
  };
}

/**
 * Creates the Common Finding provider maps consumed by a governed reference
 * service composition root.
 *
 * The source loader is dependency-injected so this module does not depend on a
 * repository checker. Bundle creation is side-effect free; the loader is called
 * lazily by the source provider and remains responsible for fail-closed
 * repository validation.
 *
 * @param {{
 *   rootDir: string,
 *   loadProjection: (input: {rootDir: string}) => Array<Record<string, unknown>>
 * }} input - Repository root and validated projection loader.
 * @returns {{
 *   sourceProjectionProviders: Map<string, () => Array<Record<string, unknown>>>,
 *   eligibilityProviders: Map<string, typeof evaluateCommonAnalysisFindingReferenceEligibility>
 * }} Fresh provider maps for one composition root.
 */
export function createCommonAnalysisFindingReferenceProviders(input) {
  const rootDir = String(input?.rootDir ?? "").trim();
  const loadProjection = input?.loadProjection;

  if (!rootDir) {
    throw new TypeError(
      "Common Finding reference providers require a non-empty rootDir.",
    );
  }

  if (typeof loadProjection !== "function") {
    throw new TypeError(
      "Common Finding reference providers require a loadProjection function.",
    );
  }

  return {
    sourceProjectionProviders: new Map([
      [
        commonAnalysisFindingReferenceProviderIds.sourceProjection,
        () => {
          const projection = loadProjection({ rootDir });

          if (!Array.isArray(projection)) {
            throw new TypeError(
              "Common Finding reference projection loader must return an array.",
            );
          }

          return structuredClone(projection);
        },
      ],
    ]),
    eligibilityProviders: new Map([
      [
        commonAnalysisFindingReferenceProviderIds.eligibility,
        evaluateCommonAnalysisFindingReferenceEligibility,
      ],
    ]),
  };
}
