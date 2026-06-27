# MR-0003REQ-0052 — Not-Applicable and Unsupported Gate Evidence Semantics

## Intent

Skipped gates must be explainable and auditable instead of disappearing from reports.

## Requirement

The platform must require not-applicable, planned and unsupported gate states to include reason, evidence and profile or capability context.

## Scope

This requirement applies to future child-project governance profile catalogs, gate orchestration, operational state reporting, UI status, demo child-project validation and platform self-governance checks.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Not-applicable gates must include evidence explaining why the gate does not apply.
- Unsupported gates must indicate the detected capability and missing adapter or method support.
- Planned gates must indicate the future method or capability that will make them executable.
- Skipped gate states must remain reportable in operational state and UI views.

## Acceptance Criteria

```gherkin
Scenario: Not-Applicable and Unsupported Gate Evidence Semantics
  Given a child project or platform capability is governed by threat-forge
  When the platform evaluates not-applicable and unsupported gate evidence semantics
  Then the platform applies this requirement
  And gate applicability does not bypass the mandatory child-project governance baseline
```

## Verification Expectation

Future governance profile orchestration tests, gate registry checks, demo child-project self-tests and UI status tests must verify this requirement when provisional gate applicability execution is implemented.
