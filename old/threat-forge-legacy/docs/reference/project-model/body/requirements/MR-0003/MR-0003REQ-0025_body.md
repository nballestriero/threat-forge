# MR-0003REQ-0025 — Child Project Operational State Read Model

## Intent

The Governance Console needs to show child-project lifecycle state without treating mutable status as canonical Project Model documentation.

## Requirement

The system must define an operational read model for managed child projects that summarizes registration data, repository location, latest validated head, gate status, violations and lifecycle readiness derived from child-project checks.

## Scope

This requirement applies to future backend read use cases and UI data contracts for the platform Child Projects area.

It does not implement the API or UI in this micropasso.

## Rules

- The read model must distinguish stable managed-project configuration from derived check status.
- Latest lifecycle status must be derived from validation/check evidence, not manually edited as canonical truth.
- Gate results must identify gate name, status, summary and blocking/non-blocking nature.
- Violations must identify severity, code, optional path and message.
- The read model must support future UI columns for skeleton, Project Model validity, document-first readiness, code traceability, threat-analysis readiness and overall status.
- The read model must not duplicate child-project ADR, requirement, graph, body or taxonomy records.

## Acceptance Criteria

```gherkin
Scenario: UI reads child-project lifecycle state
  Given threat-forge manages a child project
  And the latest child-project checks have produced gate results
  When the Governance Console requests the child-project list
  Then the backend returns a read model with registration data and latest lifecycle status
  And canonical ADR/REQ/graph records remain in the child repository Project Model
```

## Verification Expectation

A future backend test must prove that lifecycle summaries are computed from persisted check runs and gate results while canonical Project Model records remain external to the operational store.
