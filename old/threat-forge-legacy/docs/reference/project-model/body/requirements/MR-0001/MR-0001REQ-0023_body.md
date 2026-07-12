# MR-0001REQ-0023 — ADR body format validator

## Intent

ADR body files are canonical decision bodies and must be validated with a focused requirement that future validator code can reference directly.

The broader document-format requirement `MR-0001REQ-0014` defines canonical ADR and Requirement body validation. This requirement narrows the ADR-body portion into a small, implementable validator obligation.

## Requirement

The project model must provide a deterministic ADR body format validator.

The validator must check governed ADR Markdown bodies against the applicable body-format profile declared in `docs/reference/project-model/registers/body-formats.registry.yml`.

## Scope

This requirement applies to ADR body validation for records declared in governed ADR decision registries.

It does not implement Requirement body validation, Requirement registry validation, append-first governance checks, graph view generation, RTM generation, LLM guide generation, or runner aggregation.

## Rules

- The ADR body validator must resolve ADR records from governed decision registries.
- The ADR body validator must verify that each ADR record has an existing `body_path`.
- The ADR body validator must validate ADR body H1 headings against the applicable body-format profile.
- The ADR body validator must validate required sections and required section order using the governed body-format registry.
- The ADR body validator must detect extra sections when the applicable body-format profile disallows them.
- The ADR body validator must use the shared Markdown body parser rather than duplicating Markdown section extraction.
- The ADR body validator must not hardcode ADR section policy outside the governed body-format registry.
- The ADR body validator must emit deterministic diagnostics suitable for a gate.
- Future source files implementing this validator must declare this requirement in JSDoc or equivalent governed source metadata.

## Acceptance Criteria

```gherkin
Scenario: ADR body validator checks governed ADR bodies
  Given governed ADR records with body paths
  And a valid ADR body-format profile
  When the ADR body format validator runs
  Then each ADR body starts with a compliant H1
  And each ADR body contains the required sections
  And each ADR body respects the required section order
  And extra sections are rejected when the profile disallows them
  And diagnostics are deterministic when validation fails
```

## Verification Expectation

A future deterministic gate must run the ADR body format validator and fail when governed ADR body files do not match the applicable body-format profile.
