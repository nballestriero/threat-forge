# MR-0003REQ-0031 — Child Project Canonical Content Ownership Boundary

## Intent

Threat-forge must keep the parent-platform and child-project responsibility boundary explicit before adding full child-project validation, taxonomy extension checks, analysis write-back or governed child-project repository operations.

## Requirement

The platform must treat each child project as the canonical owner of its Project Model, MR, ADR, Requirements, graph records, governed bodies, code, local evidence, authorized taxonomy extensions and approved analysis artifacts that describe its system.

## Scope

This requirement applies to future managed child-project registration, validation, taxonomy handling, analysis workflows, reporting and UI surfaces.

It does not implement schema changes, validators, frontend rendering, gate orchestration, analysis write-back, repository mutation or governed child-project commit/push in this micropasso.

## Rules

- Child-project Project Model registries and bodies must remain canonical in the child project, not in platform operational storage.
- Threat-forge may read, index, validate, summarize or report on child-project canonical content.
- Threat-forge must not make SQLite or another platform database the canonical source for child-project ADR, requirements, bodies, graphs or approved analysis artifacts.
- Future write-back operations must mutate the child project through governed repository operations and traceable artifacts.

## Acceptance Criteria

```gherkin
Scenario: Child Project Canonical Content Ownership Boundary
  Given a child project is managed by threat-forge
  When threat-forge reads, validates, reports on or prepares changes for that child project
  Then the platform applies this responsibility boundary
  And canonical child-project content remains distinct from platform operational state
```

## Verification Expectation

Future validators, API tests and UI tests must verify this boundary when child-project profiles, taxonomy extension checks, analysis workflows or write-back operations are implemented.
