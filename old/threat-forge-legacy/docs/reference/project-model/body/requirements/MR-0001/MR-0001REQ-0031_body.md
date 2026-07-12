# MR-0001REQ-0031 — Security-analysis-ready project knowledge graph

## Intent

Governed documentation and graph relations must accumulate project knowledge that future security analysis can use before any Base Analysis, STRIDE or STRIDE-AI runtime exists.

## Requirement

The project model must treat ADRs, requirements, governed documents, source-layout decisions, API contract ownership, data-flow vocabulary, runtime component vocabulary, graph relations and validation evidence as security-analysis-ready project knowledge.

This knowledge must be structured so future Base Threat Analysis can derive candidate Actors, Components, Data Resources, Boundaries and Data Flows from governed sources instead of starting from an empty manual diagram.

The documentation graph does not itself become a threat analysis result. It provides traceable input knowledge for the Base Analysis pipeline.

## Scope

This requirement applies to the governed documentation and graph model under `MR-0001`.

It does not implement extraction, DFD rendering, security findings, STRIDE, STRIDE-AI, readiness scoring, OpenAPI runtime APIs, or UI behavior.

## Rules

- Governed documents and graph relations should preserve knowledge useful for future security analysis.
- Project knowledge must remain traceable to its source ADR, requirement, document, graph relation, contract, validation, or implementation evidence.
- Base Threat Analysis candidates must be derivable from governed project knowledge when enough source evidence exists.
- The documentation graph must not be treated as a reviewed Base Analysis snapshot by itself.
- Methodology overlays must use reviewed Base Analysis snapshots rather than raw documentation graph facts.

## Acceptance Criteria

```gherkin
Scenario: Governed project knowledge supports later Base Analysis
  Given the project model documents a browser, backend API, OpenAPI contract, validation boundary, governed registries and document sources
  When a future Base Analysis preparation step reviews project knowledge
  Then it can propose candidate Components, Data Resources, Boundaries and Data Flows with traceable source evidence
  And those candidates remain unaccepted until reviewed by the Base Analysis lifecycle
```

## Verification Expectation

Future documentation, graph and Base Analysis readiness gates must verify that security-analysis-ready project knowledge remains traceable before extraction or analysis tooling depends on it.
