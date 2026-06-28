# ADR-0027 — Governance Console Status Badge Semantic Normalization Boundary

## Status

Accepted.

## Context

The Governance Console now centralizes semantic color tokens, but status badges still derive CSS classes directly from raw backend and registry values such as `pass`, `fail`, `accepted`, `planned`, `not_applicable`, `partially_implemented` and governance warning values. Multiple raw values can mean the same visual intent, while one feature page may display registry lifecycle states and another may display gate execution results.

Directly styling every raw value makes the badge vocabulary harder to review, encourages duplicated CSS selector lists and blurs the difference between domain status values and UI tone. A small semantic boundary is needed before adding more child-project, gate-plan and threat-analysis statuses.

## Decision

ThreatForge normalizes status badges through the shared MR-0002 design-system boundary. Raw status values remain owned by their backend contracts, registries and view-models, but the frontend design system maps those values to a small UI badge semantic model.

The semantic model assigns a readable label, icon token and visual tone for known status values. The shared `StatusBadge` component consumes that model and emits stable tone classes such as success, warning, danger, information, neutral and planned instead of relying on page-local class names for each raw value. Unknown values must fail closed to a neutral readable badge while preserving the provided label when callers supply one.

The shared stylesheet owns tone rendering through CSS custom properties and the status color tokens introduced by ADR-0026. Feature pages continue to pass raw read-model status values to `StatusBadge`; they do not choose badge colors directly.

## Scope

In scope:

- adding a shared status-badge semantic registry to the MR-0002 design-system token module;
- mapping known Project Documentation Explorer, child-project management and governance gate-plan statuses to semantic tones;
- keeping `StatusBadge` as the shared badge rendering primitive;
- rendering badge tones through shared stylesheet classes and CSS custom properties;
- preserving raw status values for filtering, API semantics and governed data interpretation.

Out of scope:

- changing backend status contracts, registry ids or gate-plan result values;
- adding a status taxonomy registry migration;
- changing child-project documentation data-source fallback behavior;
- adding new pages, routing behavior or mutation behavior;
- changing navigation state styling beyond badge usage;
- introducing an external component library or icon dependency.

## Consequences

### Positive consequences

- Badge visuals are easier to audit because raw statuses map to a compact UI tone vocabulary.
- Future statuses can be added in one design-system registry instead of adding page-local selectors.
- Feature pages remain read-model driven and do not pick colors directly.
- Unknown statuses remain visible without silently inheriting an incorrect success or danger treatment.

### Negative consequences

- The design-system token file owns a larger status mapping table.
- Adding a new status value now requires a small design-system mapping decision when a non-neutral treatment is desired.
- Existing visual differences are intentionally subtle, so this step is more about consistency than a large UI change.

## Follow-up

1. Refine shell navigation and topbar hierarchy using the normalized token vocabulary.
2. Add a dedicated child-project documentation no-fallback boundary so child document views cannot silently show platform documents.
3. Consider deriving future status semantic mappings from governed taxonomy metadata if status vocabularies grow beyond the shared frontend boundary.
