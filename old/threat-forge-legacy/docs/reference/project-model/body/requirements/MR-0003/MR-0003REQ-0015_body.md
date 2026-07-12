# MR-0003REQ-0015 — Child Project RBAC-Ready Capability Boundary

## Intent

Child-project management actions must be protectable by users, roles, project membership, and RBAC without rewriting UI logic.

## Requirement

The system must represent child-project management actions through backend capabilities so future user and RBAC policies can control visibility and execution without frontend hardcoding.

## Scope

This requirement applies to future child-project management capabilities and authorization integration.

It does not implement users, roles, permissions, RBAC storage, policy administration, or authentication changes in this micropasso.

## Rules

- Child-project create, view, configure, skeleton-generate, gate-run, lifecycle-approve, and threat-analysis-result actions must be capability-addressable.
- Frontend child-project UI must consume backend capabilities for visibility and enablement.
- Capabilities must be compatible with future MR-0007 identity, user, role, membership, and RBAC policies.
- Unauthorized actions must be hideable or rejectable at the backend boundary.
- Frontend code must not become the source of authorization truth.

## Acceptance Criteria

```gherkin
Scenario: RBAC controls child-project action availability
  Given future RBAC policies are configured
  When a user lacks the capability to generate a child-project skeleton
  Then the frontend does not expose that action as available
  And the backend rejects direct execution attempts
```

## Verification Expectation

Future capability-boundary tests must verify that child-project management action visibility and execution are controlled by backend capabilities compatible with MR-0007 RBAC policy.
