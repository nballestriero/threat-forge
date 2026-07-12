# MR-0003REQ-0037 — Mandatory Child Project Doc-as-Code Baseline

## Intent

Threat-forge must establish the mandatory governance baseline for every managed child project before defining language-specific, runtime-specific or methodology-specific gate profiles.

## Requirement

The platform must require every managed child project to expose a governed Project Model as the canonical Doc-as-Code source before applying capability-specific governance profiles.

## Scope

This requirement applies to future child-project onboarding, validation, profile selection, operational state reporting, UI status and gate orchestration.

It does not implement new validators, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Every managed child project must have a canonical Project Model under its own repository or workspace.
- The baseline Project Model must include MR, ADR, Requirement, graph, governed body, taxonomy and working plan structures according to the standard child-project skeleton.
- Platform operational storage may index or summarize child-project Project Model records but must not replace them.
- Projects without this baseline must remain ungoverned, onboarding, draft or non-compliant rather than fully managed.

## Acceptance Criteria

```gherkin
Scenario: Mandatory Child Project Doc-as-Code Baseline
  Given a child project is managed by threat-forge
  When the platform evaluates mandatory baseline compliance
  Then the platform applies this requirement
  And capability-specific gates do not bypass the baseline
```

## Verification Expectation

Future child-project baseline validators, profile orchestration tests and UI status tests must verify this requirement when managed child-project gate execution is implemented.
