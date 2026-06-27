# MR-0003REQ-0046 — Language Ecosystem Adapter Boundary

## Intent

Threat-forge must support multiple language ecosystems without making language the primary governance classifier.

## Requirement

The platform must treat language and ecosystem adapters as selectors for concrete implementation checks after capability facets and baseline requirements have been evaluated.

## Scope

This requirement applies to future child-project onboarding, validation, operational state reporting, UI status and gate orchestration.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Language adapters must not replace capability facets.
- Language adapters may define manifests, lock files, source roots, build commands, test commands and framework hints.
- Initial adapter vocabulary may include node, python, go, rust, java, dotnet and generic_shell.
- Projects with multiple languages must be representable as multiple adapters.

## Acceptance Criteria

```gherkin
Scenario: Language Ecosystem Adapter Boundary
  Given a child project is managed by threat-forge
  When the platform evaluates child-project archetypes and capabilities
  Then the platform applies this requirement
  And capability-specific governance does not bypass the mandatory baseline
```

## Verification Expectation

Future child-project capability detectors, governance profile orchestration tests and UI status tests must verify this requirement when capability-based child-project gate execution is implemented.
