# MR-0002REQ-0067 — Governance Console Shell Navigation Hierarchy

## Intent

Keep the Governance Console sidebar compact, recognizable and consistent with the mockup-inspired shell direction while preserving the shared design-system boundary.

The requirement prevents feature pages from creating local navigation chrome or overriding the active, disabled and brand hierarchy outside the shared shell.

## Requirement

ThreatForge MUST render Governance Console sidebar navigation through the shared MR-0002 shell hierarchy. The sidebar MUST provide a compact brand anchor, meaningful semantic icons, readable active state, subtle disabled/planned state and consistent spacing using shared stylesheet classes and tokens.

## Scope

In scope:

- the shared Governance Console shell component;
- sidebar brand block rhythm and label hierarchy;
- navigation item spacing, icon cell treatment and active/disabled states;
- CSS custom properties and shared classes owned by the MR-0002 stylesheet;
- semantic icon tokens already governed by the design system.

Out of scope:

- adding new route targets;
- changing capability evaluation or platform-only navigation rules;
- implementing child-project document data-source behavior;
- adding external icon or component libraries;
- page-specific list/detail layout changes.

## Rules

1. Sidebar navigation MUST be rendered through the shared shell component.
2. Navigation item visuals MUST use shared CSS classes and semantic tokens, not inline colors.
3. Active and disabled navigation states MUST remain visually distinct but lightweight.
4. The brand mark MUST remain a shared design-system element rather than a page-local asset.
5. Feature pages MUST NOT duplicate sidebar navigation markup to create local hierarchy variants.

## Acceptance Criteria

- The shared shell renders sidebar brand and navigation with the refined hierarchy.
- Active, disabled and planned states remain readable in the local UI test environment.
- The stylesheet and shell JSDoc reference this requirement and its ADR.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

Manual UI review should confirm that the sidebar remains slim, the active navigation item is clear, disabled/planned items are not mistaken for available actions and the hierarchy remains close to the approved mockup direction.
