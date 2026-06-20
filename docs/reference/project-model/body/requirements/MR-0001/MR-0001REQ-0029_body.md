# MR-0001REQ-0029 — Data Contract, Payload, Format and Transformation Graph Vocabulary

## Intent

Security analysis needs to understand not only which components communicate, but also what data is passed, which contract constrains it and how it changes.

## Requirement

The project model must reserve future graph vocabulary for data contracts, payloads, formats and transformations so guided traversal can explain the shape and validation of data across browser, API, backend, adapter, corpus, model and frontend boundaries.

## Scope

This requirement applies to planned graph semantics for data contracts and transformations. It does not create OpenAPI, Zod, embedding, prompt or response schemas in this step.

## Rules

- Future data-flow paths must be able to identify the payload being passed.
- Future data-flow paths must be able to identify the format or contract that constrains the payload.
- Future data-flow paths must be able to identify validation and transformation steps.
- Raw filesystem paths, raw Markdown and raw YAML must not become the frontend data contract.
- Model prompts, retrieval context and model responses must be representable as data handoffs when AI/RAG support is introduced.

## Acceptance Criteria

```gherkin
Scenario: Traversal can explain data format and contract
  Given a future browser request reaches a backend API
  When the data-flow path is queried
  Then the path can show the request payload, HTTP contract, runtime validation and normalized response format

Scenario: AI/RAG data handoffs are representable
  Given a future analysis agent retrieves context and sends a prompt to a model server
  When the data-flow path is modeled
  Then the prompt, retrieval context and model response can be represented as governed data handoffs
```

## Verification Expectation

Current verification is provided by the existing ADR registry, Requirement registry, graph-format, body-format and project-model page gates. This requirement does not require new runtime code in this step. Future verification must be added when the candidate vocabulary is promoted into controlled node-type and predicate registries.
