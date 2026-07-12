# MR-0003REQ-0055 — Gate Registry Contract

## Intent

The platform must define a governed contract for gate registry records so each gate declares applicability, target scope, validation surface, implementation link and non-execution behavior before it is used by child-project orchestration.

## Requirement

The platform must define a governed contract for gate registry records so each gate declares applicability, target scope, validation surface, implementation link and non-execution behavior before it is used by child-project orchestration.

## Scope

This requirement applies to future child-project governance registry contracts, gate orchestration, profile catalogs, validation surfaces, execution-plan reporting and Project Documentation Explorer visibility.

It does not implement registry files, schemas, validators, detectors, UI changes, method-specific analysis gates, child-project repository mutation or final enforcement matrices in this micropasso.

## Rules

- Gate records must have stable identifiers and human-readable labels.
- Gate records must declare target scopes and applicability classes.
- Gate records must declare required or enabling capabilities when not always required.
- Gate records must declare validation surfaces inside threat-forge before child-project enforcement.
- Implemented gates must link to implementation artifacts or verification artifacts when available.

## Acceptance Criteria

```gherkin
Scenario: Gate Registry Contract
  Given a managed child project or threat-forge platform capability is evaluated by future governance profile orchestration
  When the platform applies the gate registry contract
  Then the platform records the required registry semantics
  And gate applicability remains explainable through profile, capability, validation-surface and evidence metadata
```

## Verification Expectation

Future registry schema checks, registry validators, execution-plan preview tests, demo child-project self-tests and Project Documentation Explorer rendering tests must verify this requirement when child-project governance registries are implemented.
