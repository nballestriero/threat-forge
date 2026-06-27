# MR-0003REQ-0041 — Threat Analysis Method Applicability by Capability

## Intent

Threat-forge must establish the mandatory governance baseline for every managed child project before defining language-specific, runtime-specific or methodology-specific gate profiles.

## Requirement

The platform must select concrete Threat Analysis methods by child-project capabilities while keeping the Threat Analysis lifecycle baseline mandatory.

## Scope

This requirement applies to future child-project onboarding, validation, profile selection, operational state reporting, UI status and gate orchestration.

It does not implement new validators, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Base Analysis is the default foundation for future method-specific overlays.
- STRIDE must become applicable when security-relevant surfaces, actors, trust boundaries, data flows, APIs or deployable components are present.
- STRIDE-AI must become applicable when AI, RAG, model-serving, prompts, agents, vector stores, embeddings or tool-calling capabilities are present.
- Future methodologies may be added as governed extensions without weakening the baseline.

## Acceptance Criteria

```gherkin
Scenario: Threat Analysis Method Applicability by Capability
  Given a child project is managed by threat-forge
  When the platform evaluates mandatory baseline compliance
  Then the platform applies this requirement
  And capability-specific gates do not bypass the baseline
```

## Verification Expectation

Future child-project baseline validators, profile orchestration tests and UI status tests must verify this requirement when managed child-project gate execution is implemented.
