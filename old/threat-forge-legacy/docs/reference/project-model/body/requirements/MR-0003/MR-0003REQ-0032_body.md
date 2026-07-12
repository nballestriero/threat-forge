# MR-0003REQ-0032 — Platform Operational Management Ownership Boundary

## Intent

Threat-forge must keep the parent-platform and child-project responsibility boundary explicit before adding full child-project validation, taxonomy extension checks, analysis write-back or governed child-project repository operations.

## Requirement

The platform must own child-project registration, repository/location metadata, lifecycle state, latest checks, gate results, violations, cross-project reports, orchestration state and platform policy/capability/RBAC data.

## Scope

This requirement applies to future managed child-project registration, validation, taxonomy handling, analysis workflows, reporting and UI surfaces.

It does not implement schema changes, validators, frontend rendering, gate orchestration, analysis write-back, repository mutation or governed child-project commit/push in this micropasso.

## Rules

- Operational child-project state must be stored behind the child-project management storage port.
- Operational state may cache or summarize canonical child-project content but must identify the child project as the canonical source.
- UI views must distinguish operational status from canonical Project Model content.
- Future database adapters must preserve the same ownership boundary.

## Acceptance Criteria

```gherkin
Scenario: Platform Operational Management Ownership Boundary
  Given a child project is managed by threat-forge
  When threat-forge reads, validates, reports on or prepares changes for that child project
  Then the platform applies this responsibility boundary
  And canonical child-project content remains distinct from platform operational state
```

## Verification Expectation

Future validators, API tests and UI tests must verify this boundary when child-project profiles, taxonomy extension checks, analysis workflows or write-back operations are implemented.
