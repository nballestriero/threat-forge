# MR-0003REQ-0061 — Study-Oriented Governance Concept Explanation Contract

## Intent

Child-project governance concepts must be understandable to users who are studying threat analysis and governance, not only to developers reading registry YAML or source code.

## Requirement

The platform must define a study-oriented explanation contract for visible governance-plan concepts so Governance Console and documentation-explorer surfaces can explain what each concept means, why it matters and where it comes from.

## Scope

This requirement applies to governance profiles, target scopes, gate ids, applicability classes, execution statuses, reasons, evidence, required capabilities, validation surfaces and related governed registry records exposed through future read-only UI/API view-models.

It does not implement frontend behavior, backend endpoints, registry schema changes, gate execution, child-project mutation, Base Analysis runtime/storage, STRIDE or STRIDE-AI in this micropasso.

## Rules

- Each visible governance concept must have a stable id, display label and human explanation.
- Each visible governance concept must explain its purpose, meaning and intended use.
- Each visible governance concept must identify its governed source record or source artifact.
- Each visible governance concept must explain how it affects gate planning, gate interpretation or threat-analysis readiness.
- Explanations must be suitable for read-only UI rendering as inline help, expandable panels, guide sections or detail views.
- Explanations must not depend on users opening raw YAML, implementation files or generated JSON artifacts.
- Future UI copy must prefer governed explanation data over hardcoded duplicate descriptions in React components.

## Acceptance Criteria

```gherkin
Scenario: A visible governance concept is explainable
  Given a user views a governance gate plan
  And the plan contains a profile, target scope, gate id, applicability class, execution status, reason, evidence, capability or validation surface value
  When the user requests an explanation for that value
  Then the platform can provide a label, purpose, meaning, source record and usage explanation
  And the explanation is understandable without reading raw registry YAML

Scenario: Explanation data remains governed
  Given an explanation is shown in a future UI or API response
  When the explanation describes a governed concept
  Then the explanation is sourced from governed records or deterministic artifacts
  And it is not only hardcoded inside a frontend component
```

## Verification Expectation

Future backend view-model tests, Governance Console UI tests, registry-detail tests and Project Documentation Explorer rendering tests must verify that visible governance-plan concepts expose study-oriented explanations from governed sources.
