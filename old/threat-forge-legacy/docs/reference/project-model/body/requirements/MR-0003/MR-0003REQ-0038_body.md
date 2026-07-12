# MR-0003REQ-0038 — Mandatory Child Project Decision-to-Artifact Traceability Baseline

## Intent

Threat-forge must establish the mandatory governance baseline for every managed child project before defining language-specific, runtime-specific or methodology-specific gate profiles.

## Requirement

The platform must require child projects with implementation artifacts to maintain traceability from governed decisions and requirements to those artifacts and their verification evidence.

## Scope

This requirement applies to future child-project onboarding, validation, profile selection, operational state reporting, UI status and gate orchestration.

It does not implement new validators, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- When code, scripts, API handlers, frontend components, pipelines, prompts, agent tools, deployment descriptors or other implementation artifacts exist, they must be represented as traceable implementation artifacts.
- The expected traceability chain is MR to ADR to Requirement to implementation artifact to verification evidence.
- Capability-specific gates may specialize how artifacts are detected for each language or ecosystem, but they must not remove the traceability obligation.
- Untraceable implementation artifacts must be reported as violations once artifact detection is applicable.

## Acceptance Criteria

```gherkin
Scenario: Mandatory Child Project Decision-to-Artifact Traceability Baseline
  Given a child project is managed by threat-forge
  When the platform evaluates mandatory baseline compliance
  Then the platform applies this requirement
  And capability-specific gates do not bypass the baseline
```

## Verification Expectation

Future child-project baseline validators, profile orchestration tests and UI status tests must verify this requirement when managed child-project gate execution is implemented.
