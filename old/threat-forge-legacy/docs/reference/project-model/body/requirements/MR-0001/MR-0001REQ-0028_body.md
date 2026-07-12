# MR-0001REQ-0028 — Runtime Service and AI/RAG Infrastructure Graph Vocabulary

## Intent

Threat-forge will use runtime services and AI/RAG infrastructure to support analysis of itself and child projects, and those elements must be visible to the graph model.

## Requirement

The project model must reserve future graph vocabulary for runtime services and AI/RAG support components, including model servers, vector stores, document corpora, retrieval indexes, AI execution profiles, agent profiles and analysis sessions.

## Scope

This requirement applies to graph vocabulary planning for runtime and AI/RAG infrastructure. It does not configure Ollama, ChromaDB, embeddings, model execution, RAG pipelines or analysis agents.

## Rules

- Model servers and vector stores must be represented as infrastructure concepts, not as findings.
- Document corpora and retrieval indexes must be distinguishable from source documents and project workspaces.
- AI execution profiles must be distinguishable from agent profiles.
- Child project corpora and indexes must be modeled in a way that supports future isolation checks.
- AI/RAG support must remain evidence-driven and must not bypass governed project-model controls.

## Acceptance Criteria

```gherkin
Scenario: AI/RAG support components are visible as future graph concepts
  Given threat-forge will use local models and retrieval support
  When the future graph vocabulary is inspected
  Then model servers, vector stores, document corpora and retrieval indexes are identified as candidate concepts

Scenario: AI/RAG support remains separate from analysis findings
  Given an analysis session uses a model server and retrieval index
  When the graph vocabulary is interpreted
  Then the runtime services are support infrastructure
  And findings require separate governed analysis artifacts and evidence
```

## Verification Expectation

Current verification is provided by the existing ADR registry, Requirement registry, graph-format, body-format and project-model page gates. This requirement does not require new runtime code in this step. Future verification must be added when the candidate vocabulary is promoted into controlled node-type and predicate registries.
