# MR-0002REQ-0032 — Graph Explorer read-only view-model

## Intent

The first Governance Console implementation needs stable read-only data contracts before backend reader services or React components are implemented.

## Requirement

The Graph Explorer must define a read-only graph view-model suitable for visualizing governed project-model nodes and relations in the Governance Console.

## Scope

This requirement applies to the future Project Model Explorer API, backend view-model shaping, and frontend consumption boundary. It does not implement OpenAPI files, Zod schemas, controllers, services, adapters, React components, CSS, graph rendering, authentication runtime, RBAC configuration, editing workflows, or source readers in this step.

## Rules

- The graph view-model must include nodes, edges, labels, types, predicates and enough metadata for selection and detail display.
- The graph view-model must support initial filters for macro requirement, node type, predicate, status or equivalent governed categories where available.
- The graph view-model must use semantic visual hints or token references when available, not raw visual decisions embedded in domain records.
- The graph view-model must remain read-only and must not expose graph editing operations.

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
