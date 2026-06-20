# MR-0004REQ-0001 — Base analysis canonical element taxonomy

## Intent

The Base Threat Analysis must use a small canonical element taxonomy for the analyzed-system inventory.

## Requirement

The canonical base elements are `Actor`, `Component`, `Data Resource`, `Boundary`, and `Data Flow`.

The base taxonomy must be methodology-neutral. It must not require STRIDE, STRIDE-AI, AI/RAG, cloud, web, infrastructure, or implementation-specific categories before a project can be modeled. More precise labels may be provided by overlays, profiles, or future controlled subtypes, but those refinements must not replace the canonical base element identity.

Examples such as users, maintainers, external services, frontend applications, backend services, Ollama servers, ChromaDB servers, repositories, document corpora, vector indexes, prompts, model responses, and evidence artifacts must first be mappable into the base taxonomy.


## Scope

This requirement applies to the Base Threat Analysis model under `MR-0004`.

It does not implement runtime analysis, DFD rendering, STRIDE, STRIDE-AI, OpenAPI contracts, graph schema changes, or specialized security requirement generation.

## Rules

- The canonical base taxonomy must contain Actor, Component, Data Resource, Boundary, and Data Flow.
- The base taxonomy must remain independent from STRIDE and STRIDE-AI categories.
- Methodology-specific classifications must be overlays or refinements, not replacements for base element identity.
- Child projects must be able to use the base taxonomy before choosing a threat-analysis methodology.

## Acceptance Criteria

```gherkin
Scenario: Base model classifies common threat-forge elements
  Given a threat-forge analysis includes a user, frontend, backend, ChromaDB server, document corpus, API boundary, and browser request
  When the base model is created
  Then each item can be represented using Actor, Component, Data Resource, Boundary, or Data Flow
  And no STRIDE-specific category is required to create the base inventory

```

## Verification Expectation

Future Base Threat Analysis, graph, DFD, and overlay gates must be able to verify this requirement before runtime implementation depends on it.
