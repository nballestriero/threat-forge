# MR-0002REQ-0009 — Canonical OpenAPI contract location

## Intent

Threat-forge needs an explicit location for HTTP API contracts before backend routes or frontend clients are implemented.

This requirement prevents OpenAPI from becoming a backend-private implementation file and keeps API contracts governable through Doc-as-Code.

## Requirement

Threat-forge HTTP API contracts must be represented as governed OpenAPI artifacts under `docs/reference/api/openapi/`.

The first Project Model Explorer API slice must use that governed OpenAPI location when its HTTP contract is introduced. The recommended product-level artifact is `docs/reference/api/openapi/threat-forge.openapi.yml`, unless a later ADR chooses a bounded-context split.

## Scope

This requirement applies to future product HTTP APIs defined under `MR-0002` reusable interface architecture.

It defines contract ownership and location only. It does not create the OpenAPI file, route implementation, generated client, or OpenAPI validator.

## Rules

- OpenAPI contracts must live under `docs/reference/api/openapi/`.
- OpenAPI is the canonical HTTP contract for product API behavior.
- Backend routes must implement the governed OpenAPI contract when introduced.
- Frontend clients must consume the governed OpenAPI contract directly or through generated/validated adapters when introduced.
- OpenAPI files must not be hidden inside backend controller, service, adapter, or route directories as backend-private implementation details.
- Any later decision to split contracts by bounded context must preserve the same governed OpenAPI root.

## Acceptance Criteria

```gherkin
Scenario: OpenAPI contract has a governed location
  Given a product HTTP API contract is introduced
  When the contract is added to the repository
  Then it is placed under docs/reference/api/openapi
  And it is traceable as a governed documentation artifact

Scenario: Backend does not privately own the HTTP contract
  Given a backend route implements a product API
  When its HTTP contract is reviewed
  Then the canonical OpenAPI artifact is not hidden inside the backend route or controller directory
  And the backend implementation is treated as an implementation of the governed contract
```

## Verification Expectation

Future documentation, source-layout, and API-contract gates must be able to verify that product OpenAPI artifacts live under `docs/reference/api/openapi/` and are traceable to requirements before backend or frontend implementation proceeds.
