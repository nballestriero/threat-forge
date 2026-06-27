# MR-0003REQ-0047 — Provisional Governance Profile Composition Model

## Intent

Threat-forge must define governance profiles as evolvable compositions while Base Analysis, STRIDE, STRIDE-AI and other methods mature.

## Requirement

The platform must model child-project governance profiles as provisional compositions of mandatory baseline, capability facets, language ecosystem adapters and method applicability rules.

## Scope

This requirement applies to future child-project onboarding, validation, operational state reporting, UI status and gate orchestration.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Profiles must always include the mandatory child-project governance baseline.
- Profiles may add mandatory, optional, warning-only or not-applicable gates by capability.
- Profiles must remain provisional until method-specific gates are implemented and validated.
- Profiles must preserve applicability reasons for every gate.

## Acceptance Criteria

```gherkin
Scenario: Provisional Governance Profile Composition Model
  Given a child project is managed by threat-forge
  When the platform evaluates child-project archetypes and capabilities
  Then the platform applies this requirement
  And capability-specific governance does not bypass the mandatory baseline
```

## Verification Expectation

Future child-project capability detectors, governance profile orchestration tests and UI status tests must verify this requirement when capability-based child-project gate execution is implemented.
