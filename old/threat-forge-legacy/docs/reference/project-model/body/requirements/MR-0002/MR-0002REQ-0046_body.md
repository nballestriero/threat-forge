# MR-0002REQ-0046 — Project Documentation Explorer HTTP read-only server

## Intent

The Project Documentation Explorer read-only API must be exposed through a minimal HTTP boundary that conforms to the governed OpenAPI contract while preserving backend composition and source-access isolation rules.

## Requirement

MR-0002 must provide a minimal HTTP read-only server for the Project Documentation Explorer endpoints defined by the governed OpenAPI contract.

## Scope

This requirement applies to the HTTP delivery boundary for the Project Documentation Explorer collection, filters and entity-detail operations. It does not introduce mutation endpoints, document editing, registry writes, graph writes, repository operations, Base Analysis runtime APIs, STRIDE runtime APIs, STRIDE-AI runtime APIs, dynamic RBAC management, deployment behavior or generated clients.

## Rules

- The HTTP boundary must expose only the governed read-only Project Documentation Explorer GET operations.
- The HTTP boundary must conform to `docs/reference/api/openapi/threat-forge.openapi.yml`.
- Route handlers and controllers must delegate to the Project Documentation Explorer service boundary.
- Route handlers and controllers must not instantiate concrete filesystem, YAML, Markdown, Git, registry or graph adapters directly.
- Concrete adapters must be assembled by a factory or composition root.
- The HTTP boundary must keep YAML, Markdown, Git, filesystem, registry and graph access behind backend source ports and adapters.
- The HTTP boundary must remain read-only and must not mutate project-model records or repository state.
- Initial access behavior may use the registered-user capability boundary until MR-0007 defines richer runtime identity and authorization semantics.
- The implementation must include at least one runtime test or smoke test covering the HTTP read-only boundary.

## Acceptance Criteria

```gherkin
Scenario: Project Documentation Explorer exposes a read-only HTTP boundary
  Given the governed OpenAPI contract defines the Project Documentation Explorer read-only endpoints
  When the HTTP server is started for verification
  Then the collection endpoint is available as a GET operation
  And the filters endpoint is available as a GET operation
  And the entity detail endpoint is available as a GET operation
  And no mutation endpoint is introduced
  And route handlers delegate through the service boundary rather than instantiating concrete source adapters directly
```

## Verification Expectation

Runtime tests, smoke tests and future route/contract alignment checks must verify that the HTTP boundary serves only the governed read-only operations and remains aligned with the OpenAPI contract.
