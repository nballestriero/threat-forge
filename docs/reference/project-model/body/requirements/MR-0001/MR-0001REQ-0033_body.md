# MR-0001REQ-0033 — Mandatory Taxonomy Value Descriptions

## Intent

Controlled taxonomy values must be self-explanatory so humans, deterministic tools and future LLM-assisted workflows do not infer unsafe meanings from terse identifiers.

## Requirement

Every governed taxonomy value must include a description that explains its meaning, intended use and governance impact when relevant.

Descriptions must be written for project maintainers and reviewers, not only for implementation code. They must clarify how a value affects reports, graph visualization, analysis readiness, lifecycle decisions, validation or security-analysis interpretation when the value is used for those purposes.

## Scope

This requirement applies to controlled taxonomy values in governed registries, including existing and future values for graph vocabulary, requirement governance, Base Analysis, STRIDE, STRIDE-AI, reporting, lifecycle, audit and UI-facing classifications.

It does not require long prose for every value, and it does not implement validation in this micropasso.

## Rules

- Taxonomy descriptions must not be empty.
- Taxonomy descriptions must explain meaning rather than merely repeating the identifier.
- Taxonomy descriptions should mention viewer/report impact when the value affects visualizations or reports.
- Taxonomy descriptions should mention security-analysis impact when the value affects Base Analysis or methodology overlays.
- Future taxonomy validators must reject values without descriptions once the validator is introduced.

## Acceptance Criteria

```gherkin
Scenario: Taxonomy value description prevents ambiguity
  Given a taxonomy contains similar values for boundary, process boundary and trust boundary
  When a reviewer compares the values
  Then each value description explains the intended distinction and use
```

## Verification Expectation

A future taxonomy metadata validator must enforce non-empty descriptions and may later add quality checks for duplicate or tautological descriptions.
