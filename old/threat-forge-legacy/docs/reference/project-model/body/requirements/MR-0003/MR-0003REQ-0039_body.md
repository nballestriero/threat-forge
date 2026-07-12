# MR-0003REQ-0039 — Explicit No-Code Traceability Applicability Evidence

## Intent

Threat-forge must establish the mandatory governance baseline for every managed child project before defining language-specific, runtime-specific or methodology-specific gate profiles.

## Requirement

The platform must require projects without implementation artifacts to record explicit traceability applicability evidence instead of silently skipping traceability checks.

## Scope

This requirement applies to future child-project onboarding, validation, profile selection, operational state reporting, UI status and gate orchestration.

It does not implement new validators, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- A pre-code or documentation-only child project may satisfy the traceability baseline by declaring that no implementation artifacts are currently present.
- The check result must include an applicability state and a reason such as no implementation artifacts declared.
- The absence of code must not be interpreted as a successful implementation traceability check.
- When implementation artifacts appear, the project must transition from no-code applicability evidence to artifact traceability enforcement.

## Acceptance Criteria

```gherkin
Scenario: Explicit No-Code Traceability Applicability Evidence
  Given a child project is managed by threat-forge
  When the platform evaluates mandatory baseline compliance
  Then the platform applies this requirement
  And capability-specific gates do not bypass the baseline
```

## Verification Expectation

Future child-project baseline validators, profile orchestration tests and UI status tests must verify this requirement when managed child-project gate execution is implemented.
