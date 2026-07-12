# MR-0002REQ-0057 — Project Documentation Explorer stable list-detail hierarchy

## Intent

The Project Documentation Explorer must keep its browsing flow predictable while adding richer taxonomy and field explanations.

## Requirement

MR-0002 must preserve a stable page hierarchy where filters remain at the top, the document list remains below the filters, and the selected item detail opens below the list in the same page.

## Scope

This requirement applies to the read-only Project Documentation Explorer frontend page and future UI refinements for requirements, ADRs, taxonomy records and other governed documentation entities.

It does not require route changes, document editing, taxonomy editing, gate execution or Base Analysis runtime behavior.

## Rules

- Search and filter controls must remain visible at the top of the Explorer page.
- The result list must remain below the filters.
- Selecting a document or taxonomy must render the detail below the list instead of replacing the list view entirely.
- Detail sections should be ordered from user-facing summary to deeper metadata.
- Technical trace, raw ids and registry paths must be secondary to readable labels and explanations.
- Any color or badge usage must reuse shared semantic styles or a centralized style convention.

## Acceptance Criteria

```gherkin
Scenario: User opens a document without losing browsing context
  Given a user is viewing Project Documentation Explorer results
  When the user selects a document or taxonomy item
  Then the filters remain at the top of the page
  And the result list remains above the selected detail
  And the selected detail opens below the list

Scenario: Technical metadata is not the primary explanation
  Given a selected document has raw ids and registry paths
  When the detail view renders
  Then readable labels and explanations appear before raw ids
  And raw ids remain available as secondary technical metadata
```

## Verification Expectation

A later UI micropasso must pass the frontend build and governed repository check. The implementation must preserve the Project Documentation Explorer read-only behavior.
