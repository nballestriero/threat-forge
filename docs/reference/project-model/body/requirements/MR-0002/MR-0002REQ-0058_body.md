# MR-0002REQ-0058 — Project Documentation Explorer taxonomy field allowed-value explanation hierarchy

## Intent

Users must be able to understand taxonomy-backed fields directly on document detail pages, including the current value and the other values the field may assume.

## Requirement

MR-0002 must render taxonomy-backed document fields as explainable field groups. Each field group must show the current value, the source taxonomy and the allowed values for that taxonomy with descriptions when those descriptions are available from the backend view-model.

## Scope

This requirement applies to Project Documentation Explorer detail rendering for fields whose values are governed by taxonomy records.

It does not require new taxonomy registry fields in this micropasso, taxonomy editing, dynamic taxonomy extension storage or methodology runtime screens.

## Rules

- A taxonomy-backed field must show its current value before the full allowed-value list.
- The current value must use the label and description supplied by the backend when available.
- The source taxonomy id must be visible and should be linkable to the taxonomy detail when the Explorer supports that navigation.
- The allowed-value list must include every value supplied by the backend for the source taxonomy.
- Each allowed value must show label, description, function and security-analysis hints when available.
- The UI must not hardcode the semantic meaning of individual taxonomy values.
- Raw value ids may be shown for traceability but must not be the only displayed explanation.

## Acceptance Criteria

```gherkin
Scenario: Document field shows current taxonomy value and allowed values
  Given a selected document has a taxonomy-backed field
  When the backend provides the current value and allowed values
  Then the UI shows the current value with its explanation
  And the UI shows the source taxonomy
  And the UI shows the allowed values with their descriptions when available

Scenario: Missing optional value metadata does not break the page
  Given an allowed taxonomy value lacks optional function or security-analysis metadata
  When the document detail renders the allowed-value list
  Then the value still appears with its id or label
  And the missing optional fields are omitted rather than rendered as empty placeholders
```

## Verification Expectation

A later implementation micropasso must pass the frontend build, Project Documentation Explorer runtime tests when affected, and the governed repository check.
