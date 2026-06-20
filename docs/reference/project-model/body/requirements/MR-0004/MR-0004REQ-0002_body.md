# MR-0004REQ-0002 — Explicit boundary modeling requirement

## Intent

The Base Threat Analysis must model boundaries explicitly as canonical elements.

## Requirement

A boundary represents a meaningful separation between contexts, responsibilities, projects, runtimes, trust levels, validation scopes, data ownership zones, network zones, execution environments, or analysis workspaces.

A data flow may cross one or more boundaries. Boundary crossing must be representable in the base model so that later overlays can reason about trust changes, validation obligations, authorization needs, information disclosure, tampering risk, cross-project leakage, AI/RAG isolation, or other methodology-specific concerns.


## Scope

This requirement applies to the Base Threat Analysis model under `MR-0004`.

It does not implement runtime analysis, DFD rendering, STRIDE, STRIDE-AI, OpenAPI contracts, graph schema changes, or specialized security requirement generation.

## Rules

- Boundary must be a first-class base element, not only a property on a Data Flow.
- A Data Flow must be able to reference the Boundary elements it crosses.
- Boundary elements must be linkable to requirements, ADR, components, data resources, and future overlay classifications.
- Boundary modeling must support browser/backend, backend/filesystem, threat-forge/child-project, backend/model-server, backend/vector-store, project/project, and trusted/untrusted examples.

## Acceptance Criteria

```gherkin
Scenario: Data flow crosses an explicit boundary
  Given a browser sends an entity-detail request to the backend
  And the analysis contains a BrowserBackendBoundary element
  When the base DFD is created
  Then the request is represented as a Data Flow
  And the Data Flow references BrowserBackendBoundary as a crossed Boundary
  And STRIDE can later classify the boundary without creating a new canonical boundary

```

## Verification Expectation

Future Base Threat Analysis, graph, DFD, and overlay gates must be able to verify this requirement before runtime implementation depends on it.
