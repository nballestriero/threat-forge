# MR-0003REQ-0044 — Child Project Capability Facet Model

## Intent

Threat-forge must understand which capabilities a child project has before applying project-shape-specific gates.

## Requirement

The platform must define capability facets as the authoritative basis for additional child-project governance checks beyond the mandatory baseline.

## Scope

This requirement applies to future child-project onboarding, validation, operational state reporting, UI status and gate orchestration.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Capability facets must represent project shape independently from language.
- Capability facets must include code, API, frontend, storage, data, AI, RAG, agentic tools, deployment, CI/CD, integrations and data sensitivity dimensions.
- Capability-specific gates must extend the mandatory baseline.
- A child project may have multiple simultaneous capability facets.

## Acceptance Criteria

```gherkin
Scenario: Child Project Capability Facet Model
  Given a child project is managed by threat-forge
  When the platform evaluates child-project archetypes and capabilities
  Then the platform applies this requirement
  And capability-specific governance does not bypass the mandatory baseline
```

## Verification Expectation

Future child-project capability detectors, governance profile orchestration tests and UI status tests must verify this requirement when capability-based child-project gate execution is implemented.
