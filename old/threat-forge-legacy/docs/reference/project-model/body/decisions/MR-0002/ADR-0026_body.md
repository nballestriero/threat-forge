# ADR-0026 — Governance Console Semantic Color Token Boundary

## Status

Accepted.

## Context

The Governance Console already uses a shared stylesheet and a frontend design-system token module, but several semantic color values still appear as repeated raw values across component classes. Recent UI refinements improved badges, information popovers and navigation state styling, and the next safe step is to make those color choices easier to audit and adjust without changing feature components.

Without a governed semantic color boundary, future refinements could add page-local colors, duplicate status accents, or couple component CSS directly to raw palette values. That would make the mockup-aligned UI harder to keep coherent across Project Documentation Explorer, Governance gate plans, child-project pages and future Threat Analysis screens.

## Decision

ThreatForge centralizes Governance Console color semantics in the MR-0002 design-system boundary. The frontend token module records the semantic vocabulary for canvas, surfaces, borders, text, focus, shadow, action and status accent groups. The shared stylesheet exposes matching CSS custom properties and component rules consume those semantic custom properties instead of repeated raw color literals.

The stylesheet may keep raw color literals only in the root token definition block, where they define the canonical palette and semantic aliases. Feature component rules must prefer semantic CSS custom properties for color, background, border, focus, shadow and status marker treatments.

This decision does not introduce a theme switcher. It creates a small, auditable token layer that preserves the current lightweight visual appearance while preparing later badge and shell hierarchy refinements.

## Scope

In scope:

- adding semantic UI color token groups to the MR-0002 design-system token module;
- defining matching CSS custom properties in the shared stylesheet root;
- replacing repeated component-level raw color literals with semantic custom properties;
- preserving the existing visual appearance of surfaces, borders, text, navigation, popovers, shadows and status accents;
- documenting that feature components should consume semantic color tokens rather than local color values.

Out of scope:

- adding dark mode or user-selectable themes;
- changing brand identity beyond the existing lightweight ThreatForge mark;
- changing status badge class mapping or taxonomy/gate semantics;
- changing backend contracts, read-model payloads or snapshot generation;
- fixing child-project documentation source fallback behavior;
- adding external design-system or CSS framework dependencies.

## Consequences

### Positive consequences

- Color refinements can be reviewed through a smaller semantic vocabulary.
- Badge, navigation, popover and shell colors can converge without page-local overrides.
- Later status badge normalization can reuse existing token groups instead of introducing new palette values.
- The UI keeps the current lightweight mockup direction while reducing duplicated raw values.

### Negative consequences

- The root stylesheet contains more CSS custom properties.
- Token names must remain stable and understandable as the UI grows.
- This step does not by itself validate that every future component avoids raw colors.

## Follow-up

1. Normalize status badge semantics using the centralized status accent tokens.
2. Refine shell navigation and topbar hierarchy using the same semantic token vocabulary.
3. Add a dedicated no-fallback child-project documentation source micropasso before relying on child project document views.
