# ADR-0016 — Project Documentation Explorer live HTTP UI activation

## Status

Accepted.

## Context

The Project Documentation Explorer frontend now has a feature-local data-source boundary that can preserve the generated snapshot as the default source and can consume the governed HTTP API only through explicit configuration. The backend exposes the read-only Project Documentation Explorer API locally through the governed serve command.

The next step is to decide how the UI may be activated against the live HTTP source without making HTTP the unconditional default and without removing the generated snapshot. The project still needs reliable static builds, deterministic frontend verification, low-friction development and a safe path for users who do not run the local backend server.

This decision must remain focused on activation semantics. It must not introduce a third-party query/cache library, generated OpenAPI client, dynamic RBAC, deployment configuration, mutation behavior or Base Analysis runtime/storage.

## Decision

MR-0002 shall define live HTTP activation for the Project Documentation Explorer UI as an explicit frontend configuration mode over the existing data-source boundary.

The generated snapshot shall remain the default source for frontend builds and unconfigured local UI execution. The live HTTP source may be selected only through an explicit Project Documentation Explorer frontend data-source configuration value.

When live HTTP is selected, the frontend shall consume only the governed Project Documentation Explorer read-only API operations through the existing data-source boundary:

- `GET /api/project-model/documentation`;
- `GET /api/project-model/documentation/filters`;
- `GET /api/project-model/documentation/entities/{id}`.

The UI must present live HTTP as a transport mode, not as a new authority. The backend remains authoritative for registry normalization, body loading, graph-derived fields, filtering semantics and capability decisions. The browser remains prohibited from reading YAML, Markdown, filesystem paths, Git state, registry files or graph files directly.

Network failure, invalid HTTP responses or missing local server availability must not silently corrupt the view. The UI must surface a clear read-only load/error state for the selected source. A fallback to the generated snapshot may be supported only if it is explicit in implementation behavior and does not hide the fact that live HTTP failed.

Bootstrap registered-user headers may continue to be used as temporary local-development transport details until MR-0007 replaces them with governed identity/session behavior. The frontend must not hardcode permanent RBAC decisions while using those headers.

## Scope

In scope:

- explicit frontend configuration for selecting generated snapshot or live HTTP source;
- preserving snapshot as the default source;
- defining expected loading/error behavior for the selected source;
- keeping HTTP access limited to the governed read-only Project Documentation Explorer operations;
- keeping the page behind the existing data-source boundary.

Out of scope:

- implementing the UI activation in this documentation-only micropasso;
- removing the generated snapshot;
- making live HTTP the unconditional default;
- introducing TanStack Query, SWR, Redux, Zustand or another query/state library;
- generating an OpenAPI client;
- introducing dynamic RBAC or persistent login/session behavior;
- adding mutation endpoints or document editing;
- implementing deployment, proxy or production hosting behavior;
- implementing Base Analysis, STRIDE or STRIDE-AI runtime/storage APIs.

## Consequences

### Positive consequences

* The UI can be tested against the local backend without losing deterministic snapshot-backed builds.
* Development can opt into live data intentionally while users without the local server still get a working static UI.
* Error and fallback semantics are governed before the code path is wired into the page.
* The frontend remains isolated from project-model source files and direct repository access.

### Negative consequences

* The project temporarily maintains both snapshot and live HTTP execution modes.
* The UI will need explicit status/error handling to avoid confusing live-source failures with empty documentation results.
* Future production deployment may require another decision for proxy/base URL/session handling.

## Follow-up

1. Wire the Project Documentation Explorer page to select its source through the governed data-source boundary.
2. Keep snapshot as the default configuration.
3. Add explicit live HTTP configuration and clear selected-source load/error behavior.
4. Verify that the page does not bypass the data-source boundary or read project-model source files directly.
