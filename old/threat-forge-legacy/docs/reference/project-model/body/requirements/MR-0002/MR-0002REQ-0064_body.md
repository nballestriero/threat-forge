# MR-0002REQ-0064 — Governance Console Stylesheet Semantic Color Consumption

## Intent

Reduce scattered raw color usage in the shared Governance Console stylesheet while preserving the current visual appearance.

The requirement keeps styling changes small and safe by moving repeated color values behind semantic CSS custom properties before later badge and shell hierarchy refinements.

## Requirement

ThreatForge MUST express shared Governance Console component color styling through semantic CSS custom properties defined in the shared stylesheet root.

Component rules MUST use semantic custom properties for text, surfaces, borders, focus, shadows, action controls, navigation state and status accents instead of repeating raw color literals across component selectors. Raw palette values MAY remain in the root custom-property definition block as the canonical color source.

## Scope

In scope:

- root-level CSS custom properties for semantic color groups;
- preserving existing component appearance by mapping old values to semantic aliases;
- replacing repeated component-level raw color literals in the shared stylesheet;
- using status accent marker tokens for badge dots;
- keeping navigation and brand mark colors behind custom properties.

Out of scope:

- changing layout, spacing or typography;
- changing status badge class mapping;
- introducing CSS-in-JS or external styling dependencies;
- adding a theme switcher;
- changing child-project documentation data-source behavior.

## Rules

1. The shared stylesheet root MUST define semantic custom properties for core UI color roles.
2. Component selectors MUST use semantic custom properties for repeated color treatments.
3. Raw color literals MUST NOT be repeated in component selectors when a semantic custom property exists.
4. Status badge marker colors MUST use semantic status accent custom properties.
5. The visual treatment MUST remain lightweight and consistent with the approved mockup direction.

## Acceptance Criteria

- Repeated component-level color literals are replaced with semantic CSS custom properties.
- Badge status marker colors use status accent custom properties.
- Navigation, brand mark, focus and shadow treatments remain governed by shared stylesheet tokens.
- The UI build succeeds without changing frontend behavior.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

The repository checks must include frontend build and runtime tests. Manual UI review may use `npm run dev:ui-test:start` to confirm the appearance remains unchanged.
