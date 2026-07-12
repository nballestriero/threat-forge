# MR-0002REQ-0063 — Governance Console Semantic Color Token Registry

## Intent

Keep Governance Console color choices auditable and coherent by defining the semantic UI color vocabulary in the shared MR-0002 design-system boundary.

The requirement prevents feature pages from inventing local color names or duplicating raw palette values when they need common text, surface, border, action, shadow or status accent colors.

## Requirement

ThreatForge MUST define reusable semantic UI color token groups for the Governance Console in the shared frontend design-system token module.

The token groups MUST describe the intended semantic use of colors for canvas, surfaces, borders, text, focus, action, shadow and status accent treatments. Feature pages and shared components MUST treat these semantic groups as the stable design-system vocabulary instead of defining page-local color semantics.

## Scope

In scope:

- semantic color token groups in the shared MR-0002 design-system token module;
- token names for canvas, surface, border, text, focus, action, shadow and status accent usage;
- compatibility with the existing lightweight mockup-aligned palette;
- documentation through exported token structures and file-level JSDoc traceability.

Out of scope:

- runtime theme switching;
- user preferences for color schemes;
- external design-system packages;
- status-to-badge behavior changes;
- backend read-model or registry changes.

## Rules

1. The design-system token module MUST expose a semantic color-token registry for shared frontend use.
2. Token groups MUST be named by semantic purpose rather than by raw color value.
3. Shared UI components SHOULD consume the semantic vocabulary directly or through matching CSS custom properties.
4. Feature pages MUST NOT create page-local semantic color registries for Governance Console surfaces.
5. The token registry MUST preserve the current lightweight visual direction unless a later governed decision changes it.

## Acceptance Criteria

- The shared design-system token module exports semantic UI color token groups.
- Color token groups cover text, surfaces, borders, focus, action, shadow and status accent use cases.
- The token module JSDoc references this requirement and its ADR.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

The repository checks must include graph format validation, code traceability validation, frontend build and runtime tests.
