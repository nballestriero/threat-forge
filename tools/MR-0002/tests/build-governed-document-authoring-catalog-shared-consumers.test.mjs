import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGovernedRequirementVariantDispatch,
  canonicalGovernedDocumentModelIds,
  loadGovernedDocumentModelSourceSet,
  matchesGovernedRequirementVariantIdentity,
  resolveGovernedRequirementVariant,
} from "../../MR-0001/lib/governed-document-model-sources.mjs";
import { buildGovernedDocumentAuthoringCatalog } from "../build-governed-document-authoring-catalog.mjs";
import {
  governedDocumentAuthoringProviders,
  governedDocumentAuthoringProviderModelIds,
  validateGovernedDocumentAuthoringProviderCoverage,
} from "../create-governed-document.mjs";
import {
  buildGovernedDocumentAuthoringSchema,
  governedDocumentAuthoringSchemaProviders,
  governedDocumentAuthoringSchemaProviderModelIds,
  validateGovernedDocumentAuthoringSchemaProviderCoverage,
} from "../build-governed-document-authoring-schema.mjs";

/**
 * @file Verification of the shared governed-document authoring catalog.
 *
 * @implementsRequirement MR-0002ADR-0004REQ-0004
 * @implementsRequirement MR-0002ADR-0005REQ-0003GOV-0001
 * @implementsRequirement MR-0001ADR-0004REQ-0002GOV-0001
 * @implementsRequirement MR-0001ADR-0007REQ-0001GOV-0001
 * @implementsRequirement MR-0001ADR-0010REQ-0002
 * @implementsRequirement MR-0001ADR-0010REQ-0002GOV-0001
 * @derivedFromDecision MR-0002/ADR-0004
 * @derivedFromDecision MR-0002/ADR-0005
 * @derivedFromDecision MR-0001/ADR-0010
 * @macroRequirement MR-0002
 * @macroRequirement MR-0001
 * @implementationStatus implemented
 */

test("projects every active canonical governed document type", () => {
  const sourceSet = loadGovernedDocumentModelSourceSet();
  const catalog = buildGovernedDocumentAuthoringCatalog();
  assert.equal(catalog.catalog_id, "governed-document-authoring-catalog");
  assert.deepEqual(
    catalog.document_types.map((entry) => entry.id).sort(),
    canonicalGovernedDocumentModelIds(sourceSet).sort(),
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

test("dispatches catalog Requirement records through canonical variants", () => {
  const sourceSet = loadGovernedDocumentModelSourceSet();
  const dispatch = buildGovernedRequirementVariantDispatch(sourceSet);
  const catalog = buildGovernedDocumentAuthoringCatalog();
  for (const macro of catalog.macro_requirements) {
    for (const requirement of macro.requirements) {
      const variant = resolveGovernedRequirementVariant(
        dispatch,
        requirement.requirement_type,
      );
      assert.equal(requirement.model_id, variant.model_id);
      assert.equal(
        matchesGovernedRequirementVariantIdentity(variant, requirement.id),
        true,
      );
    }
  }
});

test("catalog generation is deterministic", () => {
  assert.deepEqual(
    buildGovernedDocumentAuthoringCatalog(),
    buildGovernedDocumentAuthoringCatalog(),
  );
});

test("runtime and schema authoring providers cover the canonical catalog exactly", () => {
  const catalog = buildGovernedDocumentAuthoringCatalog();
  const canonicalIds = catalog.document_types.map((entry) => entry.id).sort();
  assert.deepEqual(
    [...governedDocumentAuthoringProviderModelIds].sort(),
    canonicalIds,
  );
  assert.deepEqual(
    [...governedDocumentAuthoringSchemaProviderModelIds].sort(),
    canonicalIds,
  );
  assert.deepEqual(
    validateGovernedDocumentAuthoringProviderCoverage(catalog),
    [],
  );
  assert.deepEqual(
    validateGovernedDocumentAuthoringSchemaProviderCoverage(catalog),
    [],
  );
  assert.equal(buildGovernedDocumentAuthoringSchema(catalog).oneOf.length, canonicalIds.length);
});

test("additional canonical models fail closed until runtime and schema providers exist", () => {
  const catalog = buildGovernedDocumentAuthoringCatalog();
  const extended = structuredClone(catalog);
  extended.document_types.push({
    ...structuredClone(extended.document_types[0]),
    id: "synthetic-authoring-model",
    title: "Synthetic authoring model",
  });
  const runtimeDiagnostics = validateGovernedDocumentAuthoringProviderCoverage(extended);
  const schemaDiagnostics = validateGovernedDocumentAuthoringSchemaProviderCoverage(extended);
  assert.deepEqual(
    runtimeDiagnostics.map((entry) => entry.rule_id),
    ["document-model.consumer.provider.missing"],
  );
  assert.deepEqual(
    schemaDiagnostics.map((entry) => entry.rule_id),
    ["document-model.consumer.provider.missing"],
  );
  assert.throws(
    () => buildGovernedDocumentAuthoringSchema(extended),
    /document-model\.consumer\.provider\.missing/u,
  );
});

test("duplicate and unregistered authoring providers are rejected deterministically", () => {
  const catalog = buildGovernedDocumentAuthoringCatalog();
  const duplicateRuntime = [
    ...governedDocumentAuthoringProviders,
    governedDocumentAuthoringProviders[0],
  ];
  const unregisteredSchema = [
    ...governedDocumentAuthoringSchemaProviders,
    {
      ...governedDocumentAuthoringSchemaProviders[0],
      model_id: "unregistered-authoring-model",
    },
  ];
  const duplicateDiagnostics = validateGovernedDocumentAuthoringProviderCoverage(
    catalog,
    duplicateRuntime,
  );
  const duplicateReversed = validateGovernedDocumentAuthoringProviderCoverage(
    catalog,
    [...duplicateRuntime].reverse(),
  );
  assert.deepEqual(duplicateDiagnostics, duplicateReversed);
  assert.ok(
    duplicateDiagnostics.some(
      (entry) => entry.rule_id === "document-model.consumer.provider.duplicate",
    ),
  );
  const unregisteredDiagnostics =
    validateGovernedDocumentAuthoringSchemaProviderCoverage(
      catalog,
      unregisteredSchema,
    );
  assert.ok(
    unregisteredDiagnostics.some(
      (entry) => entry.rule_id === "document-model.consumer.provider.unregistered",
    ),
  );
});
