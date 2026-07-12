# ADR-0025 — Governance Console Navigation Icon Refinement Boundary

## Status

Accepted.

## Context

The Governance Console shell already exposes sidebar navigation through shared MR-0002 design-system tokens and a semantic icon adapter. The current sidebar still needs a smaller visual refinement pass so the icon column resembles the mockup direction: compact, lightweight, meaningful outline drawings and clearly readable active and disabled states. The mockup also uses a specific ThreatForge shield monogram rather than a generic text block.

Without a governed boundary, individual pages could introduce scattered SVG fragments, page-local icon choices, ad-hoc brand marks or inline colors while refining navigation. That would make future shell navigation harder to keep coherent across the platform workspace and child-project workspaces.

## Decision

ThreatForge keeps Governance Console navigation icon selection centralized in the MR-0002 design-system token registry and renders concrete outline drawings only through the shared `Icon` adapter. The reusable ThreatForge shield monogram is also rendered from the shared design-system icon boundary rather than as page-local markup.

Sidebar navigation items may expose semantic presentation hints such as icon tone and disabled state label through the shared navigation token registry. The shell may render an icon cell, text label, reusable brand mark and compact state marker, but it must not embed page-local SVG assets or inline colors.

Active, hover and disabled navigation states are styled through shared CSS classes and semantic CSS custom properties. The active state must remain lightweight rather than using a heavy full-contrast block, and disabled items must remain legible while clearly non-interactive.

## Scope

In scope:

- refining the Governance Console sidebar icon drawings through the shared semantic icon adapter;
- rendering the ThreatForge shield monogram as a centralized design-system brand mark;
- adding centralized navigation presentation tokens used by the shared shell;
- rendering a consistent icon cell for sidebar navigation entries;
- improving active, hover and disabled navigation readability through shared stylesheet classes and CSS custom properties;
- preserving platform-only navigation filtering and disabled future capability placeholders.

Out of scope:

- adding page-local SVG assets;
- adding icon-library dependencies;
- claiming pixel-perfect brand identity finalization beyond the lightweight mockup-aligned shield monogram;
- changing route availability or capability policy behavior;
- changing backend contracts or read-model payloads;
- implementing currently planned Graph Explorer, Threat Analysis or Reports pages;
- changing taxonomy, gate plan or Project Documentation Explorer semantics.

## Consequences

### Positive consequences

- Sidebar icons and the ThreatForge mark can be refined consistently without touching feature pages.
- The visual hierarchy remains lightweight and coherent with the existing compact UI direction.
- Disabled future capabilities are easier to distinguish from active navigation without disappearing.
- Future icon implementation changes remain localized to the design-system adapter.

### Negative consequences

- The built-in outline icon set remains intentionally minimal until a governed icon-library decision exists.
- Navigation presentation tokens add a small amount of shell-specific design-system vocabulary.
- CSS custom properties must be kept aligned with later semantic color-token cleanup work.

## Follow-up

1. Continue with the broader semantic color-token centralization micropasso.
2. Normalize status badge semantics after navigation state styling is stable.
3. Revisit concrete glyph mapping only through a future governed design-system decision.
