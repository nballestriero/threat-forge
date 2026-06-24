# ADR-0015 — Project Documentation Explorer frontend HTTP data-source boundary

## Status

Accepted.

## Context

The Project Documentation Explorer frontend currently consumes a generated static snapshot that is produced during the frontend build. The backend now also exposes the same read-only documentation capability through a governed OpenAPI contract, a native Node.js HTTP server boundary and a local serve composition command.

The next frontend step must prepare the React slice to consume the live HTTP API without making the page aware of filesystem-backed snapshots, backend source files, YAML registries, Markdown bodies, graph files or Git state.

The project must avoid a broad frontend migration in the same step as the decision. It must also avoid introducing a third-party query/cache library, generated OpenAPI client, dynamic RBAC model, deployment configuration or Base Analysis runtime behavior before those concerns receive dedicated governance.

## Decision

MR-0002 shall define a Project Documentation Explorer frontend data-source boundary that separates page rendering and interaction state from the concrete read model source.

The frontend Project Documentation Explorer page shall depend on a feature-local data access boundary that can load the governed documentation collection, filter metadata and entity details from either the existing generated snapshot or the governed HTTP API. The page must not know whether data comes from the generated snapshot or from HTTP.

The initial implementation may keep the generated snapshot as the default development/build source and may add an HTTP-backed source behind an explicit configuration or factory decision. A later implementation step may switch default behavior only after tests prove that the page receives equivalent view-models from the selected source.

The HTTP-backed source shall consume only the governed Project Documentation Explorer GET operations:

- `GET /api/project-model/documentation`;
- `GET /api/project-model/documentation/filters`;
- `GET /api/project-model/documentation/entities/{id}`.

The frontend data-source boundary shall preserve the existing access/capability separation. It may pass bootstrap registered-user headers while MR-0007 dynamic identity is deferred, but it must not hardcode permanent role-specific page visibility or policy decisions.

The frontend must continue to treat the backend as authoritative for resolving body paths, normalizing registry records, joining graph-derived fields and returning read-only view-models.

## Scope

In scope:

- frontend data-source boundary for Project Documentation Explorer collection, filters and details;
- ability to preserve snapshot consumption while preparing HTTP consumption;
- explicit separation between page rendering and concrete data transport;
- HTTP consumption limited to the governed read-only OpenAPI operations;
- bootstrap capability header handling as a temporary access transport detail.

Out of scope:

- migrating the frontend page to HTTP in this documentation-only micropasso;
- removing the generated snapshot;
- introducing TanStack Query, SWR, Redux, Zustand or other state/query libraries;
- generating an OpenAPI client;
- dynamic RBAC or user-management workflows;
- mutation endpoints;
- document editing;
- graph or registry writes;
- deployment/runtime environment design;
- Base Analysis, STRIDE or STRIDE-AI runtime/storage APIs.

## Consequences

### Positive consequences

* The React page can move toward live backend data without coupling UI rendering to transport details.
* The generated snapshot remains usable for static build verification and low-friction development.
* The backend remains the source of truth for governed documentation, body and graph normalization.
* A later implementation can be limited to a small feature data client and tests rather than a page rewrite.

### Negative consequences

* The project will temporarily support two read sources for the same view-model.
* The boundary must stay small to avoid becoming a premature generic frontend repository abstraction.
* A later step must decide how local development selects snapshot versus HTTP behavior.

## Follow-up

1. Add the frontend data-source boundary and keep snapshot behavior as the default source.
2. Add an HTTP-backed source that consumes only the governed read-only Project Documentation Explorer operations.
3. Add tests or build-time checks proving that the page remains independent from the selected source.
4. Later decide whether HTTP becomes the default local source once access, development ergonomics and error handling are governed.
