import assert from "node:assert/strict";
import test from "node:test";

import {
  createGovernedEntityReferenceService,
  governedEntityReferenceRuleIds,
} from "../../MR-0001/lib/governed-entity-references.mjs";
import {
  applyGovernedMarkdownReferenceAssistance,
} from "../lib/governed-markdown-reference-assistance.mjs";

/**
 * @file Governed Markdown BAE reference assistance integration verification.
 *
 * @implementsRequirement MR-0002ADR-0006REQ-0004
 * @implementsRequirement MR-0002ADR-0006REQ-0004GOV-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0001
 * @implementsRequirement MR-0001ADR-0008REQ-0002
 * @derivedFromDecision MR-0002/ADR-0006
 * @macroRequirement MR-0002
 * @implementationStatus implemented
 */

function referenceService({ title = "Web API", eligible = true } = {}) {
  return createGovernedEntityReferenceService({
    registry: {
      schema_version: 1,
      registry_id: "governed-entity-resolvers-registry",
      scope: "governed_entity_reference_resolution",
      resolvers: [
        {
          id: "base-analysis-element-reference-resolver",
          entity_type: "base_analysis_element",
          status: "active",
          identifier_pattern: "^BAE-[0-9]{4}$",
          source_projection_provider: "bae-source",
          eligibility_provider: "bae-eligibility",
        },
      ],
    },
    sourceProjectionProviders: new Map([
      [
        "bae-source",
        () => [
          {
            id: "BAE-0001",
            title,
            entity_type: "base_analysis_element",
            base_type: "component",
            meaning: "Public HTTP boundary.",
            lifecycle_state: "active",
            origin: {
              kind: "governed_document",
              source_id: "MR-0001",
              source_path:
                "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
            },
            provenance: [
              {
                relation: "origin",
                source_kind: "governed_document",
                source_id: "MR-0001",
                source_path:
                  "docs/reference/project-model/body/macro-requirements/MR-0001_body.md",
              },
            ],
          },
        ],
      ],
    ]),
    eligibilityProviders: new Map([
      ["bae-eligibility", () => ({ eligible, reason: "Descendant-only origin." })],
    ]),
  });
}

function analysis(text, service = referenceService()) {
  const lines = text.split("\n");
  const diagnostics = [];
  const hovers = [];
  const quickFixes = new Map();
  const profile = {
    sections: [
      {
        id: "functional-requirement.body.section.scope",
        heading: "Scope",
      },
    ],
    reference_positions: [
      {
        id: "functional-requirement.body.reference.scope-classified-item",
        section_id: "functional-requirement.body.section.scope",
        container_kind: "classified_list_item",
        allowed_prefixes: ["Includes:", "Excludes:"],
        terminal_punctuation: "forbidden",
        allowed_entity_types: ["base_analysis_element"],
      },
    ],
  };
  const parsed = {
    lines,
    sections: [
      {
        heading: "Scope",
        lineIndex: 0,
        endLineIndex: lines.length - 1,
      },
    ],
  };
  applyGovernedMarkdownReferenceAssistance({
    profile,
    parsed,
    record: {
      id: "MR-0002ADR-0006REQ-0004",
      modelId: "functional-requirement",
      bodyPath:
        "docs/reference/project-model/body/requirements/MR-0002/example_body.md",
    },
    referenceService: service,
    diagnostics,
    hovers,
    quickFixes,
    lineRange(sourceLines, line, startCharacter, endCharacter) {
      return {
        start: { line, character: startCharacter },
        end: { line, character: endCharacter },
      };
    },
  });
  return { diagnostics, hovers, quick_fixes: [...quickFixes.values()] };
}

test("resolves a canonical BAE reference and exposes BAE hover metadata", () => {
  const result = analysis("## Scope\n\n- Includes: [BAE-0001] Web API");
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.hovers.length, 1);
  assert.match(result.hovers[0].markdown, /Public HTTP boundary/u);
  assert.match(result.hovers[0].markdown, /Lifecycle: `active`/u);
  assert.match(result.hovers[0].markdown, /Provenance/u);
});

test("reports an unknown BAE identifier", () => {
  const result = analysis("## Scope\n\n- Includes: [BAE-9999] Missing");
  assert.deepEqual(
    result.diagnostics.map((entry) => entry.rule_id),
    [governedEntityReferenceRuleIds.unknownIdentifier],
  );
});

test("reports noncanonical BAE syntax only in a declared position", () => {
  const declared = analysis("## Scope\n\n- Includes: BAE-0001 Web API");
  assert.deepEqual(
    declared.diagnostics.map((entry) => entry.rule_id),
    [governedEntityReferenceRuleIds.noncanonicalSyntax],
  );

  const ordinary = analysis("## Scope\n\nOrdinary prose mentions BAE-0001.");
  assert.deepEqual(ordinary.diagnostics, []);
});

test("offers a canonical-title quick fix without mutating authored text", () => {
  const source = "## Scope\n\n- Includes: [BAE-0001] Old title";
  const result = analysis(source);
  assert.equal(source.endsWith("Old title"), true);
  assert.deepEqual(
    result.diagnostics.map((entry) => entry.rule_id),
    [governedEntityReferenceRuleIds.titleDivergence],
  );
  assert.equal(result.quick_fixes.length, 1);
  assert.equal(result.quick_fixes[0].edits[0].new_text, "[BAE-0001] Web API");
});

test("reports descendant-only BAE origin as ineligible", () => {
  const result = analysis(
    "## Scope\n\n- Includes: [BAE-0001] Web API",
    referenceService({ eligible: false }),
  );
  assert.deepEqual(
    result.diagnostics.map((entry) => entry.rule_id),
    [governedEntityReferenceRuleIds.ineligibleEntity],
  );
});
