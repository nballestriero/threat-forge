# ADR-0015 — Project-scoped child documentation API boundary

## Status

Accepted.

## Context

Threat-forge now derives child project documentation source metadata from registered child project records. That resolver identifies whether a child Project Model is available from a local workspace, unconfigured, unsupported or unavailable.

The resolver alone does not yet give the Governance Console a production-safe way to load documents for a selected child project. The frontend still needs a project-scoped platform API so it can ask threat-forge for the selected child project's documentation without choosing a global child documentation URL and without risking platform-document fallback.

The platform must therefore expose read-only child documentation endpoints scoped by child project id. Those endpoints must use the registered child project resolver and return either child Project Documentation Explorer data or an explicit source-unavailable error. They must not fall back to threat-forge platform documentation snapshots or endpoints.

## Decision

MR-0003 shall expose project-scoped child documentation read-only API endpoints under the Child Project Management API boundary.

The first endpoints shall provide a Project Documentation Explorer collection view-model and entity detail view-model for a selected child project id. The backend shall resolve the child project through the registered child project store, derive its documentation source metadata, and compose a filesystem-backed Project Documentation Explorer service only when the registered source is available.

Unavailable, unconfigured or unsupported child documentation sources shall be mapped to explicit typed API errors. Missing child projects remain not-found errors. Entity ids remain backend-resolved through the child Project Documentation Explorer service and must be safe for encoded path parameters.

## Scope

In scope:

- adding read-only child-project-scoped documentation collection and detail routes;
- using the registered child project documentation source resolver;
- composing a child-workspace Project Documentation Explorer service for available local sources;
- mapping source-unavailable states to stable typed HTTP errors;
- extending the OpenAPI contract and runtime tests.

Out of scope:

- changing the frontend to consume these routes;
- adding write APIs;
- cloning or checking out Git repositories;
- mutating child Project Models;
- removing the platform Project Documentation Explorer endpoints;
- replacing the demo child local UI test source.

## Consequences

### Positive consequences

- The platform can serve child project documents through a backend project-scoped API.
- The frontend no longer needs to infer real child documentation sources from global environment variables once wired to these routes.
- Missing or unsupported child documentation sources remain explicit and testable.
- Child document reads stay behind the same child project capability boundary.

### Negative consequences

- The child project management API now depends on the Project Documentation Explorer service boundary for read-only document view-models.
- The first implementation only supports local filesystem child workspaces with standard Project Model roots.
- The API surface grows and must stay aligned with OpenAPI and runtime tests.

## Follow-up

1. Add requirements for project-scoped child documentation collection and detail endpoints.
2. Implement the read-only API routes, controller and service methods.
3. Add runtime tests for available local child documents and unavailable source errors.
4. Update the frontend child document view to call these project-scoped platform endpoints in a later micropasso.
