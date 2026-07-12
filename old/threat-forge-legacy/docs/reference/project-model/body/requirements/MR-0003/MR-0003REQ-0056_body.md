# MR-0003REQ-0056 — Governance Profile Registry Contract

## Intent

The platform must define a governed contract for profile registry records so child-project governance profiles compose the mandatory baseline, capability facets, applicability classes and provisional method availability without hardcoding final enforcement logic.

## Requirement

The platform must define a governed contract for profile registry records so child-project governance profiles compose the mandatory baseline, capability facets, applicability classes and provisional method availability without hardcoding final enforcement logic.

## Scope

This requirement applies to future child-project governance registry contracts, gate orchestration, profile catalogs, validation surfaces, execution-plan reporting and Project Documentation Explorer visibility.

It does not implement registry files, schemas, validators, detectors, UI changes, method-specific analysis gates, child-project repository mutation or final enforcement matrices in this micropasso.

## Rules

- Profile records must declare target scope and baseline inclusion.
- Profile records must identify required, optional, not-present or unsupported capabilities where applicable.
- Profile records must reference gate ids or gate sets rather than duplicating gate definitions.
- Profile records must allow provisional, planned and method-pending gates.
- Profiles must not remove the mandatory child-project governance baseline.

## Acceptance Criteria

```gherkin
Scenario: Governance Profile Registry Contract
  Given a managed child project or threat-forge platform capability is evaluated by future governance profile orchestration
  When the platform applies the governance profile registry contract
  Then the platform records the required registry semantics
  And gate applicability remains explainable through profile, capability, validation-surface and evidence metadata
```

## Verification Expectation

Future registry schema checks, registry validators, execution-plan preview tests, demo child-project self-tests and Project Documentation Explorer rendering tests must verify this requirement when child-project governance registries are implemented.
