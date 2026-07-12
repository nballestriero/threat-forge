# MR-0003REQ-0042 — Capability-Specific Gates Extend Mandatory Baseline

## Intent

Threat-forge must establish the mandatory governance baseline for every managed child project before defining language-specific, runtime-specific or methodology-specific gate profiles.

## Requirement

The platform must treat language, runtime, API, frontend, data, AI, deployment and CI/CD gates as extensions of the mandatory baseline rather than replacements for it.

## Scope

This requirement applies to future child-project onboarding, validation, profile selection, operational state reporting, UI status and gate orchestration.

It does not implement new validators, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Capability-specific profiles may add mandatory, optional, warning-only or not-applicable gates.
- Capability-specific profiles must never remove the Doc-as-Code, traceability semantics or Threat Analysis lifecycle baseline.
- Gate results must report applicability and reasons, not only pass or fail.
- Governance profiles must remain provisional while Base Analysis, STRIDE, STRIDE-AI and future methodologies are being implemented.

## Acceptance Criteria

```gherkin
Scenario: Capability-Specific Gates Extend Mandatory Baseline
  Given a child project is managed by threat-forge
  When the platform evaluates mandatory baseline compliance
  Then the platform applies this requirement
  And capability-specific gates do not bypass the baseline
```

## Verification Expectation

Future child-project baseline validators, profile orchestration tests and UI status tests must verify this requirement when managed child-project gate execution is implemented.
