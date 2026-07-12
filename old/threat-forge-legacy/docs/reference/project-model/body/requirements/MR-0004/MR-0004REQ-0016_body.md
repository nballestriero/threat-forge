# MR-0004REQ-0016 — Governed Custom Taxonomy Extension Model

## Intent

Future users may need project-specific vocabulary without changing threat-forge canonical taxonomies.

## Requirement

The project model must support future governed custom taxonomy extensions for domain, methodology, workspace or project scope. A custom taxonomy must declare its namespace, scope, version, owner, lifecycle status, description and the base taxonomy it extends or specializes.

## Scope

This requirement defines future extension governance. It does not implement custom taxonomy authoring, validation, UI or import/export.

## Rules

- Custom taxonomies must not modify canonical Base Analysis taxonomy values.
- Custom taxonomy values must provide mandatory descriptions.
- Custom taxonomy values that specialize base concepts must map to a base taxonomy and base value.
- Project-specific taxonomies must be scoped to the owning workspace or child project.
- Extension lifecycle changes must be auditable and versioned.

## Acceptance Criteria

```gherkin
Scenario: Project-specific irrigation taxonomy extends the base
  Given a child project defines irrigation_component_type=pump
  When the value specializes a Base Analysis component
  Then it maps to base_component_kind=physical_or_operational_unit
  And it does not replace the base component classification
```

## Verification Expectation

Future custom taxonomy validators must verify namespace, scope, version, owner, status, descriptions and mapping to base values.

