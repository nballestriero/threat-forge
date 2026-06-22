# MR-0002REQ-0043 — Custom hook and data client boundary

## Intent

The frontend must be able to use generated snapshot data during early development and real HTTP APIs later without rewriting feature page rendering. At the same time, the frontend should avoid heavyweight adapter chains that make simple pages harder to understand.

## Requirement

Frontend feature pages must access governed backend data through feature-owned custom hooks and lightweight data clients, with no direct browser-side reads from documentation, registries, graph files, Git or filesystem paths.

## Scope

This requirement applies to Project Documentation Explorer and future read-only or write-capable Governance Console pages. It covers frontend data access boundaries, not backend service implementation details.

## Rules

- A feature page should delegate loading and interaction orchestration to a feature custom hook when state or data access is non-trivial.
- A feature custom hook may call a lightweight feature data client.
- The data client may read a backend-generated development snapshot while no HTTP API exists.
- The same data client boundary must be replaceable by HTTP fetch calls when API endpoints become available.
- The browser must not resolve `body_path`, read Markdown files directly, parse YAML registries, inspect graph files or infer Git state.
- The snapshot source is a development/bootstrap data source, not a permanent architectural layer.
- Additional adapter abstractions, query/cache libraries or stores require their own governed justification when concrete complexity appears.

## Acceptance Criteria

```gherkin
Scenario: Frontend data access is hook and client backed
  Given the Project Documentation Explorer page needs documentation data
  When it loads a collection or detail view
  Then it obtains data through a feature-owned hook and data client
  And the page rendering logic does not depend on whether data came from a development snapshot or a future HTTP endpoint
  And the browser does not read project-model source files directly
```

## Verification Expectation

Future frontend code should keep feature data clients small and avoid direct imports from documentation, registry, graph or backend filesystem paths. Migration from snapshot to HTTP should be localized to the client layer or hook, not to presentation components.
