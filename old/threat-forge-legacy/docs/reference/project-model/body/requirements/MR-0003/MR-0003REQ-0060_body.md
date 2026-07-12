# MR-0003REQ-0060 — Non-Applicability and Unsupported Evidence Contract

## Intent

The platform must define an evidence contract for not-applicable and unsupported gate outcomes so skipped or unavailable checks remain visible, explainable and auditable.

## Requirement

The platform must define an evidence contract for not-applicable and unsupported gate outcomes so skipped or unavailable checks remain visible, explainable and auditable.

## Scope

This requirement applies to future child-project governance registry contracts, gate orchestration, profile catalogs, validation surfaces, execution-plan reporting and Project Documentation Explorer visibility.

It does not implement registry files, schemas, validators, detectors, UI changes, method-specific analysis gates, child-project repository mutation or final enforcement matrices in this micropasso.

## Rules

- Not-applicable outcomes must include the capability/profile condition that made the gate non-applicable.
- Unsupported outcomes must include the detected capability or adapter gap.
- Planned outcomes must identify the missing method, adapter or implementation milestone when known.
- Skipped gates must remain in the execution plan and report.
- Evidence records must be traceable to declared project state, detection evidence or registry metadata.

## Acceptance Criteria

```gherkin
Scenario: Non-Applicability and Unsupported Evidence Contract
  Given a managed child project or threat-forge platform capability is evaluated by future governance profile orchestration
  When the platform applies the non-applicability and unsupported evidence contract
  Then the platform records the required registry semantics
  And gate applicability remains explainable through profile, capability, validation-surface and evidence metadata
```

## Verification Expectation

Future registry schema checks, registry validators, execution-plan preview tests, demo child-project self-tests and Project Documentation Explorer rendering tests must verify this requirement when child-project governance registries are implemented.
