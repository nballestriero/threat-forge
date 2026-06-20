# ADR-0001 — Identity, membership and access boundary for the Governance Console

## Status

Accepted.

## Context

The Governance Console needs protected routes, user-aware navigation, project/workspace membership, and permissions. `MR-0002` owns reusable shell mechanics, protected route/page-guard mechanics, and frontend/backend application boundaries, but it must not define user, role, session, or authorization semantics.

Threat-forge must support the parent platform workspace and governed child project workspaces. Users may have different access levels in each workspace. The console must therefore derive allowed navigation and route access from authenticated identity, workspace membership, role or permission grants, and workspace capabilities.

The identity design must also avoid coupling controllers, React components, or domain services to a concrete authentication provider. The system should be able to start with local/development authentication and later support providers such as OIDC, GitHub OAuth, or enterprise SSO through explicit ports and adapters.

This step is intentionally document-only. It does not implement login, users, sessions, password storage, OAuth, OIDC, tokens, middleware, database schema, user interface screens, route guards, or authorization checks.

## Decision

Identity and access management must be governed by `MR-0007` and exposed to the reusable application shell through explicit application contracts.

The domain model must distinguish at least these concepts:

- user identity;
- authenticated session;
- workspace or project membership;
- role;
- permission;
- workspace capability;
- access decision.

A user may have different memberships and roles across the platform workspace and child project workspaces. Menu visibility and protected route decisions must be derived from the current authenticated user, the selected workspace, the user's membership in that workspace, role/permission grants, and workspace capabilities.

Authentication providers must be abstracted behind an identity provider port. Backend controllers must not instantiate concrete identity provider adapters. Future composition roots must decide whether the runtime uses a local/development adapter, OIDC adapter, GitHub adapter, enterprise SSO adapter, or another governed provider.

The frontend must receive normalized session, workspace, role, permission, and navigation/access information through API/view-model boundaries. React components must not infer authorization by reading raw user registries, project-model files, Git state, YAML, Markdown, or provider-specific token structures.

## Scope

In scope:

- identity/access domain boundary for users, sessions, memberships, roles, permissions, workspace capabilities, and access decisions;
- provider abstraction through a future identity provider port;
- access-controlled navigation and route decisions for the Governance Console;
- per-workspace membership and permission semantics;
- separation between shell mechanics in `MR-0002` and access semantics in `MR-0007`.

Out of scope:

- implementing authentication or authorization runtime code;
- choosing a concrete authentication provider;
- defining password, token, storage, refresh, or cryptographic details;
- implementing user-management UI screens;
- implementing audit/evidence retention, which belongs to `MR-0008`;
- implementing child-project management, which belongs to `MR-0003`;
- implementing threat-analysis runtime authorization details before analysis contracts exist.

## Consequences

### Positive consequences

* The application shell can remain reusable while identity semantics remain centralized in `MR-0007`.
* Users can have different roles in threat-forge and in each child project.
* Menu visibility and protected routes can be tested through explicit access decisions.
* Backend code can support multiple identity providers without coupling controllers to concrete adapters.
* Frontend components can consume normalized session/access state instead of provider-specific details.

### Negative consequences

* A minimal identity/access model must exist before real protected UI implementation.
* Route and menu tests must cover both workspace type and permission combinations.
* Provider abstraction adds design work before selecting a concrete login provider.
* Some UI features must remain disabled or unavailable until the access model and contracts are implemented.

## Follow-up

1. Derive small `MR-0007` requirements for user session, workspace membership, role/permission matrix, and access-controlled navigation.
2. Later define the first OpenAPI contract for session and navigation/access view models.
3. Later define backend service/port boundaries for identity provider integration.
4. Later implement local/development authentication only after requirements, graph relations, and code traceability records exist.
5. Later connect user actions to audit and evidence trail requirements under `MR-0008`.
