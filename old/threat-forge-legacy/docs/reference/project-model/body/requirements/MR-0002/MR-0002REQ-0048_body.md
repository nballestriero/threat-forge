# MR-0002REQ-0048 — Project Documentation Explorer frontend HTTP data-source boundary

## Intent

The Project Documentation Explorer frontend must be able to consume the governed HTTP API without rewriting page rendering logic or letting the browser read project-model source files directly.

## Requirement

MR-0002 must provide a frontend Project Documentation Explorer data-source boundary that separates page rendering from concrete data transport and supports both the existing generated snapshot source and the governed read-only HTTP API source.

## Scope

This requirement governs the frontend data access boundary for the Project Documentation Explorer collection, filter metadata and entity detail view-models. It does not migrate the page to HTTP, remove the generated snapshot, introduce dynamic RBAC, add mutation behavior or introduce Base Analysis runtime/storage APIs.

## Rules

- The Project Documentation Explorer page must depend on a feature-local data-source boundary rather than directly importing concrete snapshot or HTTP transport details.
- The data-source boundary must be able to load the governed documentation collection, filters and entity detail view-models.
- The generated snapshot may remain the default source until a later governed implementation switches the frontend to live HTTP.
- Any HTTP-backed source must consume only the governed Project Documentation Explorer read-only GET operations.
- The frontend must not read YAML, Markdown, filesystem paths, Git state, registries or graph files directly.
- The backend must remain authoritative for body-path resolution, registry normalization, graph-derived fields and read-only view-model construction.
- Bootstrap access headers may be used as a temporary transport detail, but the page must not hardcode permanent role or policy decisions.
- The boundary must remain lightweight and feature-local; it must not introduce a generic frontend repository layer, query/cache library or generated OpenAPI client without a dedicated decision and requirement.
- The implementation must include verification that page-facing code is independent from the selected data source.

## Acceptance Criteria

```gherkin
Scenario: Project Documentation Explorer page is independent from snapshot or HTTP data transport
  Given the Project Documentation Explorer page needs collection, filter and detail view-models
  When the feature data-source boundary is configured with either the generated snapshot source or a governed HTTP source
  Then the page receives the same page-facing read model shape
  And the page does not directly read YAML, Markdown, filesystem, Git, registry or graph sources
  And the HTTP source uses only the governed read-only Project Documentation Explorer GET operations
  And no dynamic RBAC, mutation endpoint, query/cache library or Base Analysis runtime is introduced
```

## Verification Expectation

Future frontend implementation must verify that the Project Documentation Explorer page-facing logic depends on the data-source boundary and not on a concrete snapshot import, HTTP transport implementation or project-model source file.
