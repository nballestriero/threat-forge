# MR-0002REQ-0044 — Frontend state ownership and store selection rules

## Intent

Threat-forge will have simple read-only pages, URL-addressable explorers, protected workspace navigation, server-backed data, forms and long-running threat-analysis workflows. These states have different lifecycles and must not all be placed in one global store or hidden behind premature abstractions.

## Requirement

Frontend state must be owned according to its lifecycle and sharing needs, using local React state, URL state, shell/access/workspace context, server/API query state, form-local state or workflow/domain stores only where appropriate.

## Scope

This requirement governs frontend state ownership for MR-0002 pages and future Governance Console feature pages. It does not choose a final third-party store or API query library.

## Rules

- Use local React state for temporary page interaction such as search text, selected filters, selected entity, list/detail mode and panel expansion.
- Use URL state when filters, selected entity ids or navigation choices must survive refresh, support browser back/forward or be shareable as links.
- Use shell/access/workspace contexts for authenticated principal, workspace kind, capabilities, route visibility and menu visibility.
- Treat backend collections, details, taxonomy values, graph view-models and navigation view-models as server/API state owned by backend contracts and loaded through feature data clients.
- Prefer a governed query/cache abstraction for non-trivial server/API state once HTTP APIs require loading/error normalization, retry, refetch, invalidation or pagination.
- Use form-local state for editing/review forms, with backend validation remaining authoritative.
- Introduce a dedicated workflow/domain store only for multi-step flows that span multiple components and need draft, undo, review, staged-save or cross-step coordination.
- Do not introduce a global frontend store merely to avoid prop passing in a small page.

## Acceptance Criteria

```gherkin
Scenario: Explorer state uses the smallest sufficient owner
  Given the Project Documentation Explorer supports filters and selected detail
  When a user searches, filters and opens an entity
  Then immediate interaction state may be local to the feature
  And routable filters or selected ids may be promoted to URL state
  And governed collection/detail data remains server/API state loaded through the feature data client
```

## Verification Expectation

Future frontend changes should justify any new context, query/cache abstraction or dedicated store by lifecycle and sharing requirements. Simple page-local state must remain local until URL, shell, API or workflow concerns require promotion.
