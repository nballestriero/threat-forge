# ADR-0004 — Project Model Explorer browsing, relation filtering and guided traversal API shape

## Status

Accepted.

## Context

`MR-0002` now defines the Project Model Explorer view-model/API boundary and the canonical source-layout/contract ownership rules for reusable application slices. The next decision is the initial API shape that will let the web interface browse the governed project model without exposing raw YAML, Markdown, Git, filesystem, registry, or graph-file implementation details to React components.

The Explorer must be useful for both technical and non-technical users. Developers need to inspect requirements, ADR, graph relations, implementation artifacts, and verification evidence. Product owners, auditors, and security reviewers need to navigate macro requirements, decisions, documentation, diagnostics, and readiness signals without opening source files directly.

The Explorer must also prepare for security analysis. In future slices, a user should be able to start from a browser request, feature, route, or user intent and follow a governed path through UI boundary, API boundary, macro requirements, ADR, functional requirements, specialized/security requirements, implementation artifacts, backend components, data contracts, data handoffs, transformations, validations, and verification evidence.

This step is intentionally document-only. It does not create OpenAPI files, Zod schemas, backend source modules, frontend source modules, relation-query implementations, traversal algorithms, data-flow taxonomies, validators, routes, React pages, or runtime adapters.

## Decision

The Project Model Explorer initial API shape must support four future read-only capabilities:

1. aggregate browsing of the project model;
2. governed entity detail reading;
3. graph relation filtering;
4. guided traversal with data-flow and format traceability.

The aggregate browsing capability should be exposed through a future endpoint such as `GET /api/project-model/explorer/view-model`. Its response must be a normalized frontend-safe view model containing project-model metadata, available filters, graph nodes, graph relations, document summaries, diagnostics, and navigation affordances. It must not expose raw source files as the application contract.

The governed entity detail capability should be exposed through a future endpoint such as `GET /api/project-model/entities/{entityId}`. It must support reading macro requirements, ADR, requirements, governed documents, and later additional entity types through a normalized detail representation. The detail representation may include source references for transparency, but the frontend must not use filesystem paths as the primary application mechanism.

The graph relation filtering capability should be exposed through a future endpoint such as `GET /api/project-model/relations`. It must allow the backend to answer queries such as all requirements justified by a specific ADR, all ADR linked to a macro requirement, all documents connected to an entity, all implementation artifacts related to a requirement, and all verification evidence for a slice. The frontend may present role-neutral filter labels, while the backend translates them into governed graph predicates and traversal rules.

The guided traversal capability should be exposed through a future query/path contract, such as `GET /api/project-model/paths` or a later ADR-approved query endpoint. It must let the backend produce explainable paths rather than leaving React components to infer graph semantics. Examples include feature-to-implementation, decision-to-requirements, macro-area, and security-analysis paths.

Guided traversal paths must be able to include data-flow and format traceability. A path that starts from a browser request should be able to show which data is passed through the browser, HTTP boundary, OpenAPI contract, Zod/runtime validation, controller, service, port, adapter, project-model source, normalized view model, HTTP response, frontend client, and rendered UI state. For each important data handoff, the future representation must be able to identify the data shape, format, applicable contract, source boundary, target boundary, validation, transformation, and related requirement or ADR.

This ADR does not introduce a full data-flow graph taxonomy yet. It establishes that relation filtering and guided traversal must be designed so that later `DataContract`, `DataPayload`, `Boundary`, `TrustBoundary`, `Validation`, and `Transformation` nodes or equivalent representations can be introduced without rewriting the Project Model Explorer boundary.

## Scope

In scope:

- initial read-only API shape for Project Model Explorer browsing;
- normalized entity detail reading for MR, ADR, requirements, and governed documents;
- graph relation filtering for user-facing navigation use cases;
- guided traversal path capability for explainability and security analysis;
- future support for data-flow, format, validation, transformation, and boundary traceability inside traversal paths.

Out of scope:

- creating the OpenAPI artifact;
- creating Zod schemas;
- implementing backend routes, services, ports, adapters, or traversal algorithms;
- implementing frontend pages, filters, graph UI, or entity readers;
- defining the full data-flow node/predicate taxonomy;
- defining identity, roles, authorization, or permission semantics, which belong to `MR-0007`;
- defining audit/evidence retention semantics, which belong to `MR-0008`;
- defining threat-analysis methodology behavior, which belongs to `MR-0004` and later analysis macro requirements.

## Consequences

### Positive consequences

* The Explorer becomes a graph-backed documentation browser rather than a static page viewer.
* Non-technical users can navigate MR, ADR, requirements, and governed documents through normalized detail views.
* Technical and security users can filter relations such as ADR-to-requirements or requirement-to-implementation without knowing raw graph predicates.
* Future security analysis can follow explainable paths from browser/API boundary to backend implementation and verification evidence.
* Data-flow and format traceability are reserved as first-class traversal concerns before code is introduced.

### Negative consequences

* The future API surface is broader than a single aggregate view-model endpoint.
* Backend services must own relation filtering and traversal semantics instead of delegating them to React components.
* The project will need later taxonomies or contracts for path types, data handoffs, boundaries, formats, validations, and transformations.
* Future OpenAPI and Zod schemas will be more complex because they must represent both document/entity views and graph/path views.

## Follow-up

1. Define the first OpenAPI contract artifact under `docs/reference/api/openapi/` for the aggregate browsing, entity detail, relation filtering, and guided traversal shape.
2. Decide whether guided traversal path types are represented as a controlled taxonomy.
3. Decide how data-flow, format, validation, transformation, and boundary concepts are modeled in the graph.
4. Define backend service contracts before implementing route handlers.
5. Define frontend filter/view-model contracts before implementing React graph browsing.
