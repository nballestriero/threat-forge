# MR-0003REQ-0016 — Child Project Standard Project Model Reuse

## Intent

Child projects must be analyzable by reusing the same Project Model used by threat-forge, not by introducing a second documentation structure.

## Requirement

The system must require governed child projects to use the standard threat-forge Project Model structure for canonical documentation, decisions, requirements, graph records, body formats, and traceability records.

## Scope

This requirement applies to child-project skeleton definition and future child-project source validation.

It does not implement a skeleton generator, validator, repository adapter, UI, RBAC runtime, or threat-analysis gate in this micropasso.

## Rules

- A governed child project must contain a canonical `docs/reference/project-model/` root unless a future governed ADR defines an explicit exception.
- Child-project macro requirements, ADRs, requirements, body files, graph records, and body-format declarations must use the same models as threat-forge.
- Child-project graph records must use the governed graph node types and SPO predicate model already used by threat-forge.
- Free-form guides, tutorials, explanations, README files, generated artifacts, and temporary notes must not replace canonical project-model records.
- Future child-project validators must validate standard Project Model structure rather than a bespoke child-project documentation manifest.

## Acceptance Criteria

```gherkin
Scenario: Child project reuses the standard Project Model
  Given a governed child project repository
  When threat-forge validates the child project skeleton
  Then the repository exposes canonical documentation through the standard Project Model structure
  And no separate child-project-specific documentation model is required
```

## Verification Expectation

A future child-project skeleton/source validator must fail when a governed child project lacks the standard Project Model root, required registries, required governed bodies, graph records, body-format declarations, or traceability-compatible structures.
