# Project Knowledge Governance Manual

Status: initial governed study manual slice.

This manual explains how threat-forge manages project knowledge through governed documentation, typed graph relations, code traceability and deterministic repository gates. It is intended for students, developers, maintainers and LLM-assisted reviewers who need to understand the project before changing it.

The manual is explanatory and study-oriented. It does not replace the canonical project sources.

## Canonical-source boundary

The canonical sources remain:

- macro-requirement registries and governed macro-requirement bodies;
- ADR registries and governed ADR bodies;
- requirement registries and governed requirement bodies;
- graph registries listed by `docs/reference/project-model/registers/graph.index.yml`;
- governed runtime contracts, OpenAPI contracts, tools, tests and repository gates.

The manual is a guided explanation over those sources. If the manual identifies a new rule, a new workflow or a correction, that change must be promoted through the usual governed flow: ADR, requirement, graph, implementation or verification, then `repo:check`.

## Current manual parts

1. [`Part 01 - Current-state foundations`](part-01-current-state-foundations.md)
2. [`Part 02 - Graph and traceability model`](part-02-graph-and-traceability-model.md)
3. [`Part 03 - Deterministic gates catalog`](part-03-deterministic-gates-catalog.md)
4. [`Part 04 - Runtime contracts and API coherence model`](part-04-runtime-contracts-and-api-coherence-model.md)

## Study routes

### Student route

Start with Part 01, then continue with Part 02, Part 03 and Part 04. Focus on the system map, the canonical-source boundary, the ADR-to-code flow, the graph model, the deterministic gate catalog and the contract-to-API coherence path. Use the diagrams to understand why threat-forge treats documentation as operational project knowledge rather than passive notes.

### Developer route

Start with the sections on code coherence, anti-duplication, graph traceability, gate failure meaning and runtime contract coherence. Before writing code, identify the relevant macro-requirement, decision, requirement and graph relation. Code should follow the documentation, not invent a parallel design.

### LLM-assisted reviewer route

Start with the canonical-source boundary and the graph-guided context route. An LLM must gather evidence from paths and entity IDs, report uncertainty, and avoid repository mutations unless a human explicitly executes a governed change.

## Diagram strategy

The manual uses versionable diagrams, primarily Mermaid code blocks and simple textual diagrams, so that diagrams remain reviewable in Git and useful to both humans and LLMs. Rendered PDFs may include equivalent explanatory diagrams for study, but the Markdown source remains the repository copy.
