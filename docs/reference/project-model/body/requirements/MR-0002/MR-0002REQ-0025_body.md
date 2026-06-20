# MR-0002REQ-0025 — Semantic icon-token usage

## Intent

Threat-forge needs coherent icon usage across menus, entity types, statuses, taxonomy values, and graph nodes.

## Requirement

The Governance Console must use a controlled semantic icon-token strategy. Future implementation may choose a concrete icon library, but feature components must consume icon tokens or controlled mappings instead of selecting unrelated icons ad hoc.

Icon usage must remain compatible with taxonomy UI metadata tokens and future graph visualization semantics.

## Scope

This requirement applies to future menu entries, navigation items, project-model entity badges, taxonomy views, status indicators, graph nodes, and read-only Project Model Explorer components. It does not choose a concrete icon library in this step.

## Rules

- Icons must be selected through semantic tokens or a small governed mapping.
- Menu icons must be consistent with entity/detail/graph icon usage when they refer to the same concept.
- Taxonomy `icon_token` metadata must be renderable through the future icon mapping.
- Feature components must not choose unrelated icons without a controlled mapping.
- The absence of an icon token must degrade gracefully to a generic governed fallback.

## Acceptance Criteria

```gherkin
Scenario: Icons are semantically mapped
  Given a project-model entity type has an icon token
  When the UI renders the entity in a list, detail view, or graph
  Then the same semantic icon mapping is used consistently

Scenario: Feature pages do not choose random icons
  Given a new menu item or entity badge is implemented
  When an icon is needed
  Then the implementation references a governed icon token or controlled mapping
```

## Verification Expectation

Future UI implementation review must verify that icon usage is centralized through a governed mapping and remains compatible with taxonomy UI metadata.
