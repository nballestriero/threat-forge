# MR-0002REQ-0024 — Shared application shell layout primitives

## Intent

The first UI needs reusable layout primitives so future areas do not duplicate shell and page structure.

## Requirement

The Governance Console implementation must provide shared shell layout primitives for navigation, workspace context, content area, list/detail browsing, entity detail, graph exploration, and common UI states.

The shell must be compatible with capability-driven visibility and workspace-aware navigation.

## Scope

This requirement applies to future frontend shell, layout components, Project Model Explorer pages, Graph Explorer pages, and future read-only governance views. It does not implement these components in this step.

## Rules

- The shell must provide a consistent navigation region.
- The shell must provide a consistent workspace/project context region.
- The shell must provide reusable list/detail layout primitives.
- The shell must provide a detail drawer or detail panel pattern for selected records and graph nodes.
- The shell must provide standard loading, empty, error, and forbidden states.
- The shell must not let individual pages bypass capability-driven visibility decisions.

## Acceptance Criteria

```gherkin
Scenario: Standard list/detail browsing
  Given a registered user opens requirements, ADR, macro-requirements, or taxonomies
  When the page displays records
  Then the page uses the shared list/detail layout primitives

Scenario: Standard UI states
  Given a read-only Project Model Explorer page is loading, empty, forbidden, or failed
  When the state is rendered
  Then the page uses shared state components rather than feature-specific ad-hoc messages
```

## Verification Expectation

Future component tests and implementation review must verify that read-only Project Model Explorer pages compose shared shell primitives instead of duplicating page-specific layout structures.
