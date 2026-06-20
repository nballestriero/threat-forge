# ADR-0001 — STRIDE-AI overlay boundary and AI pipeline risk taxonomy

## Status

Accepted.

## Context

`MR-0004` defines the Base Threat Analysis canonical model. `MR-0001` documents future graph vocabulary for data-flow, trust boundaries, runtime services, AI/RAG infrastructure, data contracts, payloads, formats, validations, and transformations. Future threat-forge analysis will use AI-support infrastructure such as local model servers, Ollama, vector stores, ChromaDB, retrieval indexes, document corpora, agents, and analysis sessions.

The next design question is how STRIDE-AI should relate to the base model and to the AI/RAG pipeline. STRIDE-AI must reason about AI-specific risks, but it must not create a competing topology or mutate the base inventory of actors, components, data resources, boundaries, or data flows.

This step is intentionally document-only. It does not implement STRIDE-AI tooling, configure Ollama, configure ChromaDB, create RAG indexes, create AI agents, generate findings, create security requirements, or add graph node/predicate registry entries.

## Decision

STRIDE-AI must be modeled as a methodology overlay over the Base Threat Analysis canonical model.

Like STRIDE, STRIDE-AI must preserve the base inventory. It may classify, annotate, prioritize, and explain base actors, components, data resources, boundaries, and data flows, but it must not add or remove canonical base elements. If STRIDE-AI discovers that the AI/RAG pipeline is missing a model server, vector store, retrieval index, document corpus, prompt/context flow, model response flow, evidence artifact, or trust boundary, the result must be proposed as a Base Threat Analysis inventory change.

STRIDE-AI differs from STRIDE because its taxonomy focuses on AI/RAG and agentic-analysis risks. Initial candidate categories include:

1. `Prompt Injection`;
2. `Context Poisoning`;
3. `Retrieval Contamination`;
4. `Cross-Project Data Leakage`;
5. `Model Misuse`;
6. `Unsafe Tool Invocation`;
7. `Unreviewed AI Output`;
8. `Evidence Hallucination`;
9. `Embedding Or Index Leakage`;
10. `Agent Privilege Escalation`;
11. `Model Runtime Boundary Abuse`;
12. `Data Contamination`.

The STRIDE-AI overlay must be able to reason over AI/RAG pipeline paths such as:

- document corpus creation;
- chunking or extraction;
- embedding;
- vector index creation;
- retrieval query;
- retrieved context;
- prompt assembly;
- model server invocation;
- model response;
- agent interpretation;
- candidate finding generation;
- human or governed review;
- accepted finding, mitigation, evidence, or specialized requirement.

AI/RAG output must not be treated as accepted evidence by default. Model output, agent output, retrieved context, generated observations, threat hypotheses, mitigations, and requirements are candidates until reviewed, validated, and promoted through governed controls.

STRIDE-AI may derive specialized security requirements, but each derived requirement must trace back to the base element or flow, the STRIDE-AI risk category, the AI/RAG pipeline step, and the review/evidence that accepted it.

## Scope

In scope:

- STRIDE-AI as an overlay over the Base Threat Analysis model;
- AI/RAG pipeline risk taxonomy;
- immutability of base actors, components, data resources, boundaries, and data flows;
- traceability of prompts, context, retrieval, model output, candidate findings, and evidence;
- review boundary for AI-generated output.

Out of scope:

- implementing AI/RAG infrastructure;
- configuring Ollama, ChromaDB, model profiles, vector indexes, or agents;
- generating STRIDE-AI findings;
- accepting AI output as governed evidence;
- defining complete STRIDE-AI schemas;
- changing the Base Threat Analysis canonical taxonomy.

## Consequences

### Positive consequences

* AI/RAG risks can be analyzed without changing the canonical base topology.
* Model servers, vector stores, retrieval indexes, corpora, prompts, and model responses can be interpreted through the base taxonomy first.
* AI-generated analysis remains reviewable and traceable instead of becoming accepted evidence automatically.
* Child-project isolation and cross-project leakage risks can be analyzed as overlay concerns over explicit boundaries and data flows.

### Negative consequences

* STRIDE-AI requires careful traceability between candidate output, source documents, retrieval context, model invocation, and review evidence.
* Future tooling must separate model assistance from governed acceptance.
* Some AI-specific categories may need refinement before becoming controlled registry values.

## Follow-up

1. Define a controlled STRIDE-AI taxonomy registry or schema after the initial overlay contract is stable.
2. Define how AI/RAG pipeline paths are projected in the Project Model Explorer.
3. Define how AI-generated candidate findings become reviewed findings or specialized security requirements.
4. Define child-project retrieval isolation controls before implementing shared RAG infrastructure.
