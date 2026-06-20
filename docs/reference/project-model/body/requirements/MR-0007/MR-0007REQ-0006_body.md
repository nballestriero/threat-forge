# MR-0007REQ-0006 — Access policy and capability decision boundary

## Intent

The first UI must not couple visibility or route access directly to raw role strings. Access decisions must flow through a boundary that can later be replaced by dynamic and configurable RBAC policy evaluation.

## Requirement

Threat-forge must expose access decisions through an explicit access-policy and capability boundary. The boundary must produce normalized capabilities or navigation decisions for the current user, selected workspace, workspace type, membership, role, and requested application area.

The first implementation may calculate capabilities using a simple registered-user bootstrap rule, but callers must depend on the boundary contract rather than on concrete policy logic.

## Scope

This requirement applies to future backend services, API view models, frontend route guards, and menu rendering. It does not implement those services or contracts in this step.

## Rules

- Access decisions must be represented as capabilities or normalized navigation decisions.
- Frontend callers must consume capabilities instead of raw role comparisons.
- Backend services must remain authoritative for protected data and operations.
- The boundary must be replaceable by future dynamic RBAC evaluation.
- Policy evaluation must be able to consider at least user identity, workspace, workspace type, membership, role, and application area.

## Acceptance Criteria

```gherkin
Scenario: UI receives capabilities rather than raw role policy
  Given an authenticated registered_user opens the Governance Console
  When the UI requests navigation state
  Then the response describes allowed capabilities or menu entries
  And React components do not need to compare raw role strings to decide visibility

Scenario: Policy implementation can be replaced
  Given the first policy returns capabilities using a bootstrap registered_user rule
  When dynamic RBAC is introduced later
  Then the capability boundary contract can remain stable while policy evaluation changes behind it
```

## Verification Expectation

Future API and frontend tests must verify that menu and route rendering are driven by normalized capabilities and that backend endpoints enforce access through the policy boundary.
