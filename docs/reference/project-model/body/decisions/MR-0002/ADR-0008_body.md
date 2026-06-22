# ADR-0008 — Project Documentation Explorer read-only filters and capability-gated access

## Status

Accepted.

## Context

The first implementation value of the Governance Console should be simple documentation reading, not Base Analysis runtime. Users need to browse governed documentation, macro requirements, ADR, requirements, taxonomies and graph-backed traceability without opening repository files manually.

The first read-only pages must support practical filters such as macro requirement, entity kind, status, requirement type, implementation state and acceptance state. The set of possible values must come from governed registries, graph relations and backend normalization rather than being permanently hardcoded in React components.

The pages are read-only but not public. They must be accessible only through the existing registered-user and capability boundary. Detailed roles, permissions and dynamic RBAC remain owned by MR-0007 and will be expanded later.

## Decision

MR-0002 must implement the first Project Documentation Explorer slice as a read-only backend capability that normalizes governed project-model sources into a filterable documentation view-model.

The backend must expose, through service/controller/route boundaries, read-only operations for:

- listing governed documentation entities;
- listing available filter facets and their possible values;
- retrieving a governed entity detail view-model.

The first filter facets must include at least macro requirement, entity kind, raw lifecycle status, requirement type, derived implementation state and derived acceptance state. Implementation state must be derived from graph traceability when possible, especially `Requirement implemented_by ImplementationArtifact` relations. Acceptance state must be normalized from governed status fields such as accepted, approved, active, proposed, draft, rejected, deprecated or superseded.

The frontend must receive these facets and values from the backend. React components must not hardcode the long-term set of MR, status, requirement type, implementation state or acceptance values.

The first backend slice must stay behind the capability/access-policy boundary. The bootstrap registered-user policy may grant read-only Project Documentation Explorer capabilities to authenticated users with the `registered_user` role, but the policy must remain replaceable by future dynamic RBAC.

## Scope

In scope:

- read-only documentation explorer collection and filter view-models;
- backend-derived filter facets and possible values;
- macro requirement, entity kind, status, requirement type, implementation state and acceptance state filters;
- source adapter isolation behind a port;
- capability-gated route descriptors and controller operations;
- bootstrap registered-user read-only capability evaluation;
- traceability to MR-0002 requirements and graph nodes.

Out of scope:

- Base Analysis runtime, storage, SQLite adapters, DFD creation or methodology overlays;
- React shell, pages, components, CSS or icon rendering;
- full authentication/session implementation;
- dynamic RBAC storage, policy editor or detailed role matrix;
- editing documentation, changing registries, writing graph records, Git operations or generated-page reuse;
- OpenAPI publication beyond the runtime contract scaffolding of this slice.

## Consequences

### Positive consequences

* The first UI can focus on readable/filterable governed documentation before security-analysis runtime exists.
* The backend owns normalization of YAML, Markdown, graph and taxonomy sources.
* Filter values remain governed and discoverable rather than hardcoded in the frontend.
* Implementation and acceptance state can be shown consistently even when they are derived from different source fields or relations.
* The registered-user access rule can remain simple while preserving a future dynamic RBAC boundary.

### Negative consequences

* The first backend slice still needs a small source adapter even though the eventual storage model may evolve.
* Some states are initially derived heuristically from existing graph/status data and may need refinement when richer evidence, verification and acceptance records are introduced.
* Route descriptors exist before a concrete HTTP server adapter is wired.
* The UI remains deferred until this read-only backend surface is verified.

## Follow-up

1. Implement Zod runtime view-model contracts for the documentation explorer collection, filters and detail payloads.
2. Implement a read service behind a ProjectModelSourcePort and an initial filesystem/registry adapter.
3. Implement capability-gated controller operations and read-only route descriptors.
4. Add graph implementation traceability from MR-0002 requirements to the new backend source modules.
5. Later implement the React Project Documentation Explorer page using these backend-provided facets and capabilities.
