# MR-0002REQ-0018 — Workspace-aware child project navigation capability

## Intent

Child project management must be visible in the parent platform workspace but hidden from child project workspaces because nested child projects are intentionally out of scope.

This requirement keeps the navigation model aligned with the project-management boundary owned by `MR-0003`.

## Requirement

The future Governance Console navigation model must expose the `Child Projects` navigation area only for workspaces whose type and capabilities allow child-project management.

The parent `PLATFORM` workspace may expose `Child Projects` when the authenticated user has the required permission. A `CHILD_PROJECT` workspace must not expose `Child Projects`, even if the user has administrative permissions inside that child project, because child projects do not create or manage nested child projects.

## Scope

This requirement applies to future menu/view-model and route-guard behavior for child-project navigation.

It does not implement child-project creation, child-project storage, repository adapters, access-control runtime, or UI components.

## Rules

- `Child Projects` must be a platform workspace capability.
- `Child Projects` must not appear in child project workspace navigation.
- Route access must be consistent with menu visibility.
- Menu visibility must also consider authenticated user permissions from `MR-0007`.
- Child-project semantics and the no-nested-child-project rule belong to `MR-0003`.

## Acceptance Criteria

```gherkin
Scenario: Platform owner sees child project management
  Given the current workspace type is PLATFORM
  And the authenticated user has permission to manage child projects
  When the Governance Console navigation is rendered
  Then the Child Projects navigation area is available

Scenario: Child project user does not see nested child project management
  Given the current workspace type is CHILD_PROJECT
  And the authenticated user is an administrator of that child project
  When the Governance Console navigation is rendered
  Then the Child Projects navigation area is not available
```

## Verification Expectation

Future route and navigation tests must verify that child-project management is available only in platform workspace navigation and cannot be reached from child project workspaces through hidden routes.
