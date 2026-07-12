# ADR-0007 — Project Model Explorer read-only API and view-model contract

## Status

Accepted.

## Context

Threat-forge now has a shared Governance Console UI template, a read-only Project Model Explorer UI slice, a read-only Graph Explorer layout pattern, and an initial registered-user access policy behind a capability boundary.

The next step before implementation is to define the first API and view-model contract for browsing governed documentation and graph data. The frontend must not read Markdown, YAML, Git, the filesystem, registries, graph files, generated project-model pages, or other repository sources directly. React components must consume stable view models from backend/API boundaries.

Earlier MR-0002 decisions already established the broad Project Model Explorer view-model/API boundary and browsing/relationship endpoint shape. This decision narrows that direction into the first implementation-ready read-only contract surface for the Governance Console.

This step remains document-only. It does not create OpenAPI files, Zod schemas, backend controllers, services, ports, adapters, frontend API clients, React components, graph renderer code, authentication runtime, dynamic RBAC, or source readers.

## Decision

MR-0002 must define a read-only Project Model Explorer API and view-model contract before implementing the first backend reader or frontend explorer components.

The first contract surface must expose normalized, frontend-safe view models for:

- project-model overview;
- governed entity collections such as macro requirements, requirements, ADR/decisions, documents, and taxonomies;
- governed entity detail;
- graph explorer data;
- taxonomy browsing;
- capability-aware navigation and route visibility.

The contract must be read-only and must not expose arbitrary repository paths as application identities. Governed entity identities, relation identities, taxonomy identities, and graph node identities must be stable project-model identifiers rather than direct filesystem coupling.

The backend boundary must be responsible for reading, normalizing, validating, and shaping project-model source data. The frontend must only render view models and send query/filter parameters supported by the contract.

Future OpenAPI contracts must live under the canonical OpenAPI location defined by MR-0002. Future backend runtime contracts may use Zod. This decision defines the logical contract shape first so implementation can later add OpenAPI, Zod, service, port, adapter, API client, and React code in governed micropassi.

The first view models must include enough relationship and source-reference metadata for transparency, but source references are informational. They must not become instructions for the frontend to read repository files.

## Scope

In scope:

- read-only API/view-model contract boundary for the Project Model Explorer;
- overview, collection, detail, graph, taxonomy, and navigation view-model categories;
- stable governed identifiers instead of filesystem paths as application IDs;
- source-reference transparency without frontend source-file reads;
- capability-aware navigation view model for the bootstrap registered-user policy and future dynamic RBAC;
- preparation for future OpenAPI/Zod implementation without creating those artifacts yet.

Out of scope:

- implementing OpenAPI files, Zod schemas, TypeScript DTOs, controllers, services, ports, adapters, or readers;
- implementing frontend API clients, React routes, shell components, graph components, CSS, or icon mapping;
- implementing authentication, session runtime, route guards, RBAC configuration, or policy storage;
- implementing editing, project-model writes, registry updates, graph updates, Git operations, or generated page reuse;
- implementing Base Analysis, STRIDE, STRIDE-AI, findings, dynamic analysis storage, or SQLite.

## Consequences

### Positive consequences

* The first UI implementation can be built against stable read-only view models instead of repository files.
* Backend normalization remains the owner of project-model source interpretation.
* Frontend components can remain simple renderers of governed data and capability-aware navigation state.
* The first implementation slice can be small while still leaving room for later OpenAPI, Zod, source-reader adapters, and dynamic access policy.
* Graph and taxonomy views can share the same contract style as requirements, ADR, and macro-requirement browsing.

### Negative consequences

* Another document-only contract step is required before visible UI implementation begins.
* Some existing generated HTML pages may remain separate from the future API-backed console until backend reader services are implemented.
* The first contract must avoid overfitting to current YAML/Markdown file layout even though initial adapters will probably read those sources.
* The contract must be specific enough for implementation but not so detailed that it prematurely freezes internal storage or renderer choices.

## Follow-up

1. Derive small MR-0002 requirements for overview, collection, detail, graph, taxonomy, navigation, and API contract boundary view models.
2. Implement a future OpenAPI contract and matching backend runtime schemas through a separate governed micropasso.
3. Implement a backend Project Model reader service behind ports/adapters after OpenAPI/view-model requirements exist.
4. Implement frontend read-only Governance Console routes and components only after backend/API contracts and code traceability requirements exist.
