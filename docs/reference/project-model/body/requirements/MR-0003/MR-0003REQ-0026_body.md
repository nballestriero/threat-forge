# MR-0003REQ-0026 — Child Project Storage Portability and RBAC-Ready Operations

## Intent

Child-project management must remain database-portable and ready for user/RBAC protection as the platform evolves.

## Requirement

The system must keep child-project management operations behind backend service and capability boundaries so storage replacement and future RBAC policies do not require frontend hardcoding or database-specific authorization logic.

## Scope

This requirement applies to future child-project management commands, queries, backend capabilities and UI actions.

It does not implement RBAC runtime, users, roles, permissions, API endpoints, storage adapters or UI in this micropasso.

## Rules

- Child-project create, inspect, validate, generate-skeleton, commit/push and view-violations actions must be modeled as backend operations.
- Backend capabilities must determine which operations the UI may show or invoke.
- Authorization must not be implemented inside the SQLite adapter.
- Storage replacement must not change operation names, capability semantics or frontend visibility rules.
- Future audit and ownership metadata may be stored, but service/capability checks remain the authorization boundary.

## Acceptance Criteria

```gherkin
Scenario: UI action is capability-controlled
  Given a user opens the platform Child Projects area
  When the backend exposes child-project management capabilities
  Then the UI shows actions according to those capabilities
  And the storage adapter does not decide which actions are authorized
```

## Verification Expectation

Future backend and frontend tests must verify that child-project management actions are exposed through backend capabilities and do not require frontend hardcoded role checks or database-specific authorization behavior.
