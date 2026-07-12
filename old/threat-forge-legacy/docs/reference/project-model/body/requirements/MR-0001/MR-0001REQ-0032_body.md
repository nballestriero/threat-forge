# MR-0001REQ-0032 — Controlled Taxonomy Value Metadata Model

## Intent

Future project-model and threat-analysis taxonomies must use a predictable metadata shape before they are consumed by UI, APIs, reports, validators or methodology overlays.

## Requirement

The project model must define a governed taxonomy value metadata model for controlled taxonomy registries.

At minimum, a governed taxonomy value must provide a stable identifier, a human-readable display label or name, and a description. Taxonomy values may also include an operational function and optional structured metadata for UI and security-analysis hints.

## Scope

This requirement applies to future controlled taxonomy registries introduced under the project model, including Base Analysis, STRIDE, STRIDE-AI, lifecycle, finding, mitigation, evidence, report and UI-facing classification taxonomies.

It does not implement a validator, API contract, UI component, graph renderer or complete Base Analysis taxonomy.

## Rules

- A taxonomy value must have a stable machine-readable identifier.
- A taxonomy value must have a human-readable label or name.
- A taxonomy value must have a description.
- A taxonomy value may include a function when it controls behavior, validation, reporting, lifecycle or analysis semantics.
- Additional metadata must not obscure the semantic meaning of the value.
- Future validators must fail closed when required taxonomy metadata is missing after the validator is introduced.

## Acceptance Criteria

```gherkin
Scenario: Taxonomy value contains required metadata
  Given a future taxonomy registry defines a controlled value
  When the value is reviewed
  Then the value has a stable identifier
  And the value has a display label or name
  And the value has a description explaining meaning and intended use
```

## Verification Expectation

A future taxonomy metadata validator must verify required fields before taxonomy records are consumed by reports, UI, APIs or analysis workflows.
