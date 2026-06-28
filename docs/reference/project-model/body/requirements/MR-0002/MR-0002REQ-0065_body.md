# MR-0002REQ-0065 — Governance Console Status Badge Semantic Registry

## Intent

Keep status badge meaning centralized by mapping raw read-model status values to a compact design-system semantic vocabulary.

The requirement prevents feature pages from styling status values independently or assuming that every raw status id should have its own visual treatment.

## Requirement

ThreatForge MUST define a shared status-badge semantic registry in the MR-0002 frontend design-system token module.

The registry MUST map known Governance Console status values to a readable label, icon token and UI tone. It MUST cover Project Documentation Explorer implementation and acceptance states, child-project lifecycle check statuses and child-project governance gate-plan result statuses. Unknown values MUST remain renderable through a neutral fallback semantic.

## Scope

In scope:

- a shared status-badge semantic registry in the design-system token module;
- semantic tone names for success, warning, danger, information, neutral, planned and disabled-like states;
- readable labels for known statuses;
- icon-token selection through the existing shared icon adapter;
- neutral fallback behavior for unmapped values.

Out of scope:

- changing backend status ids;
- changing governed taxonomy or child-project governance registry records;
- introducing status mutation actions;
- adding an external badge component package;
- fixing child-project documentation source fallback.

## Rules

1. The status-badge semantic registry MUST live in the shared MR-0002 design-system token module.
2. Known raw status values MUST map to a semantic tone rather than directly to page-local CSS selectors.
3. The registry MUST preserve raw status values for callers, filters and API semantics.
4. Unknown status values MUST render as neutral badges rather than being hidden or styled as success.
5. Feature pages MUST NOT define local status-to-color maps for shared Governance Console badges.

## Acceptance Criteria

- The design-system token module exports a status-badge semantic registry.
- Known Project Documentation Explorer, child-project and gate-plan status values have semantic mappings.
- Unknown status values can still render with a neutral fallback.
- The token module JSDoc references this requirement and its ADR.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

The repository checks must include frontend build and runtime tests. Manual UI review may confirm that badge labels remain readable and statuses keep lightweight visual treatments.
