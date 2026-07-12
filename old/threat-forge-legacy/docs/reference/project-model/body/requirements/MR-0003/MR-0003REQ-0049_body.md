# MR-0003REQ-0049 — Gate Applicability Class Model

## Intent

Threat-forge must classify every governance gate before it is executed or skipped.

## Requirement

The platform must define gate applicability classes including always-required, capability-required, declared-if-present, planned-until-method-available, platform-self-required, platform-only, child-project-required, demo-required, not-applicable-with-evidence and unsupported-with-warning semantics.

## Scope

This requirement applies to future child-project governance profile catalogs, gate orchestration, operational state reporting, UI status, demo child-project validation and platform self-governance checks.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Every governed gate must have an applicability class.
- Applicability classes must distinguish mandatory gates from capability-driven gates.
- Applicability classes must distinguish platform-only gates from child-project gates.
- Future method gates may be planned until their implementation is available.

## Acceptance Criteria

```gherkin
Scenario: Gate Applicability Class Model
  Given a child project or platform capability is governed by threat-forge
  When the platform evaluates gate applicability class model
  Then the platform applies this requirement
  And gate applicability does not bypass the mandatory child-project governance baseline
```

## Verification Expectation

Future governance profile orchestration tests, gate registry checks, demo child-project self-tests and UI status tests must verify this requirement when provisional gate applicability execution is implemented.
