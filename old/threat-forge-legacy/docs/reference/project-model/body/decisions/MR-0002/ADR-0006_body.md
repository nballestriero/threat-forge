# ADR-0006 — Governance Console UI template and read-only Project Model Explorer slice

## Status

Accepted.

## Context

Threat-forge is preparing the first real Governance Console interfaces for visualizing governed documentation, project-model records, taxonomies, and graph relations. The console must serve both the parent platform workspace and governed child project workspaces through one reusable interface model.

The first implementation must not grow as a set of independent ad-hoc pages. It needs a stable visual template before the Project Model Explorer UI is implemented so that Dashboard, Project Model, Documentation, Graph, Taxonomies, Reports, Threat Analysis navigation, and future areas share the same application shell, navigation mechanics, spacing, typography, state handling, icon usage, and read-only layout patterns.

The desired product style is intentionally restrained: minimal, mostly black/white/gray, document-centric, and similar in spirit to Git, GitHub, or ChatGPT. Taxonomy records already support semantic UI tokens. The UI must preserve that separation: domain records may refer to icon, color, shape, or edge-style tokens, while concrete visual rendering remains a UI/theme concern.

The first Project Model Explorer implementation must be read-only. It may visualize governed records and graph relations, but it must not edit Markdown, YAML, registries, graph files, Git state, analysis runtime records, or child-project state. React components must also continue to consume menu and route visibility from capability/navigation view models rather than hardcoded role checks.

This step is intentionally document-only. It does not create React components, CSS, design-token files, icon packages, OpenAPI files, backend endpoints, graph rendering code, route guards, authentication runtime, or Project Model reader services.

## Decision

MR-0002 must define a reusable Governance Console UI template before the first Project Model Explorer UI implementation.

The template must establish a single product shell for platform and child project workspaces. It must provide consistent structural areas such as a sidebar or navigation rail, top context area, breadcrumb or entity path, main workspace, optional detail drawer, list/detail views, graph workspace, and shared empty/loading/error/forbidden states.

The visual direction must be minimal and document-first. The default product appearance should use a black/white/gray base, restrained borders, generous whitespace, legible typography, and sparse semantic accents. Concrete colors must remain theme-level decisions; product and domain semantics should continue to use tokens instead of raw colors.

The console must use a coherent icon strategy. Future implementation may choose an icon library, but individual pages must not pick unrelated icons ad hoc. Icons must be consumed through semantic icon tokens or a small controlled mapping so taxonomy values, menu entries, entity types, statuses, and graph nodes stay visually consistent.

The first Project Model Explorer slice must be read-only and must use the shared template. It should expose a project-model overview, macro-requirement list/detail, requirement list/detail, ADR/decision list/detail, taxonomy list/detail, and graph explorer entry point. It must render normalized view models from backend/API boundaries and must not read YAML, Markdown, Git, filesystem, registries, or graph files directly from React.

The graph explorer must initially prioritize clarity over decorative visuals. It should support a stable graph canvas or graph panel, node/edge filtering, entity selection, and a detail panel while using the same shell, typography, icon, and status patterns as the rest of the console.

## Scope

In scope:

- stable Governance Console UI template decision;
- minimal black/white/gray design direction;
- reusable shell, navigation, list/detail, detail drawer, graph explorer, and state patterns;
- coherent semantic icon-token strategy;
- read-only Project Model Explorer UI slice boundaries;
- read-only graph explorer layout boundaries;
- confirmation that the first UI must consume capability/navigation state and normalized view models.

Out of scope:

- implementing frontend components, routes, CSS, design tokens, or icon packages;
- implementing backend APIs, OpenAPI contracts, services, readers, or adapters;
- implementing login, RBAC, dynamic policy configuration, or route guard runtime;
- implementing documentation editing, registry editing, graph editing, or Project Model write workflows;
- implementing Base Analysis, STRIDE, STRIDE-AI, findings, evidence review, or SQLite storage;
- choosing final raw color values or a concrete component library.

## Consequences

### Positive consequences

* The first UI will start from a coherent product template instead of ad-hoc pages.
* Platform and child project workspaces can share a single console experience.
* Minimal styling keeps documentation and graph comprehension central.
* Semantic icon and visual tokens can connect future taxonomy metadata to the UI without hardcoding raw colors or random icons.
* The read-only Project Model Explorer can be implemented before dynamic analysis storage while still respecting backend/API boundaries.
* Future design changes can be applied through the template and theme layer rather than rewriting every page.

### Negative consequences

* The first UI implementation must create template foundations before feature-specific pages are completed.
* Design-token and icon mapping choices must be treated as architectural contracts, not incidental styling.
* The graph explorer may initially be visually restrained and less feature-rich than later specialized analysis graph views.
* A stable template requires discipline: feature slices must reuse shared patterns even when page-specific shortcuts would be faster.

## Follow-up

1. Derive small MR-0002 requirements for the console visual template, minimal theme direction, shared shell layout, icon-token strategy, read-only Project Model Explorer slice, and read-only Graph Explorer layout.
2. Define the read-only Project Model Explorer API/view-model contract before implementing React components.
3. Implement the first backend reader service and frontend read-only Explorer only after API/view-model and code traceability requirements exist.
4. Later add concrete design tokens, icon mapping, CSS, frontend components, and graph rendering code through implementation requirements and JSDoc traceability.
