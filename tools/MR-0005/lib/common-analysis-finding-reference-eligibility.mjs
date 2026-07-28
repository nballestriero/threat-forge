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
 * Side effects: none.
 */

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
