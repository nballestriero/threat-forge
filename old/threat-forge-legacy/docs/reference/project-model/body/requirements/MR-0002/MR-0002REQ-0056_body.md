# MR-0002REQ-0056 — Project Documentation Explorer taxonomy value detail rendering

## Intent

The Project Documentation Explorer UI must make taxonomy records useful for study by showing what each taxonomy value means and how it supports documentation, filtering and future threat-analysis work.

## Requirement

MR-0002 must render taxonomy detail pages with a readable taxonomy-value section that uses the backend-provided explanation payload. The UI must show value ids, labels, descriptions, functions, UI metadata and security-analysis hints when available.

## Scope

This requirement applies to the read-only Project Documentation Explorer frontend page and its normalized client payload handling.

It does not apply to editing taxonomy values, adding graph visualizations, implementing Base Analysis screens, adding methodology-specific findings or changing taxonomy registry governance.

## Rules

- Taxonomy value rendering must consume backend-provided explanation fields.
- The UI must not hardcode the semantic meaning of specific taxonomy values.
- Raw ids may be shown for traceability but must not replace label and description display.
- Optional UI metadata and security-analysis hints must be rendered only when present.
- The detail page must remain read-only and must not mutate taxonomy registries.
- The UI must tolerate empty taxonomy value arrays.

## Acceptance Criteria

```gherkin
Scenario: Taxonomy detail renders governed value explanations
  Given a user opens a taxonomy entity in the Project Documentation Explorer
  When the backend detail payload includes taxonomy values
  Then the UI shows each value with its label or id
  And the UI shows description and function text when present

Scenario: Optional metadata remains optional
  Given a taxonomy value lacks UI metadata or security-analysis hints
  When the UI renders the taxonomy value
  Then the detail page remains usable
  And missing optional fields are omitted rather than shown as empty raw data
```

## Verification Expectation

A later implementation micropasso must pass the frontend build and governed repository check. The implementation must keep the Explorer read-only and preserve the existing list/detail navigation pattern.
