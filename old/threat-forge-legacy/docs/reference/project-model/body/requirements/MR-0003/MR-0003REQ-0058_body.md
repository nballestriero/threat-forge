# MR-0003REQ-0058 — Validation Surface Registry Contract

## Intent

The platform must define a governed contract for validation surface records so every developed gate can show how it is tested inside threat-forge before governing child projects.

## Requirement

The platform must define a governed contract for validation surface records so every developed gate can show how it is tested inside threat-forge before governing child projects.

## Scope

This requirement applies to future child-project governance registry contracts, gate orchestration, profile catalogs, validation surfaces, execution-plan reporting and Project Documentation Explorer visibility.

It does not implement registry files, schemas, validators, detectors, UI changes, method-specific analysis gates, child-project repository mutation or final enforcement matrices in this micropasso.

## Rules

- Validation surface records must identify repo checks, self-tests, fixtures, snapshots, contract tests, runtime tests or demo workspaces.
- Validation surface records must describe what they prove.
- Gate records must reference validation surfaces required for their maturity level.
- Child-project gates must have at least one threat-forge-owned validation surface before enforcement.
- Platform-only gates must still be validated by platform self-governance surfaces.

## Acceptance Criteria

```gherkin
Scenario: Validation Surface Registry Contract
  Given a managed child project or threat-forge platform capability is evaluated by future governance profile orchestration
  When the platform applies the validation surface registry contract
  Then the platform records the required registry semantics
  And gate applicability remains explainable through profile, capability, validation-surface and evidence metadata
```

## Verification Expectation

Future registry schema checks, registry validators, execution-plan preview tests, demo child-project self-tests and Project Documentation Explorer rendering tests must verify this requirement when child-project governance registries are implemented.
