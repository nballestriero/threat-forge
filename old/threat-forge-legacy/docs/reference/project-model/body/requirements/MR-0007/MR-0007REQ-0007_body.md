# MR-0007REQ-0007 — Future dynamic RBAC configurability boundary

## Intent

Threat-forge must start with a simple read-only access policy, but the architecture must preserve the ability to introduce dynamic and configurable RBAC later.

## Requirement

The access model must reserve a future dynamic RBAC boundary capable of evaluating configurable policies by user, role, workspace, workspace type, membership, application area, route, operation, and policy configuration.

The first registered-user policy must not be treated as the final authorization model. It must be documented and implemented later as a replaceable bootstrap policy behind the same access-policy/capability boundary.

## Scope

This requirement defines future configurability constraints. It does not implement RBAC configuration storage, policy editing UI, policy language, audit trails, role administration, or migration behavior.

## Rules

- Dynamic RBAC is future work and must not be implemented before dedicated ADRs, requirements, graph relations, and contracts exist.
- The first UI/API architecture must not prevent dynamic RBAC from being introduced later.
- Capabilities must be expressible per workspace and application area.
- Policy evaluation must be able to become data-driven/configurable without changing React page logic.
- Future policy changes must be auditable through `MR-0008` requirements when policy management is implemented.

## Acceptance Criteria

```gherkin
Scenario: Bootstrap policy does not block future configurable RBAC
  Given the first implementation uses registered_user read-only capabilities
  When future configurable RBAC is designed
  Then the policy implementation can become dynamic without replacing the shell or Project Model Explorer pages

Scenario: Future RBAC can vary by workspace
  Given a user belongs to multiple workspaces
  When dynamic RBAC is introduced
  Then capabilities can differ by selected workspace and workspace type
```

## Verification Expectation

Future architecture and implementation tests must verify that UI capability consumption is independent from the concrete policy source and that policy decisions can vary by workspace.
