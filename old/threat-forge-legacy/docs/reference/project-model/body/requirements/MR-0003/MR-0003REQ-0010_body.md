# MR-0003REQ-0010 — Child Project Standard Project Model Source Declaration

## Intent

Threat-forge must know which child-project files are canonical documentation sources without inventing a child-project-specific manifest or guessing from arbitrary repository contents.

## Requirement

The system must require each governed child project to expose analyzable documentation through the same standard Project Model structure used by threat-forge itself.

## Scope

This requirement applies to child-project documentation source declaration.

It does not implement a custom document-source manifest, parser, validator, or repository adapter in this micropasso.

## Rules

- The child project must use `docs/reference/project-model/` as its canonical Project Model root unless a future governed ADR defines an explicit exception.
- Canonical child-project documentation must be represented through standard governed registries, governed body files, graph records, body-format profiles, and controlled taxonomy registries.
- The child project must reuse the same registry models, ADR body profile, requirement body profiles, graph node types, SPO predicates, and taxonomy metadata model used by threat-forge.
- Free-form guides, tutorials, explanations, README files, generated artifacts, and temporary notes must not become canonical requirement, ADR, graph, or taxonomy sources.
- Threat-forge must not treat arbitrary files as canonical governed documentation sources.
- Future child-project source validation must check the standard Project Model roots rather than a separate custom manifest format.

## Acceptance Criteria

```gherkin
Scenario: Child project exposes standard Project Model sources
  Given a governed child project repository
  When threat-forge validates its documentation sources
  Then the child project exposes canonical sources through the standard Project Model structure
  And no separate child-project-specific document-source manifest is required
```

## Verification Expectation

A future standard Project Model skeleton/source validator must fail when a child project lacks required governed registries, body files, graph records, body-format declarations, taxonomy declarations, or canonical Project Model roots.
