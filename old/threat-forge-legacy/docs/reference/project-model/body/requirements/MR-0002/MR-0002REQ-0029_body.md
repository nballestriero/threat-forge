# MR-0002REQ-0029 — Project Model Explorer overview view-model

## Intent

The first Governance Console implementation needs stable read-only data contracts before backend reader services or React components are implemented.

## Requirement

The Project Model Explorer must define a read-only overview view-model for displaying high-level project-model state in the Governance Console.

## Scope

This requirement applies to the future Project Model Explorer API, backend view-model shaping, and frontend consumption boundary. It does not implement OpenAPI files, Zod schemas, controllers, services, adapters, React components, CSS, graph rendering, authentication runtime, RBAC configuration, editing workflows, or source readers in this step.

## Rules

- The overview view-model must include counts or summaries for macro requirements, requirements, ADR/decisions, taxonomies, graph nodes, graph relations and generated diagnostics when available.
- The overview must expose last-known project-model status in a frontend-safe form.
- The overview must not require the frontend to parse generated HTML pages or repository files.
- The overview may include links to canonical entity collection routes using governed identifiers.

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
