# MR-0002REQ-0031 — Governed entity detail view-model

## Intent

The first Governance Console implementation needs stable read-only data contracts before backend reader services or React components are implemented.

## Requirement

The Project Model Explorer must define a normalized read-only entity detail view-model for displaying governed project-model records and their relationships.

## Scope

This requirement applies to the future Project Model Explorer API, backend view-model shaping, and frontend consumption boundary. It does not implement OpenAPI files, Zod schemas, controllers, services, adapters, React components, CSS, graph rendering, authentication runtime, RBAC configuration, editing workflows, or source readers in this step.

## Rules

- Entity detail must include stable id, kind, title/label, status where applicable, body or structured content sections where applicable, source references, incoming/outgoing relationships, and diagnostics when available.
- Entity detail must be frontend-safe and must not require direct Markdown/YAML parsing by React.
- Source references must be informational and traceability-oriented, not a frontend file-read instruction.
- Entity detail must support navigation to related governed entities through relationship metadata.

## Acceptance Criteria

```gherkin
Scenario: Read-only explorer consumes a normalized view-model
  Given a future registered user opens the Project Model Explorer
  When the frontend needs project-model data
  Then it requests a normalized read-only view-model from the backend/API boundary
  And it does not read Markdown, YAML, Git, filesystem, registry, graph, or generated page files directly

Scenario: Governed identifiers are used for navigation
  Given a view-model contains project-model navigation targets
  When the frontend renders links or details
  Then it uses governed entity, relation, taxonomy, graph or route identifiers
  And it does not treat arbitrary repository paths as application identities
```

## Verification Expectation

Future OpenAPI, backend, frontend and integration tests must verify that the read-only Project Model Explorer consumes normalized API/view-model contracts and respects the source-access isolation rules declared by MR-0002.
