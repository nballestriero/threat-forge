# MR-0007REQ-0005 — Initial registered-user read-only access policy

## Intent

The first Governance Console UI needs a minimal access policy that allows authenticated users to view read-only documentation and graph exploration without waiting for the full future RBAC system.

## Requirement

Threat-forge must define an initial `registered_user` role for authenticated users. A user with this role may initially receive read-only capabilities for the first Governance Console surfaces needed by the Project Model Explorer and Graph Explorer.

The initial read-only capabilities must be limited to viewing governed project-model information and must not imply permission to mutate documentation, registries, graph records, taxonomy values, child-project configuration, user accounts, policies, analysis records, findings, mitigations, evidence, or repository state.

## Scope

This requirement defines initial authorization semantics only. It does not implement users, sessions, login, middleware, role storage, route guards, API endpoints, React components, or dynamic RBAC.

## Rules

- The initial role name is `registered_user`.
- The initial role grants read-only Governance Console visibility only.
- The role must not imply write, approve, manage, delete, run-gate, or configure-policy capabilities.
- The initial policy must be treated as a bootstrap policy.
- Future RBAC requirements may refine or replace this bootstrap policy without changing the UI architecture.

## Acceptance Criteria

```gherkin
Scenario: Registered user can view read-only governance surfaces
  Given an authenticated user has the registered_user role
  When the user opens the first Governance Console implementation
  Then the user can access read-only Project Model Explorer and graph browsing surfaces
  And the user does not receive write or administration capabilities

Scenario: Registered user policy remains bootstrap-only
  Given the initial policy grants read-only access
  When future dynamic RBAC is introduced
  Then the initial role rule can be replaced or refined without rewriting React components around hardcoded role checks
```

## Verification Expectation

Future access-policy tests must verify that `registered_user` receives only the expected read-only capabilities and no mutation or administration capabilities.
