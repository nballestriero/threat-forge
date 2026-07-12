# MR-0002REQ-0035 — Project Documentation Explorer governed filter facets

## Intent

The first readable Governance Console slice must let users filter governed documentation without forcing React components to know every possible macro requirement, status, requirement type or lifecycle value.

## Requirement

The Project Documentation Explorer must provide backend-derived filter facets for governed documentation browsing. Filter facets must expose possible values, labels, counts and selected state in a read-only view-model.

## Scope

This requirement applies to the first read-only Project Documentation Explorer backend contract, service normalization and future frontend consumption. It does not implement React components, visual styling, Base Analysis runtime, editing workflows, dynamic RBAC configuration or full OpenAPI publication.

## Rules

- Filter values must be derived from governed project-model sources or backend normalization, not hardcoded permanently in the frontend.
- The first filter facets must include macro requirement, entity kind, status, requirement type, implementation state and acceptance state.
- Implementation state must be derived from graph traceability when possible.
- Acceptance state must be normalized from governed lifecycle status fields.
- Filter facets must be returned in a frontend-safe view-model that uses governed identifiers.

## Acceptance Criteria

```gherkin
Scenario: Documentation explorer exposes governed filters
  Given governed project-model registries and graph relations exist
  When a registered user requests documentation explorer filters
  Then the backend returns available facets and possible values
  And the frontend does not need to hardcode macro requirement, status, requirement type, implementation state or acceptance state values
```

## Verification Expectation

Future backend tests must verify that the documentation explorer filter facets are derived from project-model source data and that the returned view-model validates against the runtime contract.
