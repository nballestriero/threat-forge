# MR-0002REQ-0013 — Project Model Explorer aggregate browsing endpoint

## Intent

The Project Model Explorer needs an aggregate browsing endpoint that gives the frontend a normalized read-only view of the project model.

This requirement prevents the frontend from reconstructing graph and documentation state by reading raw registries, body files, generated pages, Git state, or filesystem paths.

## Requirement

A future Project Model Explorer API must expose a read-only aggregate browsing endpoint, such as `GET /api/project-model/explorer/view-model`.

The endpoint must return a normalized frontend-safe view model containing at least project-model metadata, available filters, navigable nodes, navigable relations, document summaries, diagnostics, and navigation affordances. The response must be suitable for rendering a graph-backed documentation browser.

The endpoint must not expose raw YAML, Markdown, Git, filesystem, registry, or graph-file structures as the application contract. Source references may be included for transparency, but they must not be the mechanism that React components use to read or interpret project-model content.

## Scope

This requirement applies to the future Project Model Explorer aggregate browsing API.

It does not create the OpenAPI file, backend route, service, adapter, frontend client, React page, graph visualization, or runtime parser.

## Rules

- The endpoint must be read-only.
- The response must be a normalized view model, not raw source data.
- The response must support role-neutral browsing and filtering affordances.
- The response must include enough graph structure for an initial explorer UI.
- The response must include diagnostics or a diagnostics placeholder.
- React components must consume this endpoint through an API client or view-model boundary.
- Raw project-model files must remain behind backend/source access boundaries.

## Acceptance Criteria

```gherkin
Scenario: Frontend loads the Project Model Explorer browsing model
  Given the Project Model Explorer API is implemented
  When the frontend requests the aggregate browsing view model
  Then the backend returns normalized metadata, filters, nodes, relations, documents, and diagnostics
  And the frontend does not read YAML, Markdown, Git state, filesystem paths, registries, or graph files directly

Scenario: Browsing response supports graph-backed navigation
  Given the aggregate browsing endpoint returns graph information
  When a user opens the Explorer
  Then the UI can show navigable project-model entities and relations
  And the response remains independent from raw source-file layout
```

## Verification Expectation

Future OpenAPI, backend, frontend, and code-traceability gates must be able to verify that the Project Model Explorer aggregate browsing endpoint is documented, implemented as read-only, and consumed through the frontend API boundary.
