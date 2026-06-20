# MR-0002REQ-0008 — Project Model Explorer UI state boundary

## Intent

The Project Model Explorer will need loading, error, empty, selection, filter, and diagnostic states, but those states should not be mixed with raw source parsing.

This requirement defines the initial UI state boundary before a concrete UI is implemented.

## Requirement

The Project Model Explorer frontend boundary must represent UI states separately from governed source data.

The explorer may support loading, empty, error, selected node, selected relationship, active filters, visible lifecycle states, diagnostics, and traversal context as UI state. Those states must operate on the normalized explorer view model rather than raw project-model files.

## Scope

This requirement applies to frontend state modeling for the first read-only explorer slice.

It does not define the final route structure, graph layout, color palette, filtering taxonomy, selection UX, or component implementation.

## Rules

- Explorer UI state must be derived from or applied to the normalized view model.
- UI state must not become a substitute source of truth for project-model records.
- Loading, empty, error, and diagnostic states must be representable at the explorer boundary.
- Selection and filter state must use stable governed IDs or view-model IDs.
- Graph layout state must remain presentation state and must not change governed project-model relationships.
- Reporting/dashboard state belongs to `MR-0009` unless a later ADR explicitly shares a reusable boundary.

## Acceptance Criteria

```gherkin
Scenario: Explorer shows loading and error states through the boundary
  Given the frontend requests Project Model Explorer data
  When the request is pending or fails
  Then the UI can represent loading or error state
  And those states do not require parsing source files in React components

Scenario: Explorer filters operate on normalized model IDs
  Given the explorer view model contains nodes and relationships
  When a user filters or selects model elements
  Then the UI state references stable view-model or governed IDs
  And it does not mutate the governed project-model source records
```

## Verification Expectation

Future frontend tests must verify that explorer state management operates on the normalized view model and preserves the read-only project-model boundary.
