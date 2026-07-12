# ADR-0012 — Project Documentation Explorer OpenAPI read-only contract

## Status

Accepted.

## Context

The Project Documentation Explorer already has backend route descriptors, Zod view-model contracts, a read service, a controller boundary, a filesystem-backed source adapter, a frontend snapshot exporter and a React Governance Console page consuming a frontend-safe snapshot.

The current architecture still lacks a governed OpenAPI artifact for the read-only HTTP boundary. Without that artifact, future HTTP server wiring would rely on route descriptors and Zod contracts alone, and the frontend/API boundary would not have the canonical public contract required by MR-0002.

The project must add the OpenAPI contract before adding a real HTTP server so that implementation follows the governed contract rather than retrofitting the contract after code exists.

## Decision

MR-0002 shall introduce the first governed OpenAPI contract artifact for the Project Documentation Explorer read-only API under the canonical API reference location `docs/reference/api/openapi/`.

The OpenAPI artifact shall describe the existing logical Project Documentation Explorer read-only boundary:

- `GET /api/project-model/documentation` for the filtered collection view-model;
- `GET /api/project-model/documentation/filters` for filter facets;
- `GET /api/project-model/documentation/entities/{id}` for entity detail with backend-resolved governed Markdown body content.

The OpenAPI contract shall model frontend-safe view-model payloads and shall not expose implementation details that would encourage the browser to read YAML, Markdown, Git, filesystem paths, registries or graph files directly.

The contract shall remain read-only. It must not introduce mutation operations, body editing, registry writes, graph writes, Base Analysis runtime APIs, dynamic RBAC management, deployment behavior or CI behavior.

The contract shall align with the current Zod view-model vocabulary while preserving the separation of responsibilities: OpenAPI is the canonical HTTP contract, and Zod remains the backend runtime validation mechanism.

## Scope

In scope:

- governed OpenAPI artifact location;
- read-only Project Documentation Explorer collection operation;
- read-only Project Documentation Explorer filter operation;
- read-only Project Documentation Explorer entity detail operation;
- frontend-safe response schemas for access, query, filters, items, relations and body content;
- graph traceability from the new requirement to the OpenAPI contract artifact.

Out of scope:

- HTTP server implementation;
- framework selection;
- route registration;
- OpenAPI lint gate;
- OpenAPI/Zod synchronization gate;
- generated client tooling;
- authentication runtime;
- dynamic RBAC configuration;
- mutation endpoints;
- Base Analysis, STRIDE or STRIDE-AI APIs.

## Consequences

### Positive consequences

* The next HTTP implementation micropasso can implement a governed API contract instead of inventing route behavior in code.
* The frontend/API boundary becomes explicit before server wiring.
* Future OpenAPI validation, route alignment and generated-client checks have a canonical artifact to target.
* The contract keeps Project Documentation Explorer source access behind the backend boundary.

### Negative consequences

* The OpenAPI contract may require manual alignment with Zod until a future synchronization decision and gate exist.
* The contract increases governed documentation surface before runtime HTTP behavior exists.
* Future server implementation must either match this contract or introduce a governed decision to revise it.

## Follow-up

1. Add a minimal OpenAPI validation/lint gate in a separate governed micropasso if needed.
2. Implement a read-only HTTP server adapter for the Project Documentation Explorer endpoints in a separate governed micropasso.
3. Later decide whether OpenAPI and Zod stay manually aligned, are generated from a shared source, or are checked by a dedicated alignment gate.
