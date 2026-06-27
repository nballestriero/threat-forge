# MR-0003REQ-0036 — Managed Child Project Governance Profile Boundary

## Intent

Threat-forge must keep the parent-platform and child-project responsibility boundary explicit before adding full child-project validation, taxonomy extension checks, analysis write-back or governed child-project repository operations.

## Requirement

The platform must define explicit governance profiles for managed child projects so each gate is classified as mandatory, optional, warning-only or not applicable for a project type.

## Scope

This requirement applies to future managed child-project registration, validation, taxonomy handling, analysis workflows, reporting and UI surfaces.

It does not implement schema changes, validators, frontend rendering, gate orchestration, analysis write-back, repository mutation or governed child-project commit/push in this micropasso.

## Rules

- A child-project profile must state which platform validators are delegated to the child project.
- The profile must distinguish universal Project Model gates from code, OpenAPI, frontend, runtime, repository-operation or methodology-specific gates.
- Check execution must record real gate results rather than a synthetic pass when a managed profile is used.
- UI and reports must show which gates were run, skipped, warned or not applicable under the selected profile.

## Acceptance Criteria

```gherkin
Scenario: Managed Child Project Governance Profile Boundary
  Given a child project is managed by threat-forge
  When threat-forge reads, validates, reports on or prepares changes for that child project
  Then the platform applies this responsibility boundary
  And canonical child-project content remains distinct from platform operational state
```

## Verification Expectation

Future validators, API tests and UI tests must verify this boundary when child-project profiles, taxonomy extension checks, analysis workflows or write-back operations are implemented.
