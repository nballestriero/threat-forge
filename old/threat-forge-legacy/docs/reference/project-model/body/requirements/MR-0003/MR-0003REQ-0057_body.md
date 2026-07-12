# MR-0003REQ-0057 — Capability Registry Contract

## Intent

The platform must define a governed contract for capability registry records so source code, API, frontend, data, AI, RAG, agentic, deployment and operational capabilities have stable meanings for gate applicability.

## Requirement

The platform must define a governed contract for capability registry records so source code, API, frontend, data, AI, RAG, agentic, deployment and operational capabilities have stable meanings for gate applicability.

## Scope

This requirement applies to future child-project governance registry contracts, gate orchestration, profile catalogs, validation surfaces, execution-plan reporting and Project Documentation Explorer visibility.

It does not implement registry files, schemas, validators, detectors, UI changes, method-specific analysis gates, child-project repository mutation or final enforcement matrices in this micropasso.

## Rules

- Capability records must have stable ids, labels and descriptions.
- Capability records must describe declaration and detection evidence expectations.
- Capability records must support evidence states such as declared, detected, not_present, unknown and unsupported.
- Capability records must identify which gates or analysis methods they may enable.
- Capability records must remain independent from concrete language adapter implementation.

## Acceptance Criteria

```gherkin
Scenario: Capability Registry Contract
  Given a managed child project or threat-forge platform capability is evaluated by future governance profile orchestration
  When the platform applies the capability registry contract
  Then the platform records the required registry semantics
  And gate applicability remains explainable through profile, capability, validation-surface and evidence metadata
```

## Verification Expectation

Future registry schema checks, registry validators, execution-plan preview tests, demo child-project self-tests and Project Documentation Explorer rendering tests must verify this requirement when child-project governance registries are implemented.
