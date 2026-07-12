# ADR-0001 — Reusable application architecture for backend and frontend modules

## Status

Accepted.

## Context

Threat-forge is moving from documentation-governance tooling into product features: reusable interfaces, project management, child-project governance, threat-analysis workspaces, identity and access management, audit, and reporting.

These features must not be implemented as isolated screens, ad-hoc route handlers, or concrete filesystem access embedded in UI or controllers. They must share an application architecture that keeps domain behavior, transport concerns, storage adapters, generated artifacts, and UI rendering separated.

The backend will be implemented with Node.js. Runtime contracts must be expressed with Zod where application data, parsed records, service commands, adapter outputs, or internal boundaries require validation. HTTP contracts must be exposed through OpenAPI so the frontend can consume a stable API boundary.

The backend must preserve the factory/composition-root pattern already adopted in earlier threat-forge work: controllers must not instantiate concrete adapters directly; services depend on ports; adapters implement ports; the composition root wires concrete dependencies. Middleware may be used for cross-cutting HTTP concerns such as request parsing, OpenAPI validation, authentication context, correlation IDs, logging, error handling, and future audit hooks.

The frontend will use React. React components must consume view models, controllers/hooks, client ports, or generated API clients. Components must not read YAML, Markdown, graph files, Git state, filesystem paths, or project-model registries directly.

## Decision

`MR-0002` will define the reusable application architecture used by future backend and frontend modules.

Backend modules must use Node.js, Zod runtime contracts, OpenAPI HTTP contracts, factory/composition-root assembly, and Controller → Service → Port → Adapter layering.

Frontend modules must use React with an application shell, reusable components, route/page-level boundaries, controller or hook boundaries, and API/client adapters that consume the OpenAPI boundary.

Protected pages and route guards are part of the reusable interface framework because they are application-shell mechanics. The meaning of authentication, sessions, roles, permissions, ownership, and membership belongs to `MR-0007`.

Cross-cutting HTTP concerns belong in middleware when they are transport-wide or request-wide. Middleware must not absorb feature-specific business logic, threat-analysis logic, project-management behavior, or report generation logic.

Every feature-specific implementation must belong to its domain MR, but it must use the reusable architecture defined by `MR-0002`.

## Scope

In scope:

- backend module architecture with Node.js;
- Zod runtime contract boundaries;
- OpenAPI HTTP contract boundaries;
- factory and composition-root dependency assembly;
- Controller → Service → Port → Adapter layering;
- frontend React application shell and component boundary;
- API/client adapter boundary for frontend modules;
- protected route and page guard mechanics;
- middleware boundary for cross-cutting HTTP concerns.

Out of scope:

- defining user/session/role/permission semantics, which belongs to `MR-0007`;
- defining project and child-project domain behavior, which belongs to `MR-0003`;
- defining base threat-analysis entities, which belongs to `MR-0004`;
- defining STRIDE or STRIDE-AI logic, which belongs to `MR-0005` and `MR-0006`;
- defining audit-event semantics, which belongs to `MR-0008`;
- defining general reporting semantics, which belongs to `MR-0009`;
- implementing runtime code in this document-only step.

## Consequences

### Positive consequences

* Backend features share a uniform module shape and dependency boundary.
* Controllers remain thin and do not instantiate concrete adapters.
* Services can be tested through ports without filesystem, Git, or HTTP coupling.
* Zod and OpenAPI have separate, explicit responsibilities.
* React components remain reusable across parent and child projects.
* Protected-route mechanics can be introduced before final RBAC semantics are designed.
* Middleware can handle cross-cutting HTTP behavior without hiding feature logic.

### Negative consequences

* Each feature requires explicit ports, adapters, contracts, and composition before implementation.
* Early implementation will be slower than ad-hoc route/component creation.
* Some shared contracts must be designed before frontend and backend can move independently.
* The identity model in `MR-0007` must later bind cleanly to the generic route-guard mechanism defined here.

## Follow-up

1. Derive small architecture requirements from this decision.
2. Later define concrete backend module templates and source layout.
3. Later define frontend application-shell and route-guard contracts.
4. Later define the first read-only Project Model Explorer feature using this architecture.
5. Later bind protected routes to `MR-0007` identity and access-management semantics.
