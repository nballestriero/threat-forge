# MR-0003REQ-0059 — Gate Execution Planning Result Semantics

## Intent

The platform must define execution-planning result semantics so future orchestration can report gate applicability, execution decision, status, reason and evidence before or during gate execution.

## Requirement

The platform must define execution-planning result semantics so future orchestration can report gate applicability, execution decision, status, reason and evidence before or during gate execution.

## Scope

This requirement applies to future child-project governance registry contracts, gate orchestration, profile catalogs, validation surfaces, execution-plan reporting and Project Documentation Explorer visibility.

It does not implement registry files, schemas, validators, detectors, UI changes, method-specific analysis gates, child-project repository mutation or final enforcement matrices in this micropasso.

## Rules

- Planning results must include project id, profile id, gate id and applicability class.
- Planning results must distinguish planned execution from executed status.
- Planning results must support pass, fail, warning, planned, unsupported and not_applicable states.
- Planning results must preserve reason and evidence for skipped or deferred gates.
- Planning results must be suitable for backend reporting and Project Documentation Explorer rendering.

## Acceptance Criteria

```gherkin
Scenario: Gate Execution Planning Result Semantics
  Given a managed child project or threat-forge platform capability is evaluated by future governance profile orchestration
  When the platform applies the gate execution planning result semantics
  Then the platform records the required registry semantics
  And gate applicability remains explainable through profile, capability, validation-surface and evidence metadata
```

## Verification Expectation

Future registry schema checks, registry validators, execution-plan preview tests, demo child-project self-tests and Project Documentation Explorer rendering tests must verify this requirement when child-project governance registries are implemented.
