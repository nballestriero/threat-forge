# ADR-0012 — Future Graph Vocabulary for Data-Flow, Trust Boundaries and AI/RAG Runtime Support

## Status

Accepted.

## Context

MR-0001 owns the governed documentation and graph model used to make threat-forge analyzable. The project already represents macro requirements, ADRs, requirements, documents, registries, tools, source modules and verification artifacts as graph nodes. MR-0002 now requires the Project Model Explorer to support aggregate browsing, entity detail, relation filtering, guided traversal and data-flow traceability.

Future security analysis needs more than document traceability. It must understand which data moves between browser, API boundary, backend controller, service, ports, adapters, document sources, child project workspaces, model servers, vector stores and analysis sessions. It must also understand the format, contract, validation, transformation and trust boundary involved in each handoff.

The project will also use AI/RAG support such as local model servers, Ollama, vector stores such as ChromaDB, document corpora, retrieval indexes, agent profiles and model execution profiles. These are runtime and analysis-support elements. They are not findings by themselves, but future analysis must be able to reason about them, especially for prompt injection, information disclosure, corpus isolation, model authorization and evidence quality.

## Decision

The project model must reserve a future graph vocabulary for data-flow, trust-boundary and AI/RAG runtime-support concepts. This vocabulary is a governed graph-model foundation, not a threat-analysis result.

The vocabulary must be designed so future project-model graphs can represent:

- data payloads, data formats, data contracts, validations and transformations;
- application, component, validation and trust boundaries;
- runtime services such as backend services, model servers and vector stores;
- document corpora, retrieval indexes and child project workspaces;
- AI execution profiles, agent profiles and analysis sessions;
- relations that show how data is carried, validated, transformed, indexed, retrieved, sent, returned and supported by evidence.

Initial candidate node concepts include `RuntimeService`, `ModelServer`, `VectorStore`, `DocumentCorpus`, `RetrievalIndex`, `DataPayload`, `DataFormat`, `DataContract`, `ValidationBoundary`, `TrustBoundary`, `Transformation`, `ApplicationBoundary`, `ComponentBoundary`, `AIExecutionProfile`, `AIAgentProfile` and `CollaborativeAnalysisSession`.

Initial candidate predicate concepts include `carries`, `has_format`, `conforms_to`, `validated_by`, `transformed_by`, `crosses_boundary`, `enters_component`, `leaves_component`, `indexed_as`, `served_by`, `retrieves_from`, `uses_model_server`, `uses_retrieval_index`, `sends_to`, `returns`, `produces`, `supported_by` and `reviewed_in`.

These candidates must not be added to the controlled graph node-type or predicate registries in this step. A later implementation step must introduce them incrementally through dedicated ADRs, requirements, registry updates, examples and validation gates.

## Scope

In scope:

- defining the need for future data-flow, trust-boundary and AI/RAG runtime-support graph vocabulary;
- distinguishing graph vocabulary readiness from actual base threat-analysis execution;
- identifying candidate node and predicate concepts for later controlled registry work;
- making the vocabulary usable by Project Model Explorer traversal and future threat-analysis workflows.

Out of scope:

- adding new node types or predicates to the controlled registries now;
- implementing Ollama, ChromaDB, embeddings, vector indexes or model orchestration;
- implementing Project Model Explorer runtime APIs or UI;
- producing threat findings, mitigations or analysis reports;
- defining STRIDE, STRIDE-AI or base threat-analysis methodology outputs.

## Consequences

### Positive consequences

- The project can reason about data flow and trust boundaries before implementing analysis engines.
- Project Model Explorer can evolve toward explainable paths that include data, formats and runtime services.
- Future AI/RAG support can be represented explicitly instead of being hidden inside implementation details.
- Security analysis can later distinguish infrastructure, retrieval, model execution and findings.

### Negative consequences

- The graph model will need additional controlled vocabulary and validation before these concepts become executable.
- The project must avoid treating candidate vocabulary as implemented registry semantics.
- Future model-server and vector-store work will require careful isolation rules for child projects and corpora.

## Follow-up

1. Define controlled node-type and predicate registry changes for a minimal subset of the candidate vocabulary.
2. Add governed examples for data-flow and trust-boundary graph paths.
3. Connect Project Model Explorer traversal contracts to the implemented vocabulary once the registry supports it.
4. Use the resulting graph vocabulary as input to MR-0004 base threat-analysis modeling.
5. Introduce AI/RAG runtime components only after dedicated ADRs, requirements and graph relations exist.
