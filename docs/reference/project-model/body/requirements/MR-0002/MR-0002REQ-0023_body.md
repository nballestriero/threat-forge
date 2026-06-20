# MR-0002REQ-0023 — Minimal monochrome UI theme direction

## Intent

Threat-forge needs a restrained, document-centric visual style that keeps project-model records and graph relations readable.

## Requirement

The Governance Console visual design must use a minimal black/white/gray foundation with restrained semantic accents. The style should be sober, readable, and similar in spirit to Git, GitHub, or ChatGPT rather than decorative dashboards.

Concrete raw colors must be governed by a future UI/theme contract. Domain, taxonomy, status, and graph semantics must reference semantic tokens rather than raw color values.

## Scope

This requirement governs future visual design, theme, CSS, component styling, and graph visualization defaults. It does not create concrete design-token files or CSS in this step.

## Rules

- The default visual language must be minimal, high-legibility, and document-first.
- Black, white, and gray must form the base visual palette.
- Semantic color accents must be restrained and token-based.
- Raw colors must not be embedded as domain semantics in feature components.
- The visual direction must remain compatible with future light, dark, and accessibility themes.

## Acceptance Criteria

```gherkin
Scenario: Minimal visual foundation
  Given the Governance Console is implemented
  When a user views documentation or graph records
  Then the interface prioritizes typography, whitespace, borders, and readable hierarchy over decorative color

Scenario: Semantic colors are token-based
  Given a taxonomy value or graph node has a visual meaning
  When the UI renders it
  Then the UI uses semantic tokens or theme mappings rather than raw domain colors embedded in feature code
```

## Verification Expectation

Future UI review must confirm that documentation and graph views follow the minimal theme direction and that semantic accent usage is routed through controlled tokens or theme mappings.
