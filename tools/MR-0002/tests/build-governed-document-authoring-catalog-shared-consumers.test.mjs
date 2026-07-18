import assert from "node:assert/strict";
import test from "node:test";

import { buildGovernedDocumentAuthoringCatalog } from "../build-governed-document-authoring-catalog.mjs";

/**
 * @file Verification of the shared governed-document authoring catalog.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0001GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @derivedFromDecision MR-0002/ADR-0005
 * @macroRequirement MR-0002
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 */

test("projects all four canonical governed document types", () => {
  const catalog = buildGovernedDocumentAuthoringCatalog();
  assert.equal(catalog.catalog_id, "governed-document-authoring-catalog");
  assert.deepEqual(
    catalog.document_types.map((entry) => entry.id).sort(),
    ["decision", "functional-requirement", "governance-requirement", "macro-requirement"],
  );
});

test("projects controlled fields and canonical body sections", () => {
  const catalog = buildGovernedDocumentAuthoringCatalog();
  const byId = new Map(catalog.document_types.map((entry) => [entry.id, entry]));
  assert.deepEqual(
    byId.get("decision").record_fields.find((field) => field.name === "decision_type")
      .controlled_values.map((entry) => entry.value),
    ["structural", "behavioral", "operational", "governance"],
  );
  assert.deepEqual(
    byId.get("functional-requirement").body_sections.map((section) => section.input_name),
    ["intent", "functional_obligation", "scope", "acceptance"],
  );
  assert.deepEqual(
    byId.get("governance-requirement").body_sections.map((section) => section.input_name),
    ["intent", "governance_obligation", "verification_obligations", "failure_conditions"],
  );
  assert.deepEqual(
    byId.get("macro-requirement").body_sections.find((section) => section.input_name === "scope").allowed_prefixes,
    ["Includes:", "Excludes:"],
  );
});

test("projects current scoped relations without ambiguity", () => {
  const catalog = buildGovernedDocumentAuthoringCatalog();
  assert.ok(catalog.macro_requirements.length >= 1);
  for (const macro of catalog.macro_requirements) {
    assert.match(macro.id, /^MR-\d{4}$/u);
    assert.ok(Array.isArray(macro.decisions));
    for (const decision of macro.decisions) {
      assert.equal(decision.reference, `${macro.id}/${decision.id}`);
      for (const requirement of decision.requirements) {
        assert.ok(requirement.id.startsWith(`${macro.id}${decision.id}REQ-`));
      }
    }
  }
});

test("catalog generation is deterministic", () => {
  assert.deepEqual(
    buildGovernedDocumentAuthoringCatalog(),
    buildGovernedDocumentAuthoringCatalog(),
  );
});
