# MR-0002REQ-0062 — Governance Console Navigation Item State Styling

## Intent

Make active and disabled Governance Console sidebar entries easier to understand while preserving the lightweight mockup-oriented visual style.

The requirement keeps navigation state styling centralized so later color-token cleanup can adjust the visual system without changing shell logic.

## Requirement

ThreatForge MUST style Governance Console sidebar navigation states through shared CSS classes and semantic CSS custom properties.

The active navigation entry MUST remain readable and visibly selected without relying on a heavy full-contrast block. Disabled navigation entries MUST remain legible, visibly planned or unavailable, and non-interactive.

## Scope

In scope:

- shared classes for navigation item, icon cell, label and compact state marker;
- active navigation styling through shared stylesheet rules;
- hover styling for enabled navigation entries;
- disabled navigation styling that keeps placeholders readable while preventing activation;
- CSS custom properties for navigation surfaces, borders and text treatments.

Out of scope:

- inline style attributes for navigation colors;
- page-local navigation styles;
- changing route enablement semantics;
- changing backend capability policy;
- implementing disabled future navigation destinations;
- adding a full theming engine.

## Rules

1. Navigation active state MUST be represented by a shared `is-active` class.
2. Navigation disabled state MUST be represented by disabled button behavior and shared visual classes.
3. Navigation colors MUST be expressed through shared CSS custom properties rather than JSX inline color values.
4. The active state MUST be visually distinct from hover and disabled states.
5. Disabled entries MUST not invoke navigation handlers.

## Acceptance Criteria

- The active Project Documentation entry is visibly selected with a lightweight shared style.
- Disabled Graph Explorer, Threat Analysis and Reports entries are readable but clearly unavailable.
- Platform-only entries continue to appear only in platform workspace navigation.
- Navigation styling is centralized in the shared stylesheet.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

The repository checks must include frontend build and runtime tests. Manual UI review may also use the local UI test environment runner to inspect active and disabled sidebar states in the browser.
