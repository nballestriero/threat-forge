# MR-0003REQ-0045 — Capability Evidence State and Confidence Semantics

## Intent

Capability classification must be explainable and auditable instead of being stored as opaque booleans.

## Requirement

The platform must represent child-project capabilities with evidence states and supporting evidence so future gate results can explain applicability decisions.

## Scope

This requirement applies to future child-project onboarding, validation, operational state reporting, UI status and gate orchestration.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Capability state must distinguish declared, detected, not_present, unknown and unsupported.
- Future checks must record evidence that supports capability classification.
- Future checks must be able to explain mismatches between declared and detected capabilities.
- Unsupported capabilities must not be treated as absent.

## Acceptance Criteria

```gherkin
Scenario: Capability Evidence State and Confidence Semantics
  Given a child project is managed by threat-forge
  When the platform evaluates child-project archetypes and capabilities
  Then the platform applies this requirement
  And capability-specific governance does not bypass the mandatory baseline
```

## Verification Expectation

Future child-project capability detectors, governance profile orchestration tests and UI status tests must verify this requirement when capability-based child-project gate execution is implemented.
