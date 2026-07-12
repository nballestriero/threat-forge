# MR-0001REQ-0024 — Requirement body format validator

## Intent

Requirement body files are canonical requirement bodies and must be validated with a focused requirement that future validator code can reference directly.

The broader document-format requirement `MR-0001REQ-0014` defines canonical ADR and Requirement registry/body validation. This requirement narrows the Requirement-body portion into a small, implementable validator obligation.

## Requirement

The project model must provide a deterministic Requirement body format validator.

The validator must check governed functional and specialized Requirement Markdown bodies against the applicable body-format profiles declared in `docs/reference/project-model/registers/body-formats.registry.yml`.

## Scope

This requirement applies to Requirement body validation for records declared in governed Requirement registries.

It covers both functional Requirement bodies and specialized child Requirement bodies.

It does not implement ADR body validation, Requirement registry field validation, append-first governance checks, graph view generation, RTM generation, LLM guide generation, or runner aggregation.

## Rules

- The Requirement body validator must resolve Requirement records from governed Requirement registries.
- The Requirement body validator must select the applicable body-format profile for functional and specialized Requirement records.
- The Requirement body validator must verify that each Requirement record has an existing `body_path`.
- The Requirement body validator must validate Requirement body H1 headings against the applicable body-format profile.
- The Requirement body validator must validate required sections and required section order using the governed body-format registry.
- The Requirement body validator must detect extra sections when the applicable body-format profile disallows them.
- The Requirement body validator must use the shared Markdown body parser rather than duplicating Markdown section extraction.
- The Requirement body validator must not hardcode Requirement section policy outside the governed body-format registry.
- The Requirement body validator must emit deterministic diagnostics suitable for a gate.
- Future source files implementing this validator must declare this requirement in JSDoc or equivalent governed source metadata.

## Acceptance Criteria

```gherkin
Scenario: Requirement body validator checks governed Requirement bodies
  Given governed Requirement records with body paths
  And valid Requirement body-format profiles
  When the Requirement body format validator runs
  Then each Requirement body starts with a compliant H1
  And each Requirement body contains the required sections for its profile
  And each Requirement body respects the required section order
  And extra sections are rejected when the profile disallows them
  And diagnostics are deterministic when validation fails
```

## Verification Expectation

A future deterministic gate must run the Requirement body format validator and fail when governed Requirement body files do not match the applicable body-format profile.
