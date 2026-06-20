# ADR-0001 — Base Threat Analysis canonical model and overlay boundary

## Status

Accepted.

## Context

`MR-0001` now documents future graph vocabulary for data-flow, trust boundaries, runtime services, AI/RAG infrastructure, data contracts, payloads, formats, validations, and transformations. `MR-0002` now documents the Project Model Explorer boundary, relation filtering, guided traversal, and data-flow traceability API shape.

The next design question is what belongs to the Base Threat Analysis model before applying a specific methodology such as STRIDE or STRIDE-AI.

The base model must be simple enough to apply to threat-forge itself and to child projects without forcing early methodology-specific classifications. At the same time, it must be precise enough to produce DFD-style views, represent explicit boundaries, trace data flows, aggregate entities at different abstraction levels, and preserve evidence for later security analysis.

This step is intentionally document-only. It does not create runtime analysis code, DFD rendering UI, graph node/predicate registry entries, asset taxonomy files, OpenAPI contracts, STRIDE classifications, STRIDE-AI classifications, specialized security requirements, or security findings.

## Decision

The Base Threat Analysis model must own the canonical analyzed-system inventory. Its minimum canonical element taxonomy is:

1. `Actor`;
2. `Component`;
3. `Data Resource`;
4. `Boundary`;
5. `Data Flow`.

`Boundary` must be modeled explicitly. It must not be reduced to a passive attribute of a flow. Boundaries represent relevant separations between contexts, responsibilities, runtimes, projects, trust levels, validation scopes, network zones, data ownership zones, or execution environments. A data flow may cross one or more boundaries.

The base taxonomy intentionally stays small. Terms such as external system, entry point, data store, model server, vector store, repository, document corpus, browser, backend service, adapter, user role, AI agent, and runtime server are not separate base categories by default. They are represented by the canonical base elements first, then refined by methodology overlays, project-specific profiles, or future controlled subtypes when necessary.

For example:

- an end user, maintainer, auditor, external Git provider, or AI agent is an `Actor` at base level;
- frontend, backend, Ollama server, ChromaDB server, adapter, analysis engine, or model runtime is a `Component` at base level;
- governed registries, ADR bodies, requirement bodies, graph registries, document corpora, vector indexes, reports, and evidence artifacts are `Data Resource` elements at base level;
- browser/backend, backend/filesystem, threat-forge/child-project, backend/model-server, backend/vector-store, project/project, trusted/untrusted, and validation boundaries are `Boundary` elements at base level;
- requests, reads, writes, prompts, retrieval queries, model responses, normalized view models, analysis outputs, and evidence promotions are `Data Flow` elements at base level.

The Base Threat Analysis must support DFD-style views and entity aggregation. The same canonical inventory should be viewable at multiple abstraction levels, such as product-level, feature-level, API-boundary-level, service-level, adapter-level, runtime-service-level, and child-project-level. Aggregation must not create conflicting inventories; it must provide governed views over the same underlying canonical elements.

Methodology overlays such as STRIDE and STRIDE-AI must not add or remove canonical base assets, boundaries, or data flows. They may classify, refine, annotate, prioritize, and derive threat hypotheses, security properties, mitigations, and specialized security requirements from the base model. When an overlay discovers that a canonical element is missing, it must propose a change to the Base Threat Analysis inventory rather than silently mutating the overlay model.

The Base Threat Analysis produces the system topology and data-flow model. STRIDE and STRIDE-AI interpret that model.

## Scope

In scope:

- canonical base element taxonomy for Base Threat Analysis;
- explicit boundary modeling;
- data-flow modeling as a first-class base element;
- DFD-style views and aggregation levels;
- separation between canonical base inventory and methodology overlays;
- readiness for future security-specific requirements without creating them in this step.

Out of scope:

- implementing analysis tools;
- creating DFD renderers;
- creating graph node/predicate registry entries for the base taxonomy;
- creating a controlled asset taxonomy file;
- creating STRIDE or STRIDE-AI overlays;
- generating threat hypotheses, findings, mitigations, or specialized security requirements;
- defining identity, access-control, or audit semantics.

## Consequences

### Positive consequences

* The Base Threat Analysis model stays simple and methodology-neutral.
* DFDs can be created from a small set of canonical elements.
* Boundaries can be visualized, filtered, linked to data flows, and later classified by security methodologies.
* STRIDE and STRIDE-AI can specialize the base model without owning the canonical topology.
* Child projects can start from the same base vocabulary without adopting STRIDE immediately.

### Negative consequences

* The base taxonomy is intentionally coarse and will require overlays or profiles for detailed classifications.
* Some terms listed in the macro-requirement body become refinements or examples rather than canonical base categories.
* Future tooling must distinguish canonical base inventory changes from overlay annotations.
* Missing elements discovered during overlay analysis require a feedback path back into the base model.

## Follow-up

1. Define controlled registry entries or schema support for the base canonical element taxonomy.
2. Decide how DFD views are represented as graph projections or analysis artifacts.
3. Define how aggregation levels reference the same canonical base inventory.
4. Define the first STRIDE overlay decision in `MR-0005`, explicitly preserving base inventory immutability.
5. Define the first STRIDE-AI overlay decision in `MR-0006`, explicitly preserving base inventory immutability while adding AI/RAG-specific classifications.
