# MR-0002REQ-0028 — Project Model Explorer read-only API contract boundary

## Intent

The first Governance Console implementation needs stable read-only data contracts before backend reader services or React components are implemented.

## Requirement

The Project Model Explorer must expose its first implementation contract as a read-only API/view-model boundary. The contract must describe the logical endpoints or operations needed by the first Governance Console UI without requiring React to read project-model source files directly.

## Scope

This requirement applies to the future Project Model Explorer API, backend view-model shaping, and frontend consumption boundary. It does not implement OpenAPI files, Zod schemas, controllers, services, adapters, React components, CSS, graph rendering, authentication runtime, RBAC configuration, editing workflows, or source readers in this step.

## Rules

- The contract must be read-only.
- The contract must be suitable for future OpenAPI publication under the canonical API reference location.
- The contract must use governed project-model identities rather than arbitrary filesystem paths.
- The contract must allow backend implementations to normalize Markdown, YAML, graph and taxonomy sources behind services and adapters.
- The contract must not implement editing, writes, Git mutations or source-file access from the frontend.

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
