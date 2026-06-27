# MR-0003REQ-0034 — Taxonomy Value Visibility and UI Handoff Boundary

## Intent

Threat-forge must keep the parent-platform and child-project responsibility boundary explicit before adding full child-project validation, taxonomy extension checks, analysis write-back or governed child-project repository operations.

## Requirement

The platform must expose taxonomy values as user-facing contracts so the UI can show accepted values, deprecated values, descriptions, usage, allowed fields, validation behavior and UI/reporting impact.

## Scope

This requirement applies to future managed child-project registration, validation, taxonomy handling, analysis workflows, reporting and UI surfaces.

It does not implement schema changes, validators, frontend rendering, gate orchestration, analysis write-back, repository mutation or governed child-project commit/push in this micropasso.

## Rules

- The frontend must not hardcode domain taxonomy values that are governed by registries.
- Project Documentation Explorer taxonomy details must eventually render value tables rather than only taxonomy identifiers or counts.
- UI selection controls must be driven by taxonomy view-models derived from governed platform and child-project registries.
- Deprecated, superseded or read-only values must be visible with their usage constraints.

## Acceptance Criteria

```gherkin
Scenario: Taxonomy Value Visibility and UI Handoff Boundary
  Given a child project is managed by threat-forge
  When threat-forge reads, validates, reports on or prepares changes for that child project
  Then the platform applies this responsibility boundary
  And canonical child-project content remains distinct from platform operational state
```

## Verification Expectation

Future validators, API tests and UI tests must verify this boundary when child-project profiles, taxonomy extension checks, analysis workflows or write-back operations are implemented.
