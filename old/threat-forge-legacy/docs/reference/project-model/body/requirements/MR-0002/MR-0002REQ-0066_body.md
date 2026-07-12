# MR-0002REQ-0066 — Governance Console Status Badge Tone Rendering

## Intent

Render status badges through shared semantic tone classes so visual behavior remains consistent across Project Documentation Explorer, Child Projects and Governance gate plans.

The requirement keeps status colors behind the shared design system while allowing feature pages to continue passing their raw read-model status values.

## Requirement

ThreatForge MUST render shared Governance Console status badges through a normalized semantic tone selected by the design-system status-badge registry.

The shared `StatusBadge` component MUST compute the semantic tone, label and icon for a provided raw status value, emit a stable tone class and preserve a raw status class only as non-authoritative metadata. The shared stylesheet MUST render tones with CSS custom properties and centralized status color tokens rather than long page-specific raw status selector lists.

## Scope

In scope:

- updating the shared `StatusBadge` component to use the design-system semantic registry;
- rendering badge tone classes for success, warning, danger, information, neutral, planned and disabled-like states;
- using centralized CSS custom properties for badge border, background and marker accent;
- keeping caller-provided labels supported when pages need exact registry wording;
- preserving compact badge layout and existing read-only page behavior.

Out of scope:

- changing status filters or sorting behavior;
- changing backend API contracts or generated snapshots beyond normal build output;
- altering child-project project selection logic;
- changing the no-fallback behavior for child project documentation sources;
- adding interactive status actions.

## Rules

1. `StatusBadge` MUST select badge tone through the shared status-badge semantic registry.
2. `StatusBadge` MUST preserve unknown values with a neutral tone and readable label.
3. The stylesheet MUST render badges through stable semantic tone classes.
4. Badge tone classes MUST consume centralized status color CSS custom properties.
5. Feature pages SHOULD continue to pass raw status values to the shared badge component without choosing colors directly.

## Acceptance Criteria

- `StatusBadge` emits semantic tone classes derived from the shared registry.
- Known statuses render with success, warning, danger, information, neutral or planned tone classes.
- Unknown statuses render as neutral badges without failing the UI.
- Badge CSS no longer depends on long page-local raw status selector groups for its primary rendering.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

The repository checks must include frontend build and runtime tests. Manual UI review may use `npm run dev:ui-test:start` to confirm Project Documentation Explorer and Governance gate plan badges remain compact and readable.
