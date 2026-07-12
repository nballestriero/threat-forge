# MR-0002REQ-0039 — Shared frontend design-system ownership contract

## Intent

The frontend must not become a collection of unrelated pages with local templates, local controls and inconsistent visual rules. MR-0002 must provide the common design-system boundary used by all Governance Console pages.

## Requirement

The application frontend must organize reusable UI templates, layout primitives, base components and design tokens under a shared MR-0002 design-system area, and feature pages must consume those primitives instead of defining independent page templates.

## Scope

This requirement applies to the future React frontend structure for the Governance Console, including threat-forge platform pages and child-project workspace pages. It does not define the final concrete component library, styling technology or production build pipeline.

## Rules

- MR-0002 owns the shared Governance Console shell and design-system primitives.
- Feature pages must not define page-local application shells, page-local global navigation or page-local base themes.
- Shared primitives must include layout, typography, spacing, color, radius and reusable control concepts.
- The design system must support the accepted minimal monochrome visual direction.
- Child-project workspaces must reuse the same shell and hide platform-only areas through capability-aware navigation, not through separate templates.
- Frontend components must remain API/view-model driven and must not read YAML, Markdown, Git, filesystem, registries or graph files directly.

## Acceptance Criteria

```gherkin
Scenario: Feature page uses shared design-system ownership
  Given a new Governance Console page is implemented
  When the page needs layout, common controls or visual styling
  Then it uses MR-0002 shared shell and design-system primitives
  And it does not define a separate page-local application template
```

## Verification Expectation

Future frontend code review and code-traceability checks should verify that Governance Console pages import shared MR-0002 primitives for shell, layout and base controls instead of duplicating local templates.
