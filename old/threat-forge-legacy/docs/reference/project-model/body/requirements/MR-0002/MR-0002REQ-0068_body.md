# MR-0002REQ-0068 — Governance Console Topbar Utility Hierarchy

## Intent

Make the Governance Console topbar communicate page context, read-only status and lightweight utility affordances without adding ungoverned actions.

The requirement keeps the topbar useful as shared shell chrome while preserving the current read-only and non-mutating frontend slice.

## Requirement

ThreatForge MUST render the Governance Console topbar through shared shell and design-system tokens that separate context text, workspace/read-only status and utility affordances. Utility affordances MUST use semantic icon tokens and shared styling, and MUST remain non-mutating until separate governed behavior is introduced.

## Scope

In scope:

- topbar context hierarchy in the shared shell component;
- a shared token list for topbar utility affordances;
- lightweight utility icon rendering through the semantic icon adapter;
- read-only principal/status presentation through shared classes;
- stylesheet rules that reuse centralized semantic color variables.

Out of scope:

- implementing notifications, help dialogs, user profile menus or account actions;
- changing authentication, authorization or registered-user policy logic;
- reading live data-source health;
- fixing child-project documentation fallback behavior;
- adding external UI dependencies.

## Rules

1. Topbar context, status and utility affordances MUST be rendered by the shared shell.
2. Utility icons MUST resolve through semantic icon tokens rather than scattered SVG markup.
3. Placeholder utilities MUST NOT trigger mutations or pretend unavailable behavior is implemented.
4. Topbar styling MUST use shared CSS custom properties and classes, not inline colors.
5. The topbar MUST remain compact enough to preserve page content priority.

## Acceptance Criteria

- The topbar shows a clearer context hierarchy and read-only status.
- Utility affordances render through shared tokens and icons.
- The shell, token, icon and stylesheet JSDoc reference this requirement and its ADR.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

Manual UI review should confirm that the topbar is visually closer to the mockup, does not dominate the page and does not expose unimplemented interactive behavior.
