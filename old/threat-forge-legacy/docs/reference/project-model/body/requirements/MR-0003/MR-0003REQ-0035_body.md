# MR-0003REQ-0035 — Draft Candidate and Approved Analysis Artifact Ownership Boundary

## Intent

Threat-forge must keep the parent-platform and child-project responsibility boundary explicit before adding full child-project validation, taxonomy extension checks, analysis write-back or governed child-project repository operations.

## Requirement

The platform must keep draft, candidate and review-state analysis artifacts in operational storage until approval, then write approved analysis artifacts into the child project as governed canonical content.

## Scope

This requirement applies to future managed child-project registration, validation, taxonomy handling, analysis workflows, reporting and UI surfaces.

It does not implement schema changes, validators, frontend rendering, gate orchestration, analysis write-back, repository mutation or governed child-project commit/push in this micropasso.

## Rules

- Draft analysis outputs may live in platform storage while they are generated, compared, scored, reviewed or rejected.
- Approved Base Analysis, STRIDE, STRIDE-AI, finding or mitigation artifacts that describe a child system must become governed child-project Project Model content.
- Approved write-back must preserve traceability to requirements, decisions, taxonomy values, evidence and graph records.
- Rejected or superseded candidate artifacts must not be silently promoted to canonical child-project documentation.

## Acceptance Criteria

```gherkin
Scenario: Draft Candidate and Approved Analysis Artifact Ownership Boundary
  Given a child project is managed by threat-forge
  When threat-forge reads, validates, reports on or prepares changes for that child project
  Then the platform applies this responsibility boundary
  And canonical child-project content remains distinct from platform operational state
```

## Verification Expectation

Future validators, API tests and UI tests must verify this boundary when child-project profiles, taxonomy extension checks, analysis workflows or write-back operations are implemented.
