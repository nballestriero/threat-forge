# MR-0002REQ-0049 — Project Documentation Explorer live HTTP UI activation

## Intent

The Project Documentation Explorer UI must be able to run against the governed live HTTP API through explicit configuration while preserving the generated snapshot as the safe default source.

## Requirement

MR-0002 must provide a governed Project Documentation Explorer UI activation model that selects between the generated snapshot source and the live HTTP source through the existing frontend data-source boundary.

## Scope

This requirement governs the frontend activation semantics for Project Documentation Explorer live HTTP mode. It does not remove the generated snapshot, introduce a query/cache library, add generated OpenAPI clients, introduce dynamic RBAC or implement Base Analysis runtime/storage.

## Rules

- The generated snapshot must remain the default Project Documentation Explorer frontend source unless live HTTP is explicitly selected.
- Live HTTP mode must be selected through a Project Documentation Explorer frontend configuration value, not by page-local hardcoding.
- The page must continue to depend on the feature-local data-source boundary rather than direct snapshot imports or direct fetch calls.
- Live HTTP mode must consume only the governed Project Documentation Explorer read-only GET operations.
- The browser must not read YAML, Markdown, filesystem paths, Git state, registry files or graph files directly.
- The backend must remain authoritative for body loading, registry normalization, graph-derived fields, filtering semantics and access/capability decisions.
- Load, network and invalid-response failures for the selected source must be represented explicitly to the UI rather than silently producing misleading empty content.
- Snapshot fallback may be implemented only if the UI behavior makes clear that live HTTP failed and that snapshot data is being used instead.
- Bootstrap registered-user headers may remain temporary transport details until MR-0007 introduces governed identity/session behavior.
- The implementation must not introduce mutation endpoints, dynamic RBAC, query/cache libraries, generated OpenAPI clients or Base Analysis runtime/storage APIs.

## Acceptance Criteria

```gherkin
Scenario: Project Documentation Explorer defaults to generated snapshot
  Given no live HTTP data-source configuration is provided
  When the Project Documentation Explorer UI loads
  Then it uses the generated snapshot through the feature data-source boundary
  And it does not require the local HTTP server to be running

Scenario: Project Documentation Explorer can opt into live HTTP
  Given live HTTP data-source configuration is explicitly selected
  When the Project Documentation Explorer UI loads collection, filters or entity details
  Then it uses only the governed read-only Project Documentation Explorer HTTP operations
  And the page does not bypass the data-source boundary

Scenario: Live HTTP failure is visible
  Given live HTTP mode is selected
  When the local HTTP server is unavailable or returns an invalid response
  Then the UI represents the selected-source failure explicitly
  And any snapshot fallback is clearly distinguishable from successful live HTTP loading
```

## Verification Expectation

Future frontend implementation must verify snapshot-default activation, explicit live HTTP opt-in and visible failure behavior without introducing direct project-model source reads, mutation endpoints, dynamic RBAC or new query/cache infrastructure.
