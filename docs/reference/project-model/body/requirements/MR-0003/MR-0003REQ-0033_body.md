# MR-0003REQ-0033 — Child Project Governed Taxonomy Reuse and Extension Boundary

## Intent

Threat-forge must keep the parent-platform and child-project responsibility boundary explicit before adding full child-project validation, taxonomy extension checks, analysis write-back or governed child-project repository operations.

## Requirement

The platform must allow child projects to reuse platform taxonomies and declare authorized domain-specific taxonomy extensions only through governed namespace, description, usage and optional platform mapping rules.

## Scope

This requirement applies to future managed child-project registration, validation, taxonomy handling, analysis workflows, reporting and UI surfaces.

It does not implement schema changes, validators, frontend rendering, gate orchestration, analysis write-back, repository mutation or governed child-project commit/push in this micropasso.

## Rules

- Platform taxonomies define shared language used by governance, UI, reporting and methodology overlays.
- Child-project taxonomy extensions must use explicit namespaces that avoid collisions with platform taxonomy identifiers.
- Child-project taxonomy values must include descriptions and intended-use metadata before they are used by UI, validators or analysis workflows.
- Extensions that participate in cross-project analysis must map to a platform/base taxonomy value when a common aggregation semantic is required.

## Acceptance Criteria

```gherkin
Scenario: Child Project Governed Taxonomy Reuse and Extension Boundary
  Given a child project is managed by threat-forge
  When threat-forge reads, validates, reports on or prepares changes for that child project
  Then the platform applies this responsibility boundary
  And canonical child-project content remains distinct from platform operational state
```

## Verification Expectation

Future validators, API tests and UI tests must verify this boundary when child-project profiles, taxonomy extension checks, analysis workflows or write-back operations are implemented.
