# ADR-0011 — Pragmatic frontend state ownership and data access pattern

## Status

Accepted.

## Context

The first Governance Console frontend slice introduced a React/Vite shell, shared MR-0002 design-system primitives and a Project Documentation Explorer page. That slice validated the read-only exploration flow, including filters, list/detail navigation and backend-produced documentation body content.

The next frontend steps will add URL-addressable filters, real HTTP APIs, workspace/capability context and eventually richer workflows such as Base Analysis review, DFD editing and threat-analysis overlays. Threat-forge needs a frontend architecture that keeps pages understandable while preserving the backend as the authoritative source for governed project-model data.

A backend-style Ports and Adapters pattern would provide strong isolation, but applying it rigidly to React would add unnecessary boilerplate and cognitive load for simple feature pages. The frontend should instead use pragmatic, colocated feature boundaries, custom hooks and lightweight data clients. Stronger abstractions remain allowed only where they protect a real boundary, such as HTTP/API access, access policy, workspace state, server-state caching or long-running workflow state.

## Decision

MR-0002 defines a pragmatic frontend state ownership and data access pattern.

Frontend code must be organized into feature modules composed through the shared MR-0002 Governance Console shell, page frames, design system and semantic icon registry. A feature page may colocate page composition, feature-local state and orchestration code, but it must not duplicate global shell, navigation, protected page mechanics, design-system tokens or semantic icon infrastructure.

For feature data access, the preferred pattern is:

```text
Feature page
  -> feature custom hook
    -> lightweight feature data client
      -> development snapshot fetcher, while no HTTP API exists
      -> HTTP fetcher, once the Node.js API exists
```

This is a lightweight client boundary, not a mandatory frontend hexagonal architecture. The page should not know whether the current data source is a generated development snapshot or a future HTTP endpoint. However, this boundary should remain simple: no class hierarchy, no adapter layer cascade and no permanent snapshot abstraction unless a concrete need appears.

The browser must not read project-model YAML, Markdown, graph files, Git state, registry files or filesystem paths directly. The backend remains responsible for resolving `body_path`, normalizing registry/graph/body data and returning read-only view-models.

Frontend state is owned according to lifecycle and sharing need:

1. **Local React state** for immediate page interaction such as search text, selected filters, selected entity, list/detail mode and expanded panels.
2. **URL state** for shareable or restorable navigation state such as selected MR, entity kind, implementation state, acceptance state and selected detail id.
3. **Shell/access/workspace context** for authenticated principal, workspace kind, visible navigation entries and capabilities. Feature pages must not hardcode permanent role checks.
4. **Server/API state** for governed collections, entity details, taxonomy values, graph view-models and navigation view-models. The backend remains the source of truth.
5. **Form-local state** for transient editing or review forms, with backend validation remaining authoritative.
6. **Workflow/domain store** only for multi-step flows that span multiple components and require draft, undo, review, staged-save or cross-step coordination.

For non-trivial server/API state, MR-0002 may later introduce a query/cache abstraction such as TanStack Query or an equivalent. Such a library must be introduced through its own governed requirement when real HTTP server state needs caching, retry, loading/error normalization, refetch or invalidation.

## Scope

In scope:

- feature-colocated frontend composition under MR ownership;
- custom hooks as the normal feature orchestration boundary;
- lightweight data clients for snapshot and future HTTP access;
- state ownership categories for local, URL, shell/access/workspace, server/API, form-local and workflow/domain state;
- explicit avoidance of automatic backend-style Ports and Adapters in simple frontend features.

Out of scope:

- implementing the Node.js HTTP server;
- introducing TanStack Query, SWR, Redux, Zustand or another store library;
- implementing dynamic RBAC;
- implementing Base Analysis runtime or workflow stores;
- replacing the development snapshot source in this documentation-only step.

## Consequences

### Positive consequences

* Feature pages stay readable and close to the UI they render.
* The Project Documentation Explorer can move from development snapshot data to HTTP data without rewriting page rendering.
* The frontend avoids backend-style over-engineering while still protecting real boundaries.
* Access and workspace behavior remains centralized and ready for MR-0007 policy integration.
* Dedicated stores are introduced only when justified by lifecycle and workflow complexity.

### Negative consequences

* The project must resist introducing generic frontend abstractions too early.
* Feature hooks and data clients must be kept small and reviewed for drift toward hidden global state.
* URL state and API cache behavior will need a later design step when routing and HTTP APIs are introduced.

## Follow-up

1. Add URL state for Project Documentation Explorer filters and selected detail id.
2. Replace the development snapshot fetcher with a real HTTP fetcher when the Node.js API server slice is implemented.
3. Keep access/workspace capability state in shell-level contexts and avoid page-local permanent role checks.
4. Introduce a query/cache library only after governed requirements identify concrete server-state needs.
5. Defer dedicated workflow/domain stores until Base Analysis or threat-analysis overlay pages need multi-step draft/review state.
