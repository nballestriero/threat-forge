# MR-0003REQ-0040 — Mandatory Child Project Threat Analysis Lifecycle Presence

## Intent

Threat-forge must establish the mandatory governance baseline for every managed child project before defining language-specific, runtime-specific or methodology-specific gate profiles.

## Requirement

The platform must require every managed child project to expose Threat Analysis lifecycle presence as part of its governed Project Model or equivalent governed child-project content.

## Scope

This requirement applies to future child-project onboarding, validation, profile selection, operational state reporting, UI status and gate orchestration.

It does not implement new validators, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Threat Analysis must be mandatory for every managed child project regardless of project language, stack or current implementation stage.
- The child project must declare that Threat Analysis is required and expose a current lifecycle status.
- Allowed lifecycle states must distinguish at least missing, planned, draft, approved, stale, blocked and not applicable method-specific cases once taxonomy support is defined.
- A child project with no Threat Analysis lifecycle presence must not be considered fully compliant.

## Acceptance Criteria

```gherkin
Scenario: Mandatory Child Project Threat Analysis Lifecycle Presence
  Given a child project is managed by threat-forge
  When the platform evaluates mandatory baseline compliance
  Then the platform applies this requirement
  And capability-specific gates do not bypass the baseline
```

## Verification Expectation

Future child-project baseline validators, profile orchestration tests and UI status tests must verify this requirement when managed child-project gate execution is implemented.
