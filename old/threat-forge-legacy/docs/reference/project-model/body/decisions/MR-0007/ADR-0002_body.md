# ADR-0002 — Initial registered-user access policy and future dynamic RBAC boundary

## Status

Accepted.

## Context

The first Governance Console implementation should expose read-only documentation and graph exploration without waiting for a complete user-management product, configurable RBAC administration, identity-provider integration, or policy editor.

At the same time, the first UI must not hard-code permanent role checks into React routes, menu components, pages, or API clients. Threat-forge must eventually support dynamic and configurable RBAC policies across platform and child-project workspaces. The initial design therefore needs a small access policy that is simple enough for the first read-only UI, while preserving a replaceable policy boundary for future authorization rules.

The immediate product direction is a read-only Project Model Explorer and Graph Explorer. These areas may initially be visible to every authenticated user with a basic registered-user role. Future releases must be able to restrict each application area, menu entry, route, API capability, workspace action, and governance operation through a configurable policy model.

This step is intentionally document-only. It does not implement login, session storage, middleware, authorization runtime code, RBAC tables, policy administration UI, OpenAPI contracts, frontend components, route guards, or backend enforcement.

## Decision

The first Governance Console access policy must use a minimal `registered_user` role for authenticated users.

A `registered_user` may initially receive read-only capabilities for the Governance Console areas needed by the first Project Model Explorer implementation, including project-model overview, governed documentation browsing, requirement and ADR browsing, graph browsing, taxonomy browsing, and basic read-only reporting surfaces.

This initial policy is a bootstrap policy, not the final authorization model. All menu visibility, route visibility, and application-area access decisions must pass through an explicit access-policy and capability boundary. The boundary may initially return a simple capability set for `registered_user`, but its contract must be replaceable by future dynamic and configurable RBAC policy evaluation.

Future dynamic RBAC must be able to vary capabilities by user, role, workspace, project, workspace type, membership, application area, route, operation, and policy configuration. The frontend must consume normalized capability and navigation state rather than embedding permanent role comparisons. Backend enforcement must remain authoritative for protected data and operations.

`MR-0007` owns role, capability, access-policy, and future dynamic RBAC semantics. `MR-0002` owns the reusable shell, route guard mechanics, and capability-driven menu/rendering mechanics.

## Scope

In scope:

- initial `registered_user` role semantics for read-only Governance Console access;
- initial read-only capability set for Project Model Explorer and Graph Explorer navigation;
- explicit access-policy and capability boundary;
- future dynamic/configurable RBAC as an architectural requirement, not an immediate implementation;
- separation between MR-0007 authorization semantics and MR-0002 UI/route mechanics;
- prohibition against permanent hardcoded role checks in React components.

Out of scope:

- implementing authentication or authorization code;
- choosing an identity provider;
- implementing dynamic RBAC storage, policy editor, or administration screens;
- defining complete role matrices for owner, maintainer, reviewer, contributor, auditor, or viewer;
- implementing OpenAPI contracts for session or capability view models;
- implementing frontend route guards or menu components;
- implementing backend middleware or service enforcement.

## Consequences

### Positive consequences

* The first read-only UI can start with a simple and understandable access rule.
* React components and routes will be designed around capabilities rather than hardcoded roles.
* Future dynamic RBAC can replace the bootstrap policy without redesigning the entire shell.
* Backend services can remain the authoritative source for protected data and operations.
* The product can show value earlier while preserving a security-oriented policy boundary.

### Negative consequences

* The first implementation must introduce a capability/access view-model boundary even though policy logic is initially simple.
* Tests must verify capability-driven rendering rather than only testing a single role string.
* Full role administration remains deferred and must not be mistaken for implemented RBAC.
* Some authorization details will remain intentionally coarse until future RBAC requirements are defined.

## Follow-up

1. Derive requirements for the initial `registered_user` read-only policy, capability boundary, and future dynamic RBAC configurability.
2. Derive an `MR-0002` requirement that menus and protected routes consume capability/navigation view models instead of hardcoded role checks.
3. Later define the first session/access OpenAPI view-model contract before implementing UI route guards.
4. Later implement only the minimal bootstrap policy needed by the read-only Project Model Explorer slice.
5. Later define dynamic RBAC configuration, storage, administration, and audit requirements before implementing policy management.
