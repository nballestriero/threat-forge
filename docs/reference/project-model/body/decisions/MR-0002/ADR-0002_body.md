# ADR-0002 — Project Model Explorer view-model and API boundary

## Status

Accepted.

## Context

Threat-forge already generates governed project-model pages from macro requirements, ADR, requirements, taxonomies, graph nodes, SPO relations, and source-file traceability. The next product direction is to expose an interactive Project Model Explorer without allowing frontend code to become coupled to YAML registries, Markdown bodies, generated HTML pages, Git state, graph files, or filesystem paths.

The Project Model Explorer must be a product feature built on the reusable architecture governed by `MR-0002`. It must be safe to use for threat-forge itself and later for child-project workspaces created by threat-forge. The same boundary must support future filtering, traversal, diagnostics, and readiness views without letting React components parse governed source artifacts directly.

This step is intentionally document-only. It defines the read-only view-model and API boundary for the first Project Model Explorer slice. It does not implement React UI, backend runtime routes, OpenAPI files, Zod schemas, filesystem adapters, child-project scaffolding, reporting dashboards, or threat-analysis logic.

## Decision

The first Project Model Explorer slice must be exposed through a read-only backend application boundary that produces a normalized explorer view model.

The backend side must follow the `MR-0002` layering rule:

- a controller or future route boundary may expose the explorer endpoint;
- an application service must assemble the explorer result;
- the service must depend on project-model reader/query ports;
- concrete adapters for registries, generated artifacts, filesystem, Git, or future child-project workspaces must be wired only through factories or composition roots;
- runtime data contracts must be validated with Zod when implemented;
- the HTTP contract must be represented through OpenAPI when implemented.

The frontend side must consume only the explorer view model through a client port, generated API client, or explicit API adapter. React components must render the view model and dispatch user intent through controller or hook boundaries. Components must not read or parse project-model YAML, Markdown, graph registries, Git state, filesystem paths, generated pages, or local artifact directories.

The explorer view model must be read-only and presentation-oriented. It may include macro-requirement summaries, ADR summaries, requirement summaries, taxonomy summaries, graph nodes, graph edges, traceability metadata, diagnostics, counts, and UI-state-friendly filter metadata. It must not expose raw registry internals as the component contract.

Project Model Explorer belongs to `MR-0002` only for the reusable interface boundary. The semantic content it displays remains owned by the relevant macro requirements. Child-project profile behavior belongs to `MR-0003`; base threat-analysis inputs belong to `MR-0004`; reporting dashboards and product intelligence belong to `MR-0009`.

## Scope

In scope:

- read-only Project Model Explorer API boundary;
- normalized explorer view model boundary;
- frontend client/view-model consumption rule;
- backend service/port/adapter boundary for project-model reads;
- source-access isolation between UI and governed project-model artifacts;
- initial UI state boundary for filters, selections, loading, empty, error, and diagnostic states.

Out of scope:

- implementing React pages or components;
- implementing backend routes, services, ports, adapters, OpenAPI files, or Zod schemas;
- defining final visual layout or graph rendering behavior;
- implementing child-project scaffolding or profile runtime behavior;
- implementing reporting dashboards or product intelligence;
- implementing base threat-analysis, STRIDE, or STRIDE-AI behavior.

## Consequences

### Positive consequences

* The explorer can evolve as a product feature without coupling React to Doc-as-Code source files.
* Backend and frontend can move through an explicit API/view-model contract.
* Future child-project explorer views can reuse the same boundary shape.
* The generated project model remains the governed source of truth while the UI receives a presentation-ready model.
* Filtering, traversal, diagnostics, and readiness views can be introduced incrementally.

### Negative consequences

* A backend view-model assembly layer must exist before the UI can be built correctly.
* OpenAPI and Zod contracts must be designed before implementation proceeds.
* The first UI slice will require more upfront boundary work than directly rendering generated files.
* Domain ownership must remain explicit so the explorer does not become a hidden reporting or threat-analysis module.

## Follow-up

1. Define the source layout and artifact placement for the first Project Model Explorer API and view-model contracts.
2. Define OpenAPI and Zod contract artifacts for the explorer boundary.
3. Define the backend service/port/adapter shape for read-only project-model queries.
4. Define the frontend client-port and hook/controller boundary.
5. Only after those contracts exist, implement the smallest read-only explorer UI slice.
