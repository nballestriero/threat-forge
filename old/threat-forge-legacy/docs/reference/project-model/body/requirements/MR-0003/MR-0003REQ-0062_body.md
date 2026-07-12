# MR-0003REQ-0062 — Governance Gate Selection Rationale Contract

## Intent

A governance gate plan must explain not only which gates appear, but why each gate was selected, deferred, skipped, unsupported or marked not applicable for a specific project/profile/target scope.

## Requirement

The platform must preserve and expose gate-selection rationale separately from gate execution outcome so users can understand the reason each gate appears in a governance plan before any final executor or orchestrator is implemented.

## Scope

This requirement applies to child-project governance gate planning artifacts, future read-only API/view-model responses, Governance Console gate detail rendering and future execution-result reporting.

It does not implement a final executor, gate orchestration, mutable child-project operations, Base Analysis runtime/storage, STRIDE, STRIDE-AI or new enforcement behavior in this micropasso.

## Rules

- Each planned gate item must preserve a user-facing selection rationale.
- Selection rationale must be distinct from pass/fail/warning execution outcome.
- Selection rationale must identify the relevant profile, target scope, applicability class and planning rule when available.
- Selection rationale must explain whether the gate was selected by mandatory baseline, profile composition, target scope, capability requirement, validation-surface maturity or future analysis-method readiness.
- Not-applicable and unsupported gates must still expose rationale, evidence and affected concepts.
- Future execution results must not overwrite the original reason why a gate was selected or skipped.
- Rationale text and structured rationale fields must be suitable for read-only UI explanation panels and generated reports.

## Acceptance Criteria

```gherkin
Scenario: A selected gate explains why it appears
  Given a governance gate plan contains a gate for a project
  When a user opens the gate explanation
  Then the platform shows why the gate was selected for that profile and target scope
  And the explanation identifies the relevant applicability class, capability or baseline rule when applicable

Scenario: Skipped gates remain explainable
  Given a governance gate is not applicable or unsupported
  When the gate appears in a governance plan or future report
  Then the platform preserves the reason and evidence for that status
  And the user can distinguish non-applicability from failure
```

## Verification Expectation

Future planner tests, artifact export tests, API view-model tests and Governance Console UI tests must verify that every gate item exposes selection rationale separately from execution status and result evidence.
