# MR-0002REQ-0027 — Read-only Graph Explorer layout and interaction pattern

## Intent

The first graph interface must make project-model relationships understandable without becoming a separate visual system.

## Requirement

The first Graph Explorer UI slice must be read-only and must use the shared Governance Console template. It must provide a graph workspace for project-model nodes and SPO relations, basic filtering by node type, predicate, and macro-requirement, entity selection, and a detail panel or drawer for selected nodes or relations.

The graph view must prioritize clarity, traceability, and navigation over decorative visualization.

## Scope

This requirement applies to the future read-only graph explorer UI. It does not implement graph rendering code, layout algorithms, API endpoints, or graph view-models in this step.

## Rules

- The graph explorer must be read-only in the first implementation slice.
- The graph explorer must use shared shell, typography, status, icon, and detail patterns.
- The graph explorer must support basic node type, predicate, and macro-requirement filtering.
- Selecting a node or relation must open a governed detail panel or drawer.
- The graph explorer must not mutate graph records or write analysis data.
- The graph explorer must consume normalized graph view models from backend/API boundaries.

## Acceptance Criteria

```gherkin
Scenario: User filters project-model graph relations
  Given an authenticated registered user has graph read capability
  When the user opens the Graph Explorer
  Then the user can filter by node type, predicate, and macro-requirement
  And selecting a node or relation shows a governed detail view

Scenario: Graph explorer is read-only
  Given the first Graph Explorer implementation is active
  When the user browses graph nodes and relations
  Then no graph editing or mutation actions are exposed
```

## Verification Expectation

Future frontend and API integration tests must verify that the graph explorer renders normalized graph view models, supports basic filters, and does not expose graph mutation actions in the first slice.
