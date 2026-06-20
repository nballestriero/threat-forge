# ADR-0005 — Workspace-aware Governance Console and Threat Analysis navigation

## Status

Accepted.

## Context

Threat-forge needs a web Governance Console that can be reused for the parent platform workspace and for every governed child project workspace. The console must not be a static documentation viewer. It must make the governed project model, documentation, graph, gates, users, reports, audit information, and future security-analysis workflows navigable through application boundaries.

The parent `threat-forge` workspace has one capability that child project workspaces must not have: managing child projects. Child projects are intentionally not allowed to create or manage nested child projects. The same UI shell must therefore adapt navigation by workspace type and capability instead of duplicating separate applications.

Threat-forge also anticipates threat analysis during the documentation phase. Threat analysis must therefore be a first-level navigation area, not a secondary page hidden inside documentation. Both the parent platform workspace and child project workspaces must expose a Threat Analysis area that can later contain Base Analysis, DFD, asset/boundary/flow management, STRIDE, STRIDE-AI, findings, mitigations, security requirements, and evidence/review workflows.

This step is intentionally document-only. It does not create React components, routes, OpenAPI files, backend controllers, authorization middleware, menu configuration files, Base Analysis runtime, STRIDE runtime, STRIDE-AI runtime, child-project runtime, or user-management runtime.

## Decision

The reusable application shell must be a workspace-aware Governance Console.

The same console concept must serve both the `threat-forge` platform workspace and governed child project workspaces. The console must expose common governance areas such as Dashboard, Project Model, Documentation, Graph, Gates, Threat Analysis, Users and Access, Reports, Audit, and Settings when the authenticated user and workspace capabilities allow them.

The navigation model must distinguish at least two workspace types:

- `PLATFORM`, used by the parent `threat-forge` workspace;
- `CHILD_PROJECT`, used by governed child project workspaces.

A `PLATFORM` workspace may expose a `Child Projects` navigation area because it owns child-project management. A `CHILD_PROJECT` workspace must not expose `Child Projects` navigation because nested child projects are out of scope.

Threat Analysis must be a first-level navigation area for both workspace types. Its future submenu should be able to expose Base Analysis, DFD, Assets/Boundaries/Flows, STRIDE, STRIDE-AI, Findings, Security Requirements, Mitigations, and Evidence/Review. The shell owns the existence and placement of the navigation area; `MR-0004`, `MR-0005`, and `MR-0006` own the domain semantics of the concrete analysis workflows.

Menu visibility must be derived from workspace type, authenticated user permissions, and available feature capabilities. React components must not hardcode child-project availability or analysis authorization. A future backend or application view-model boundary must provide enough normalized navigation information for the frontend to render allowed areas safely.

Threat-forge itself must be able to enter the same Threat Analysis navigation area used by child projects so the product can analyze itself through the same governed Base Analysis, STRIDE, and STRIDE-AI workflows once those workflows exist.

## Scope

In scope:

- reusable Governance Console shell concept;
- workspace-aware navigation for platform and child project workspaces;
- first-level Threat Analysis navigation for both workspace types;
- hiding child-project management from child project workspaces;
- menu visibility based on workspace type, authenticated user permissions, and feature capabilities;
- preserving the boundary between shell mechanics in `MR-0002` and domain semantics in `MR-0003` through `MR-0009`.

Out of scope:

- implementing routes, React components, layouts, API clients, or backend endpoints;
- implementing login, roles, permissions, sessions, memberships, or identity providers, which belong to `MR-0007`;
- implementing child-project creation or repository adapters, which belong to `MR-0003`;
- implementing Base Analysis, STRIDE, or STRIDE-AI runtime behavior, which belongs to `MR-0004`, `MR-0005`, and `MR-0006`;
- implementing reports, dashboards, audit storage, or evidence retention;
- defining exact UI styling, colors, or component library.

## Consequences

### Positive consequences

* The same UI concept can be reused for threat-forge and for child projects.
* Child project workspaces do not accidentally expose nested child-project management.
* Threat Analysis becomes a visible product area from the documentation stage.
* The shell can support self-analysis of threat-forge and analysis of child projects through one navigation model.
* Frontend routing can remain generic while workspace type, capability, and permission decisions remain explicit.
* Future OpenAPI and view-model contracts can expose normalized navigation state instead of leaking raw role or registry logic into React components.

### Negative consequences

* The menu model must account for workspace type and permissions from the beginning.
* The application shell cannot be a simple static route list.
* Future tests must cover at least platform and child-project navigation profiles.
* Threat Analysis navigation will appear before runtime analysis features exist, so early UI states must handle unavailable or not-yet-implemented workflows explicitly.

## Follow-up

1. Derive small shell/navigation requirements from this decision.
2. Add a child-project management requirement that child project workspaces do not create nested child projects.
3. Add initial `MR-0007` identity/access requirements so menu visibility can be governed by authenticated user permissions.
4. Later define the OpenAPI/view-model contract that returns workspace-aware navigation state.
5. Later implement protected routes and menu rendering only after route, API, and permission contracts exist.
