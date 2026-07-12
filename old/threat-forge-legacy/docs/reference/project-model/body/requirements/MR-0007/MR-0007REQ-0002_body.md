# MR-0007REQ-0002 — Workspace membership model

## Intent

Users may have different roles and permissions in the threat-forge platform workspace and in each child project workspace.

This requirement defines workspace membership as the bridge between identity and project-specific access decisions.

## Requirement

The future identity/access model must support workspace membership records that associate users with platform or child project workspaces.

A membership must be able to describe at least which user belongs to which workspace, whether the membership is active, and which role or permission set applies within that workspace.

The same user may hold different memberships in different workspaces. Access decisions must evaluate the selected workspace rather than assuming one global role is valid everywhere.

## Scope

This requirement applies to future access model, workspace selection, and authorization contract design.

It does not implement persistence, invitation flows, user-management UI, role editing, audit logging, or child-project storage.

## Rules

- Access must be evaluated in the context of the current workspace.
- A user may have different roles across workspaces.
- Platform membership must not automatically imply child project membership unless a governed rule explicitly says so.
- Child project membership must not grant platform child-project management capabilities.
- Membership semantics belong to `MR-0007`; workspace hierarchy semantics belong to `MR-0003`.

## Acceptance Criteria

```gherkin
Scenario: User has different roles across workspaces
  Given a user belongs to the platform workspace as Owner
  And the same user belongs to a child project as Security Reviewer
  When access is evaluated for the child project workspace
  Then the child project role is used for child project decisions
  And the platform role is not blindly reused as the child project role

Scenario: Membership is workspace-scoped
  Given a user has access to one child project
  When the user selects another child project without membership
  Then protected areas for that second child project are not available
```

## Verification Expectation

Future authorization and navigation tests must verify that memberships are evaluated per workspace and that global shortcuts do not bypass workspace-scoped access.
