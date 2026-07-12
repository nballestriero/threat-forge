# MR-0002REQ-0017 — Workspace-aware Governance Console shell

## Intent

The reusable application shell must support both the parent threat-forge workspace and governed child project workspaces without duplicating separate web applications.

This requirement makes the Governance Console the common UI container for documentation governance, project model navigation, graph browsing, gates, future threat analysis, users, reports, audit, and settings.

## Requirement

The future frontend application shell must render a workspace-aware Governance Console.

The console must be able to operate for at least two workspace types: the parent `PLATFORM` workspace and governed `CHILD_PROJECT` workspaces. It must present shared governance areas through a common shell while allowing workspace-specific capabilities to control which navigation entries appear.

The shell must not assume that every workspace supports every product area. Workspace capabilities and user permissions must drive the visible navigation and allowed route access.

## Scope

This requirement applies to future frontend shell, routing, and view-model design for the reusable Governance Console.

It does not implement React components, route definitions, backend endpoints, identity providers, user roles, child-project runtime, or threat-analysis runtime.

## Rules

- The shell must be reusable for the platform workspace and child project workspaces.
- The shell must treat workspace type as an explicit input.
- The shell must not hardcode child-project management availability for every workspace.
- The shell must render navigation from normalized application state, not from raw registries, YAML, Markdown, Git, or filesystem data.
- The shell must remain separate from identity semantics, which belong to `MR-0007`.
- The shell must remain separate from child-project management semantics, which belong to `MR-0003`.

## Acceptance Criteria

```gherkin
Scenario: Platform workspace uses the reusable Governance Console
  Given the current workspace is the threat-forge platform workspace
  When an authorized user opens the application
  Then the UI renders the shared Governance Console shell
  And the shell can expose platform-only capabilities when authorized

Scenario: Child project workspace uses the same Governance Console
  Given the current workspace is a governed child project workspace
  When an authorized user opens the application
  Then the UI renders the same shared Governance Console shell
  And the shell adapts navigation to the child project workspace capabilities
```

## Verification Expectation

Future frontend and API tests must verify that the shell can render platform and child-project workspace profiles from normalized application state without duplicating separate applications.
