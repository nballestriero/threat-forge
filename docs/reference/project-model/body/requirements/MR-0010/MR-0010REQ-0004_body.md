# MR-0010REQ-0004 — Code Coherence and Anti-Duplication Development Guidance

## Intent

Threat-forge contributors need a practical guide for changing code without bypassing documentation governance, duplicating existing decisions or creating divergence between source code, contracts and the graph.

## Requirement

The manual must explain how code is introduced and changed through ADRs, requirements, graph relations, JSDoc traceability, contracts, tests, fixtures and deterministic gates.

## Scope

This requirement governs explanatory development guidance. It does not create new code rules by itself or replace existing validators.

## Rules

- The manual must describe the ADR → REQ → graph → implementation → verification flow.
- The manual must explain how `docs:code-traceability` prevents code artifacts from drifting away from governed requirements.
- The manual must explain how controlled vocabulary and graph ownership gates prevent semantic divergence.
- The manual must teach contributors to search existing ADRs, requirements and graph neighborhoods before adding new concepts.
- The manual must explain when a change requires a new ADR, a new requirement, a graph update, a fixture or a runtime test.

## Acceptance Criteria

```gherkin
Scenario: Contributor avoids duplicate implementation semantics
  Given a contributor wants to add a new validator
  When the contributor follows the manual code-coherence guidance
  Then the contributor checks existing ADRs, requirements, graph nodes and tools first
  And the contributor adds or reuses the correct requirement trace before writing code
  And deterministic gates can verify the resulting traceability
```

## Verification Expectation

Future validation should link the manual development guidance to existing gate records, code-traceability rules and example workflows.
