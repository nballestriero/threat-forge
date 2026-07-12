# MR-0003REQ-0065 — Governance gate semantic explanation and technical trace separation

## Intent

Users must be able to understand a planned gate before reading raw ids, evidence markers or registry implementation details.

## Requirement

MR-0003 must separate primary gate explanations from secondary technical trace in Governance gate plan details. Primary sections must explain why the gate was selected, what it checks, which areas it validates, which capabilities it requires, what result is expected and how the gate contributes to threat-analysis readiness. Raw ids and evidence markers must be grouped under a technical trace section.

## Scope

This requirement applies to the read-only Governance gate plans UI and its mapping of backend-provided explanation fields.

It does not require changing the gate planner, executing gates, changing registry ids, or adding Base Analysis runtime behavior.

## Rules

- The first expanded gate section must explain why the gate is selected when the backend provides rationale.
- The UI must distinguish checked objects, checked areas, capabilities and expected result from raw evidence markers.
- Validation surfaces must be shown as checked areas before their raw ids.
- Capabilities must be shown as required abilities before their raw ids.
- Technical trace must contain raw gate ids, raw capability ids, raw validation surface ids, planner evidence markers and source registry paths when present.
- Technical trace must not be the primary explanation shown to users.

## Acceptance Criteria

```gherkin
Scenario: Gate detail prioritizes semantic explanation
  Given a gate detail has explanation fields and technical trace fields
  When the gate is expanded
  Then the UI shows why the gate was selected before raw ids
  And the UI shows what the gate checks before planner evidence markers

Scenario: Raw markers remain available as technical trace
  Given a gate explanation includes raw evidence markers
  When the gate detail renders
  Then the raw markers are available in a technical trace section
  And they do not replace checked-area or capability explanations
```

## Verification Expectation

A later frontend micropasso must pass the frontend build and governed repository check. The implementation must use backend-provided explanation fields and must not hardcode the semantic meaning of individual gate ids.
