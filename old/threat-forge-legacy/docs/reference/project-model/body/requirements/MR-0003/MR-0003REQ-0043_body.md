# MR-0003REQ-0043 — Child Project Archetype Classification Model

## Intent

Threat-forge must classify managed child projects with user-facing archetypes without turning those archetypes into rigid final gate classes.

## Requirement

The platform must define a provisional child-project archetype vocabulary that helps operators and UI views understand the project shape while preserving capability-based enforcement.

## Scope

This requirement applies to future child-project onboarding, validation, operational state reporting, UI status and gate orchestration.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Archetypes must be documentation and UI defaults, not the source of final gate enforcement.
- A child project may match multiple archetypes.
- A mixed/custom fallback must exist for projects that do not fit a predefined archetype.
- Future profile selection must depend on capability facets and the mandatory baseline.

## Acceptance Criteria

```gherkin
Scenario: Child Project Archetype Classification Model
  Given a child project is managed by threat-forge
  When the platform evaluates child-project archetypes and capabilities
  Then the platform applies this requirement
  And capability-specific governance does not bypass the mandatory baseline
```

## Verification Expectation

Future child-project capability detectors, governance profile orchestration tests and UI status tests must verify this requirement when capability-based child-project gate execution is implemented.
