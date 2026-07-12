# ADR-0013 — Project Documentation Explorer HTTP read-only server boundary

## Status

Accepted.

## Context

The Project Documentation Explorer now has a governed backend service boundary, frontend snapshot flow, OpenAPI read-only contract and OpenAPI structural validation gate.

The next implementation step is exposing the existing Project Documentation Explorer capability through a real HTTP boundary. This must not weaken the MR-0002 architecture rules already established for reusable application slices.

In particular, HTTP controllers and route handlers must not instantiate concrete filesystem, YAML, Markdown, Git, registry or graph adapters. The HTTP boundary must remain a thin delivery mechanism that delegates to the existing service through a module factory or composition root.

The first HTTP server must also remain deliberately read-only. It must not introduce document editing, registry mutation, graph mutation, repository operations, Base Analysis runtime state, STRIDE runtime state, dynamic RBAC management or deployment concerns.

## Decision

MR-0002 shall introduce a minimal HTTP read-only server boundary for the Project Documentation Explorer.

The HTTP boundary shall expose only the operations already defined by the governed OpenAPI contract:

- `GET /api/project-model/documentation`;
- `GET /api/project-model/documentation/filters`;
- `GET /api/project-model/documentation/entities/{id}`.

The HTTP implementation shall route requests through the Project Documentation Explorer service and shall use a module factory or composition root to assemble service, ports and adapters.

Controllers and route handlers shall not instantiate concrete source adapters directly. Filesystem, YAML, Markdown, Git, registry and graph access must remain behind backend source ports and adapters.

The HTTP boundary shall remain read-only and must not mutate governed project-model records or repository state.

The initial access boundary may use the existing registered-user capability model. Detailed user, role, permission and access-policy semantics remain owned by MR-0007.

## Scope

In scope:

- minimal HTTP server boundary for the governed Project Documentation Explorer OpenAPI operations;
- route handling for the three read-only GET endpoints;
- request mapping from HTTP query/path parameters to the existing service query model;
- response mapping from service view-models to OpenAPI-compatible JSON responses;
- factory or composition-root based assembly of service and adapters;
- smoke or runtime verification that the HTTP boundary serves the read-only endpoints.

Out of scope:

- mutation endpoints;
- document editing;
- registry writes;
- graph writes;
- repository commit, push or tag operations;
- Base Analysis, STRIDE or STRIDE-AI runtime APIs;
- dynamic RBAC management;
- deployment topology;
- generated clients;
- strict OpenAPI validation with external tooling.

## Consequences

### Positive consequences

* The Project Documentation Explorer becomes accessible through the same HTTP contract the frontend is expected to consume later.
* The backend architecture remains aligned with Controller → Service → Port → Adapter boundaries.
* The frontend can later move from static snapshot consumption to API consumption without reading source files directly.
* The first HTTP surface stays small and easy to test.

### Negative consequences

* The first server implementation will still be intentionally narrow and will not solve deployment, authentication expansion or dynamic workspace concerns.
* The HTTP boundary must be kept manually aligned with the OpenAPI contract until a future route/contract alignment gate exists.
* Additional runtime tests become necessary before expanding the server surface.

## Follow-up

1. Add the minimal Project Documentation Explorer HTTP read-only server implementation in a separate governed micropasso.
2. Add runtime tests or smoke tests for the three read-only endpoints.
3. Later decide whether route/contract alignment should be verified by a stricter OpenAPI validation tool or generated integration tests.
