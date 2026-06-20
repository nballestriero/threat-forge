# MR-0002REQ-0021 — Capability-driven menu and route visibility mechanics

## Intent

The reusable Governance Console shell must support the initial registered-user policy without hardcoding permanent role checks into React components. It must also remain ready for future dynamic RBAC.

## Requirement

The Governance Console shell, menus, page guards, and protected routes must consume normalized capability or navigation view-model data when deciding which areas are visible, enabled, disabled, or forbidden.

React components must not permanently encode authorization rules by comparing raw role names such as `registered_user`. The shell may initially receive capabilities produced by a simple registered-user policy, but the UI mechanics must remain compatible with future dynamic and configurable RBAC policy decisions owned by `MR-0007`.

## Scope

This requirement applies to future frontend shell, route guard, menu, navigation, and API-client mechanics. It does not implement those mechanics in this step.

## Rules

- Menus must be derived from capability/navigation state.
- Protected routes must use capability/access decisions rather than hardcoded role checks.
- React components must not read YAML, Markdown, Git state, policy registries, or raw role storage to decide visibility.
- Backend/API view models must remain the preferred source of normalized navigation state.
- The shell must support the initial registered-user policy and future dynamic RBAC without redesign.

## Acceptance Criteria

```gherkin
Scenario: Menu is driven by capabilities
  Given an authenticated user opens the Governance Console
  When the shell renders navigation
  Then visible menu entries are based on normalized capabilities or navigation state
  And the shell does not hardcode permanent role comparisons in page components

Scenario: Dynamic policy can change visibility later
  Given future RBAC changes a user's capability set
  When the shell receives updated navigation state
  Then route and menu visibility change without rewriting individual React pages around role strings
```

## Verification Expectation

Future frontend tests must verify that menus and protected routes are derived from capability/navigation state and that individual React pages do not bypass the shell by embedding raw role checks.
