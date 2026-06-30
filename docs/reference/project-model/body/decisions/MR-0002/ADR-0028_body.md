# ADR-0028 — Governance Console Shell Navigation and Topbar Hierarchy Boundary

## Status

Accepted.

## Context

The Governance Console sidebar now uses semantic icon tokens, a reusable ThreatForge mark, centralized color tokens and normalized status badge semantics. The visual structure is still shallow: the sidebar, brand block, active navigation item, topbar title and read-only principal indicator are present, but their hierarchy is not explicit enough to guide later child-project, threat-analysis and reporting slices.

The mockup direction calls for a slim product shell with a clear brand anchor, compact meaningful navigation, a quiet active state and lightweight topbar utilities. The design system must own this hierarchy so feature pages do not create local sidebar or topbar treatments.

## Decision

ThreatForge will refine the Governance Console shell hierarchy inside the shared MR-0002 shell, token and stylesheet boundary. The shell will keep one left navigation rail and one topbar, but it will separate brand, navigation, page context, read-only status and utility affordances through named elements and semantic CSS classes.

Topbar utility affordances will be declared through shared design-system tokens and rendered as lightweight, non-mutating UI chrome. Navigation and topbar styling will consume existing semantic color variables and spacing rules rather than introducing page-local colors or scattered SVGs. The refinement is a presentation hierarchy step only; it does not add routing, mutation, authentication or child-project document data-source behavior.

## Scope

In scope:

- refining sidebar spacing, brand block rhythm and active navigation shape in the shared stylesheet;
- adding topbar utility tokens for notification/help/profile-like affordances;
- rendering topbar context, read-only status and utility affordances through the shared shell;
- adding any required icon drawings only through the shared semantic icon adapter;
- preserving compact read-only behavior and the existing active navigation contract.

Out of scope:

- adding interactive notification, help or profile behavior;
- changing backend capabilities, access control or user identity contracts;
- changing Project Documentation Explorer data-source fallback behavior;
- implementing the child-project documentation no-fallback bug fix;
- introducing external icon, layout or component libraries;
- changing page-specific Project Documentation Explorer or Governance Plan behavior.

## Consequences

### Positive consequences

- The shell visually matches the mockup direction more closely without adding heavy UI chrome.
- Future pages can reuse the same navigation and topbar hierarchy instead of defining local variants.
- Topbar utilities are visible as design-system chrome while remaining clearly non-mutating in this read-only slice.
- Icon and color decisions remain centralized.

### Negative consequences

- The shell component and stylesheet gain a few more named classes.
- Some topbar affordances are placeholders until governed runtime behavior is introduced.
- The bug where child-project document views can fall back to platform documents still requires a dedicated functional micropasso.

## Follow-up

1. Address the child-project documentation no-fallback bug with a dedicated backend/frontend data-source boundary.
2. Show live data-source status once the shell can distinguish platform, child and source-error states without ambiguity.
3. Link governance explanations to documentation details after the shell and source-state hierarchy are stable.
