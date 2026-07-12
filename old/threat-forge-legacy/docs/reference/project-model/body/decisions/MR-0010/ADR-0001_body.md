# ADR-0001 — Project Knowledge Governance Manual as a Dedicated Macro-Requirement

## Status

Accepted.

## Context

Threat-forge has grown a governed project-model system composed of macro-requirements, ADRs, requirements, graph records, body profiles, deterministic validators, runtime contracts, OpenAPI contracts, frontend views, child-project governance planning and LLM-assisted semantic review boundaries.

The system is now difficult to study from isolated registries alone. A developer, student or LLM assistant needs a guided path that explains how the pieces relate, why code cannot diverge from governed documentation, how graph relations carry meaning, how gates enforce consistency and how future child-project governance and threat analysis will build on the documentation substrate.

This explanatory and study-oriented layer is large enough to require a dedicated macro-requirement instead of being treated as incidental documentation under common governance or the base documentation model.

## Decision

Threat-forge will create `MR-0010` for the Project Knowledge Governance Manual.

The manual will be a governed, modular, study-oriented and operational guide for understanding and using threat-forge. It will explain the current documentation model, code traceability model, graph semantics, deterministic gates, contracts, frontend exploration surfaces, LLM-assisted review boundary, child-project governance path and future threat-analysis roadmap.

The manual must include versionable diagrams and schemas as first-class explanatory material. Diagrams should make relationships among ADRs, requirements, graph records, tools, contracts, gates, code artifacts, UI surfaces and child-project flows understandable to both humans and LLMs.

The manual remains explanatory. It does not replace canonical sources. Any rule introduced or changed by manual work must be promoted through ADRs, requirements, graph relations and, when applicable, deterministic validators.

## Scope

In scope:

- declaring the manual as a dedicated macro-requirement;
- defining initial requirements for manual structure, learning paths, diagrams, code-coherence guidance and LLM reading routes;
- treating the manual as a study aid for future thesis work and developer onboarding;
- ensuring manual explanations point back to canonical source records.

Out of scope:

- writing the complete long-form manual in this ADR;
- implementing a manual renderer or book exporter;
- creating a thesis document;
- replacing existing ADRs, requirements, graph registries, contracts or gates;
- implementing child-project execution, Knowledge Graph ingestion or threat-analysis runtime behavior.

## Consequences

### Positive consequences

- The documentation-governance layer becomes an explicit product capability instead of scattered explanatory prose.
- Students and developers can follow a structured learning path before modifying code.
- LLM-assisted development can be grounded in documented reading routes and diagrams rather than broad, unguided repository search.
- Future thesis writing can reuse the manual structure, diagrams and explanations while keeping canonical governance records separate.

### Negative consequences

- The manual introduces a sizeable documentation workstream that must be kept aligned with canonical records.
- Manual content can become stale if it is not tied to source records, graph nodes and gate evidence.
- Diagram maintenance must be governed so explanatory pictures do not diverge from the project model.

## Follow-up

1. Create the initial MR-0010 requirements for manual structure, study paths, diagrams, code-coherence guidance and LLM reading routes.
2. Add a first manual index and chapter skeleton.
3. Define a diagram convention, preferably using versionable Markdown/Mermaid sources.
4. Later add validation for manual reading routes and diagram references once the structure stabilizes.
