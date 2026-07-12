# MR-0003REQ-0048 — Capability-Specific Analysis Method Planning Boundary

## Intent

Threat-forge must decide analysis method applicability from project capabilities without requiring unfinished methods to pass prematurely.

## Requirement

The platform must define provisional rules for mapping child-project capabilities to Base Analysis, STRIDE, STRIDE-AI and future analysis methods while allowing unsupported methods to be reported as planned or pending.

## Scope

This requirement applies to future child-project onboarding, validation, operational state reporting, UI status and gate orchestration.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Base Analysis must remain the foundational lifecycle method for managed child projects.
- STRIDE applicability must be driven by security-relevant surfaces, trust boundaries, actors, data flows, APIs, deployable components, external integrations or sensitive data.
- STRIDE-AI applicability must be driven by AI, RAG, model-serving, prompt/context handling, embedding, vector-store, agentic tool-use or similar capabilities.
- Unavailable method implementations must be reported as planned, pending or unsupported rather than silently skipped.

## Acceptance Criteria

```gherkin
Scenario: Capability-Specific Analysis Method Planning Boundary
  Given a child project is managed by threat-forge
  When the platform evaluates child-project archetypes and capabilities
  Then the platform applies this requirement
  And capability-specific governance does not bypass the mandatory baseline
```

## Verification Expectation

Future child-project capability detectors, governance profile orchestration tests and UI status tests must verify this requirement when capability-based child-project gate execution is implemented.
