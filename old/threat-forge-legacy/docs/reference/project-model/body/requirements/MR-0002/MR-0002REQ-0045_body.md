# MR-0002REQ-0045 — Project Documentation Explorer governed OpenAPI contract

## Intent

The Project Documentation Explorer HTTP boundary must have a governed OpenAPI artifact before a real HTTP server exposes the read-only API.

## Requirement

MR-0002 must provide a governed OpenAPI contract for the Project Documentation Explorer read-only API under the canonical API reference location.

## Scope

This requirement applies to the OpenAPI contract artifact for Project Documentation Explorer collection, filter and detail operations. It does not implement an HTTP server, route adapter, authentication runtime, dynamic RBAC, generated client, OpenAPI lint gate, OpenAPI/Zod synchronization gate, mutation endpoint, Base Analysis runtime, STRIDE runtime or STRIDE-AI runtime.

## Rules

- The contract must be stored under `docs/reference/api/openapi/`.
- The contract must describe only read-only Project Documentation Explorer operations.
- The collection operation must expose the filtered documentation view-model.
- The filter operation must expose backend-derived filter facets.
- The detail operation must expose registry metadata, graph relations and backend-resolved governed Markdown body content.
- The contract must not expose browser-side source access to YAML, Markdown, Git, filesystem, registries or graph files.
- The contract must use OpenAPI as the canonical HTTP contract while keeping Zod as the backend runtime validation mechanism.
- Future HTTP server implementation must match the governed OpenAPI contract or update it through a governed decision first.

## Acceptance Criteria

```gherkin
Scenario: Project Documentation Explorer has a governed read-only HTTP contract
  Given Project Documentation Explorer exposes read-only collection, filter and detail behavior
  When the API contract is reviewed
  Then the governed OpenAPI artifact defines the collection endpoint
  And the governed OpenAPI artifact defines the filters endpoint
  And the governed OpenAPI artifact defines the entity detail endpoint
  And no mutation endpoint is introduced
```

## Verification Expectation

Future OpenAPI lint, route alignment, backend HTTP tests and frontend client tests must verify that the Project Documentation Explorer HTTP implementation and consumers stay aligned with the governed OpenAPI artifact.
