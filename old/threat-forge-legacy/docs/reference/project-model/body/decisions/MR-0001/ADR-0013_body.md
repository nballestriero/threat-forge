# ADR-0013 — Controlled Taxonomy Value Metadata and Semantic UI Tokens

## Status

Accepted.

## Context

Threat-forge already uses controlled registries for Requirement statuses, Requirement types, specialized Requirement families, graph node types and graph predicates. These records include descriptions so humans, deterministic validators, reports and future LLM-assisted workflows can understand what each value means and how it should be used.

Future Base Analysis, STRIDE, STRIDE-AI, Project Model Explorer, Governance Console and reporting work will need additional taxonomies for actors, components, data resources, boundaries, flows, lifecycle statuses, findings, mitigations, evidence states and report outcomes.

These taxonomy values must be understandable without reading implementation code. They will also be used by future UI views such as graph legends, filters, badges, DFD views and analysis dashboards. UI support must not turn taxonomy records into raw visual theme files, because colors, icons and graph rendering libraries can change independently from domain semantics.

## Decision

Governed taxonomy values must use a controlled metadata model. Every taxonomy value must have a stable `id`, a human-readable `label` or `name`, and a `description` that explains meaning, intended use and governance impact.

A taxonomy value may also include a `function` field when the value controls behavior, validation, lifecycle, reporting, graph semantics or analysis decisions.

Domain taxonomies may include optional UI metadata, but this metadata must be semantic. UI metadata must use tokens such as `icon_token`, `color_token`, `graph_shape_token` and `graph_edge_style_token`. Taxonomy records must not store raw theme colors such as hexadecimal values as domain semantics.

Concrete color palettes, light/dark mode values, high-contrast mappings and frontend-library-specific icons must be supplied by future UI/theme contracts or implementation layers, not by domain taxonomy records.

The project introduces `docs/reference/project-model/registers/taxonomies.registry.yml` as the governed registry for taxonomy metadata fields and semantic UI token examples. This registry is not yet the complete Base Analysis taxonomy. It defines the metadata shape and example token model that later Base Analysis, STRIDE and STRIDE-AI taxonomy registries must follow.

## Scope

In scope:

- defining required taxonomy value metadata fields;
- requiring descriptions for controlled taxonomy values;
- allowing optional semantic UI metadata for future UI and graph rendering;
- separating semantic `color_token` values from concrete UI palette values;
- adding a governed taxonomy metadata registry with controlled metadata-field and token examples.

Out of scope:

- defining the complete Actor, Component, Data Resource, Boundary or Data Flow taxonomy;
- implementing taxonomy validators;
- implementing Project Model Explorer or Governance Console UI rendering;
- defining a concrete frontend theme palette;
- choosing a graph rendering library or icon library;
- generating OpenAPI or Zod contracts from taxonomy records.

## Consequences

### Positive consequences

- Future taxonomies will be understandable and reviewable without relying on implementation code.
- Graph legends, filters and dashboards can use stable semantic tokens.
- UI themes can evolve without changing domain taxonomy records.
- Accessibility concerns such as high contrast can be handled by a future theme registry.
- Base Analysis and methodology-specific taxonomies can be introduced incrementally with a consistent structure.

### Negative consequences

- Future taxonomy validators will need to distinguish required semantic fields from optional UI metadata.
- A separate UI/theme contract will be needed before color tokens can render as concrete colors.
- Early taxonomy examples must be treated as metadata-model examples, not as complete Base Analysis domain coverage.

## Follow-up

1. Define the controlled Base Analysis taxonomy registry using this metadata model.
2. Add validation that every controlled taxonomy value has `id`, display label and `description`.
3. Add validation that UI metadata uses semantic tokens and does not store raw color values as taxonomy semantics.
4. Define a future theme/token mapping contract for Governance Console and Project Model Explorer rendering.
5. Connect Base Analysis, STRIDE and STRIDE-AI registries to reports and UI filters after their domain taxonomy records are approved.
