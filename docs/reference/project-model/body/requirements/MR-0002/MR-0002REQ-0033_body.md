# MR-0002REQ-0033 — Taxonomy Explorer read-only view-model

## Intent

The first Governance Console implementation needs stable read-only data contracts before backend reader services or React components are implemented.

## Requirement

The Project Model Explorer must define a read-only taxonomy view-model for browsing controlled taxonomy metadata and taxonomy values.

## Scope

This requirement applies to the future Project Model Explorer API, backend view-model shaping, and frontend consumption boundary. It does not implement OpenAPI files, Zod schemas, controllers, services, adapters, React components, CSS, graph rendering, authentication runtime, RBAC configuration, editing workflows, or source readers in this step.

## Rules

- The taxonomy view-model must expose taxonomy id, label, description, values, value labels, value descriptions, metadata fields and semantic UI token references where available.
- The taxonomy view-model must make mandatory descriptions visible to users.
- The taxonomy view-model must distinguish base, domain, methodology, workspace and project extension scope when such metadata is available.
- The taxonomy view-model must not allow custom taxonomy authoring in the first read-only slice.

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
