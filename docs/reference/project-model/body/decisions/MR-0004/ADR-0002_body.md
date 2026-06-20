# ADR-0002 — Security-analysis-ready Project Knowledge and Base Analysis Pipeline

## Status

Accepted.

## Context

`MR-0001` now defines governed documentation, graph traceability, future data-flow vocabulary, trust-boundary vocabulary and security-analysis readiness boundaries. `MR-0002` defines a workspace-aware Governance Console where `Threat Analysis` is a first-level navigation area for both the threat-forge platform workspace and child project workspaces.

The Base Threat Analysis must not start from a blank DFD or from methodology-specific STRIDE categories. The project is built Doc-as-Code so that requirements, ADRs, graph relations, API contracts, source ownership, validation boundaries, evidence and project structure accumulate knowledge that later helps security analysis.

The design question is the correct order of the pipeline, especially where the DFD belongs.

This step is intentionally document-only. It does not implement extraction, runtime analysis, DFD rendering, Project Model Explorer UI, STRIDE, STRIDE-AI, reporting dashboards, readiness scoring, or security finding generation.

## Decision

The Base Threat Analysis pipeline must be project-knowledge-first and DFD-after-inventory.

The canonical pipeline is:

```text
governed documentation and project graph
→ security-analysis-ready project knowledge
→ candidate Actor / Component / Data Resource / Boundary identification
→ candidate Data Flow identification
→ governed review of candidates
→ DFD derived from accepted inventory and flows
→ versioned Base Analysis snapshot
→ STRIDE, STRIDE-AI and future methodology overlays
```

The DFD is not the first input. It is a derived representation created after assets, explicit boundaries and candidate flows have been identified and reviewed.

The Base Analysis must use the governed project knowledge graph as an evidence source, but must still maintain its own reviewed canonical inventory. Raw documentation facts, graph paths or extracted candidates do not become canonical base entities until reviewed and accepted.

A consolidated Base Analysis snapshot must preserve the accepted Actors, Components, Data Resources, Boundaries, Data Flows, aggregation views, DFD projections and source evidence used to justify them. Methodology overlays must reference a specific Base Analysis snapshot rather than reading raw project documentation directly as their canonical topology.

When overlays discover missing or ambiguous assets, boundaries or flows, they must propose corrections to the Base Analysis lifecycle. They must not mutate the canonical base inventory directly.

## Scope

In scope:

- ordering the Base Analysis pipeline;
- treating governed documentation and graph relations as security-analysis-ready knowledge;
- identifying candidate base elements before DFD construction;
- deriving the DFD from reviewed inventory and flows;
- introducing versioned Base Analysis snapshots as the stable input for overlays.

Out of scope:

- implementing automatic extraction;
- implementing DFD rendering or editing;
- defining the controlled base taxonomy registry;
- defining STRIDE or STRIDE-AI execution details;
- producing findings, mitigations, specialized security requirements or reports;
- implementing readiness dashboards or gates.

## Consequences

### Positive consequences

- The project documentation created during normal development becomes useful for future security analysis.
- The DFD is grounded in reviewed project knowledge instead of becoming an isolated drawing.
- Base Analysis remains methodology-neutral and review-based.
- STRIDE and STRIDE-AI can be reproducible because they depend on a versioned Base Analysis snapshot.
- Child projects can be evaluated for readiness before expensive analysis starts.

### Negative consequences

- The Base Analysis pipeline needs candidate and review states before full automation can be useful.
- DFD construction requires enough accepted base inventory and flow evidence.
- Future tools must distinguish raw project knowledge, candidates, accepted base entities and overlay annotations.
- Documentation gaps must be reported as readiness issues instead of being silently guessed by the analysis.

## Follow-up

1. Define the controlled Base Threat Analysis taxonomy/registry and examples.
2. Define candidate-state and review-state records for base elements and flows.
3. Define the first DFD projection representation after accepted inventory exists.
4. Define how STRIDE and STRIDE-AI overlays reference a Base Analysis snapshot.
5. Define readiness reporting under `MR-0009` before introducing runtime readiness scores.
