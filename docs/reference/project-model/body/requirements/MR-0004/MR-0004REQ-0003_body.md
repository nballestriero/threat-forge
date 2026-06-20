# MR-0004REQ-0003 — Base DFD and entity aggregation requirement

## Intent

The Base Threat Analysis must support DFD-style views and governed aggregation levels over the canonical inventory.

## Requirement

A DFD view may show Actors, Components, Data Resources, Boundaries, and Data Flows at different abstraction levels. Aggregation may group lower-level elements into product, feature, API boundary, service, adapter, runtime-service, project, or child-project views.

Aggregated views must be projections over the same canonical inventory. They must not create parallel, contradictory asset lists. Users must be able to move from a high-level DFD view to more detailed elements when the underlying data exists.


## Scope

This requirement applies to the Base Threat Analysis model under `MR-0004`.

It does not implement runtime analysis, DFD rendering, STRIDE, STRIDE-AI, OpenAPI contracts, graph schema changes, or specialized security requirement generation.

## Rules

- The base model must support DFD-style representation using the canonical base elements.
- The base model must support aggregation without duplicating or contradicting canonical inventory entries.
- Aggregation levels must be explainable and traceable to underlying elements.
- The model must support both non-technical overview views and detailed security-review views.

## Acceptance Criteria

```gherkin
Scenario: User switches from overview DFD to detailed DFD
  Given the base analysis contains frontend, backend, project-model service, adapter, registry, boundary, and data-flow elements
  When a user opens a high-level DFD view
  Then the system can show an aggregated Project Model Explorer flow
  When the user expands the backend portion
  Then the system can show lower-level service, port, adapter, data-resource, boundary, and flow elements from the same canonical inventory

```

## Verification Expectation

Future Base Threat Analysis, graph, DFD, and overlay gates must be able to verify this requirement before runtime implementation depends on it.
