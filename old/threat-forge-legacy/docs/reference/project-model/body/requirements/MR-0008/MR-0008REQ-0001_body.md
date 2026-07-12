# MR-0008REQ-0001 — Threat Analysis Lifecycle Audit Event Trail

## Intent

Threat Analysis lifecycle transitions must be explainable and auditable.

## Requirement

The project must preserve audit events for Base Analysis, STRIDE, STRIDE-AI, finding, security requirement, mitigation, evidence, stale review, rebase, supersede and CI/CD policy outcome transitions.

## Scope

This requirement defines audit coverage only. It does not implement event storage, schemas or UI.

## Rules

- Lifecycle transitions must record actor or system origin.
- Transitions must reference the affected analysis/finding/evidence records.
- CI/CD policy outcomes must be auditable.
- Historical analysis versions must remain linked to their transition history.

## Acceptance Criteria

```gherkin
Scenario: Stale review decision is made
  Given a Base Analysis is marked stale_warning
  When a reviewer confirms it still applies
  Then an audit event records the reviewer, decision, evidence and affected analysis version
```

## Verification Expectation

Future audit validators must verify that lifecycle transitions have corresponding evidence-backed audit records.
