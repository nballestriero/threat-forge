# MR-0003REQ-0051 — Child Project Gate Validation Surface Requirement

## Intent

Child-project gates must be testable inside threat-forge before they govern external repositories.

## Requirement

Every child-project governance gate must declare at least one validation surface inside threat-forge, such as a demo child project, temporary workspace self-test, positive fixture, negative fixture, contract test or runtime test.

## Scope

This requirement applies to future child-project governance profile catalogs, gate orchestration, operational state reporting, UI status, demo child-project validation and platform self-governance checks.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- No child-project gate may be considered implemented without a validation surface.
- Demo and fixture coverage must exist before a child-specific gate governs external child projects.
- Validation surfaces must be visible in gate documentation or registry metadata.
- Child-project validation surfaces must avoid mutating external repositories during self-tests.

## Acceptance Criteria

```gherkin
Scenario: Child Project Gate Validation Surface Requirement
  Given a child project or platform capability is governed by threat-forge
  When the platform evaluates child project gate validation surface requirement
  Then the platform applies this requirement
  And gate applicability does not bypass the mandatory child-project governance baseline
```

## Verification Expectation

Future governance profile orchestration tests, gate registry checks, demo child-project self-tests and UI status tests must verify this requirement when provisional gate applicability execution is implemented.
