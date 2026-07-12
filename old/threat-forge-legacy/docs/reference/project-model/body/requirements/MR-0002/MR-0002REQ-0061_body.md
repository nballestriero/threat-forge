# MR-0002REQ-0061 — Governance Console Semantic Navigation Icon Registry

## Intent

Keep Governance Console sidebar icons and the lightweight ThreatForge shield mark consistent and replaceable by selecting or rendering them through the shared MR-0002 design-system boundary.

The requirement prevents individual pages from embedding their own icon assets or ad-hoc brand mark while allowing the shared shell to refine the sidebar visual hierarchy.

## Requirement

ThreatForge MUST render Governance Console sidebar icons from semantic navigation tokens owned by the shared design-system registry and resolved by the shared `Icon` adapter. The shell brand mark MUST render through the same shared design-system icon boundary as a reusable ThreatForge shield monogram.

Feature pages and shell navigation entries MUST NOT embed scattered SVG fragments, raw glyph choices, ad-hoc brand marks or inline icon colors outside that shared boundary.

## Scope

In scope:

- central navigation item records in the shared design-system token module;
- semantic navigation icon tokens for Project Documentation, Graph Explorer, Threat Analysis, Child Projects, Governance Plans and Reports;
- a reusable ThreatForge shield monogram exposed by the shared design-system icon adapter;
- a replaceable `Icon` adapter that maps semantic tokens to the current built-in outline icon set;
- shell rendering that consumes navigation records instead of hardcoding icon choices.

Out of scope:

- adopting an external icon package;
- introducing page-local SVG files, inline SVG fragments or ad-hoc brand marks;
- changing route capabilities or authorization policy behavior;
- changing backend APIs or registry semantics;
- implementing disabled future pages.

## Rules

1. Sidebar navigation records MUST declare semantic icon tokens rather than concrete glyphs.
2. The shared shell MUST render navigation icons through the shared `Icon` adapter.
3. Concrete icon drawing MUST remain local to the design-system icon adapter.
4. The ThreatForge shell mark MUST be exposed by the shared design-system icon boundary.
5. Navigation icon presentation hints MUST be declared centrally with the navigation token record when they are needed by the shell.
6. Feature pages MUST NOT choose sidebar navigation icons directly.

## Acceptance Criteria

- Governance Console sidebar entries render icons by consuming `shellNavigation` records.
- The shared shell contains no raw SVG fragments for sidebar navigation icons.
- The shared shell does not hardcode concrete sidebar glyphs.
- Updating a sidebar icon or the lightweight ThreatForge mark can be done in the design-system token or icon adapter boundary.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

The repository checks must include graph format validation, code traceability validation, frontend build and runtime tests. Manual UI review may also run `npm run dev:ui-test:start`, inspect the sidebar at `http://127.0.0.1:5173`, and stop the environment with `npm run dev:ui-test:stop`.
