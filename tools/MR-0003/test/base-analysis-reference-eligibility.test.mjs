import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateBaseAnalysisReferenceEligibility,
} from "../lib/base-analysis-reference-eligibility.mjs";

/**
 * @file BAE documentary precedence and current-authority verification suite.
 *
 * @implementsRequirement MR-0003ADR-0001REQ-0002
 * @implementsRequirement MR-0003ADR-0001REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0002
 * @implementsRequirement MR-0003ADR-0002REQ-0001
 * @implementsRequirement MR-0003ADR-0002REQ-0001GOV-0001
 * @derivedFromDecision MR-0003/ADR-0001
 * @macroRequirement MR-0003
 * @implementationStatus implemented
 */

const macro = {
  modelId: "macro-requirement",
  id: "MR-0001",
  bodyPath:
    "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
};
const decision = {
  modelId: "decision",
  id: "ADR-0001",
  macroRequirementId: "MR-0001",
  bodyPath:
    "docs/reference/project-model/body/decisions/MR-0001/ADR-0001_body.md",
};
const functional = {
  modelId: "functional-requirement",
  id: "MR-0001ADR-0001REQ-0001",
  macroRequirementId: "MR-0001",
  decisionId: "ADR-0001",
  bodyPath:
    "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001_body.md",
};
const governance = {
  modelId: "governance-requirement",
  id: "MR-0001ADR-0001REQ-0001GOV-0001",
  macroRequirementId: "MR-0001",
  decisionId: "ADR-0001",
  parentRequirementId: "MR-0001ADR-0001REQ-0001",
  bodyPath:
    "docs/reference/project-model/body/requirements/MR-0001/MR-0001ADR-0001REQ-0001GOV-0001_body.md",
};

function sourceFrom(document, kind = "governed_document") {
  return kind === "reviewed_analytical_addition"
    ? {
        kind,
        source_id: "REVIEW-0001",
        source_path: "docs/reference/base-analysis/reviews/REVIEW-0001.md",
        review_evidence_id: "REVIEW-0001",
      }
    : {
        kind,
        source_id: document.id,
        source_path: document.bodyPath,
      };
}

function entityFrom(document, kind = "governed_document") {
  const source = sourceFrom(document, kind);
  return {
    id: "BAE-0001",
    origin: structuredClone(source),
    authoritative_source: structuredClone(source),
  };
}

function documentIndex(...documents) {
  return new Map(documents.map((entry) => [entry.bodyPath, entry]));
}

test("accepts a BAE authoritative in the current document", () => {
  const result = evaluateBaseAnalysisReferenceEligibility({
    currentDocument: functional,
    entity: entityFrom(functional),
    documentsByPath: documentIndex(functional),
  });
  assert.equal(result.eligible, true);
  assert.equal(result.document_relation, "current_document");
});

test("accepts a BAE authoritative in an ancestor document", () => {
  const result = evaluateBaseAnalysisReferenceEligibility({
    currentDocument: functional,
    entity: entityFrom(decision),
    documentsByPath: documentIndex(decision, functional),
  });
  assert.equal(result.eligible, true);
  assert.equal(result.document_relation, "ancestor_document");
});

test("accepts a BAE authoritative in an independent document", () => {
  const independent = {
    ...decision,
    id: "ADR-0002",
    macroRequirementId: "MR-0002",
    bodyPath:
      "docs/reference/project-model/body/decisions/MR-0002/ADR-0002_body.md",
  };
  const result = evaluateBaseAnalysisReferenceEligibility({
    currentDocument: functional,
    entity: entityFrom(independent),
    documentsByPath: documentIndex(independent, functional),
  });
  assert.equal(result.eligible, true);
  assert.equal(result.document_relation, "independent_source");
});

test("rejects a BAE authoritative only in a descendant document", () => {
  const macroResult = evaluateBaseAnalysisReferenceEligibility({
    currentDocument: macro,
    entity: entityFrom(decision),
    documentsByPath: documentIndex(macro, decision),
  });
  assert.equal(macroResult.eligible, false);
  assert.equal(macroResult.document_relation, "descendant_document");
  assert.match(macroResult.reason, /descendant/u);

  const functionalResult = evaluateBaseAnalysisReferenceEligibility({
    currentDocument: functional,
    entity: entityFrom(governance),
    documentsByPath: documentIndex(functional, governance),
  });
  assert.equal(functionalResult.eligible, false);
});

test("accepts a reviewed analytical addition", () => {
  const result = evaluateBaseAnalysisReferenceEligibility({
    currentDocument: functional,
    entity: entityFrom(functional, "reviewed_analytical_addition"),
    documentsByPath: documentIndex(functional),
  });
  assert.equal(result.eligible, true);
  assert.equal(result.document_relation, "independent_source");
});

test("uses current authority instead of immutable historical origin", () => {
  const entity = entityFrom(decision);
  entity.authoritative_source = sourceFrom(macro);
  const result = evaluateBaseAnalysisReferenceEligibility({
    currentDocument: macro,
    entity,
    documentsByPath: documentIndex(macro, decision),
  });
  assert.equal(result.eligible, true);
  assert.equal(result.document_relation, "current_document");
});
