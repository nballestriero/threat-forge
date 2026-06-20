# MR-0007REQ-0004 — Access-controlled navigation and route decisions

## Intent

The Governance Console menu and protected routes must reflect both workspace capabilities and user permissions.

This requirement connects `MR-0007` access semantics to the reusable shell mechanics owned by `MR-0002`.

## Requirement

The future access model must provide access decisions that can drive menu visibility and protected route behavior for the Governance Console.

A navigation or route decision must be based on the authenticated user, current workspace, workspace type, workspace capabilities, active membership, role/permission grants, and requested application area.

The frontend may render allowed menu entries, disabled menu entries, or forbidden states from normalized access/navigation state, but backend enforcement must remain authoritative for protected operations.

## Scope

This requirement applies to future access-decision contracts and their use by the shell and route guards.

It does not implement routes, menu components, auth middleware, backend services, OpenAPI schemas, or frontend clients.

## Rules

- Menu visibility must derive from explicit access decisions.
- Protected routes must be consistent with access decisions.
- Backend enforcement must be authoritative for protected operations.
- Navigation decisions must consider both workspace type and user permissions.
- The shell must not infer authorization from raw project files, raw user records, or provider-specific token payloads.

## Acceptance Criteria

```gherkin
Scenario: Navigation uses access decisions
  Given an authenticated user has selected a workspace
  When the application requests navigation state
  Then the returned navigation state reflects workspace type, workspace capabilities, membership, role, and permissions

Scenario: Protected route denies unauthorized user
  Given a user lacks permission for an application area
  When the user attempts to open its protected route directly
  Then the application receives a denied or forbidden decision
  And protected data is not returned
```

## Verification Expectation

Future API, route-guard, and backend authorization tests must verify that navigation and route decisions use normalized access decisions and that backend enforcement cannot be bypassed by direct route access.
