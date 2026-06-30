# ADR-0016 — Child project documentation frontend project-scoped routing boundary

## Status

Accepted.

## Context

Threat-forge now exposes project-scoped child documentation endpoints through the Child Project Management API. These endpoints resolve the selected child project from registered project metadata and return Project Documentation Explorer collection and detail view-models for that child only.

The Governance Console frontend still needs to route the selected child project's Documents view through those project-scoped platform endpoints. Keeping the old single child documentation URL as the main path would not scale to real projects and would keep source selection in browser configuration rather than in registered child-project state.

The frontend must therefore use the selected child project id when it opens Documents and must create a project-scoped documentation client that calls the Child Project Management API. Platform document views may keep their snapshot/live HTTP behavior, but child project document views must not use platform snapshots, platform Project Documentation Explorer endpoints, or a global child documentation URL as a fallback.

## Decision

The Governance Console shall route child project Documents through a project-scoped frontend client backed by the Child Project Management API.

When a child project is selected, the frontend shall keep the selected child project id in the documentation context and construct a Project Documentation Explorer-compatible client for that id. That client shall call `/api/child-projects/{childProjectId}/documentation` and `/api/child-projects/{childProjectId}/documentation/entities/{entityId}` on the configured Child Project Management API base URL.

If the Child Project Management API is not selected as an HTTP frontend data source, the child document view shall remain fail-closed with an explicit unavailable state. Platform documentation views may still use the generated platform snapshot fallback; child project documentation views shall not.

The local UI test environment shall start and configure the Child Project Management API so the Demo Child Project can be reviewed through the same project-scoped frontend path that real projects will use.

## Scope

In scope:

- project-scoped frontend client support for child Project Documentation Explorer read models;
- selected child project id routing from the Child Projects page to the documentation page;
- local UI test frontend configuration for the Child Project Management API;
- preserving the explicit unavailable state when the project-scoped API is not configured;
- runtime tests for project-scoped frontend client URLs and UI test environment wiring.

Out of scope:

- removing the platform Project Documentation Explorer snapshot fallback;
- adding write APIs;
- changing backend child documentation endpoint semantics;
- removing the dedicated demo child Project Documentation Explorer local service added for earlier manual review;
- implementing dynamic RBAC administration;
- cloning remote child repositories.

## Consequences

### Positive consequences

- The UI path for child project documents now uses the selected child project id instead of a global child URL.
- Demo and real child projects can share the same frontend routing pattern.
- Browser code no longer selects real child documentation sources; it delegates source resolution to the backend resolver and project-scoped API.
- Child project document failures remain explicit and do not look like valid platform documents.

### Negative consequences

- Local manual review now requires the Child Project Management API to run in HTTP mode.
- The local UI test environment starts one more backend service.
- The previous demo child documentation service remains available for compatibility with its governed requirement, even though the primary frontend path moves to the project-scoped API.

## Follow-up

1. Add frontend requirements for project-scoped child document loading and local API wiring.
2. Implement the project-scoped child documentation frontend client.
3. Compose the selected child project Documents view through the Child Project Management API.
4. Update local UI test environment wiring and tests.
