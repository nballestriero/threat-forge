# MR-0003REQ-0005 — No nested child project workspaces

## Intent

Governed child projects must not create or manage their own child projects.

This requirement keeps the project hierarchy simple: threat-forge governs child projects, while child projects remain analyzable workspaces rather than platforms for further nesting.

## Requirement

The child-project management model must treat nested child projects as out of scope.

Only the parent threat-forge platform workspace may expose child-project management capabilities. Governed child project workspaces must not create, list, manage, or govern child projects of their own through the standard product model.

## Scope

This requirement applies to child-project hierarchy and future child-project management capabilities.

It does not implement project storage, workspace selection, UI routes, repository adapters, authorization logic, or migration behavior.

## Rules

- A child project workspace must not create child projects.
- A child project workspace must not expose child-project management as an owned capability.
- The platform workspace may manage child projects when authorized.
- The reusable shell may hide child-project navigation for child project workspaces, but the project-management rule is owned here.
- Any future exception for nested project structures must require a governed ADR before implementation.

## Acceptance Criteria

```gherkin
Scenario: Child project cannot manage nested child projects
  Given the current workspace is a governed child project
  When child-project capabilities are evaluated
  Then nested child-project creation and management are unavailable

Scenario: Platform remains the child-project owner
  Given the current workspace is the threat-forge platform workspace
  When child-project management capabilities are evaluated
  Then the platform can own child-project management subject to permissions
```

## Verification Expectation

Future child-project capability tests must verify that nested child-project management is unavailable for child project workspaces and that only the platform workspace can own child-project management.
