# MR-0001REQ-0034 — Semantic UI Metadata Tokens for Taxonomy Values

## Intent

Taxonomy values should support future UI and graph rendering without hardcoding colors, icons or renderer-specific presentation details into domain semantics.

## Requirement

Governed taxonomy values may include optional semantic UI metadata tokens for future graph legends, filters, badges, dashboards and Governance Console views.

Supported UI metadata must be semantic, such as icon token, color token, graph shape token or graph edge style token. Domain taxonomy records must not use raw hexadecimal colors or concrete frontend-library identifiers as canonical semantics.

## Scope

This requirement applies to future UI-facing taxonomy values used by Project Model Explorer, Governance Console, Base Analysis, DFD, STRIDE, STRIDE-AI, reporting and dashboards.

It does not define the concrete theme palette, icon library, graph renderer, React components or API contracts.

## Rules

- UI metadata is optional unless a later UI contract makes a specific token mandatory for a specific taxonomy.
- Color metadata must use semantic `color_token` values rather than raw concrete colors.
- Concrete light, dark and high-contrast color values must be supplied by a separate future theme or UI contract.
- Icon metadata must use semantic tokens rather than binding taxonomy governance to one frontend icon library.
- Graph shape and edge-style metadata must be renderer-independent tokens.

## Acceptance Criteria

```gherkin
Scenario: Taxonomy value provides UI hint without hardcoded color
  Given a Base Analysis component taxonomy value uses color_token component.backend
  When the Governance Console renders a graph legend
  Then the UI can map component.backend to the current theme palette
  And the taxonomy value remains unchanged if the concrete theme color changes
```

## Verification Expectation

Future taxonomy and UI contract validators must verify that UI metadata uses allowed semantic tokens and does not place raw theme values into domain taxonomy records.
