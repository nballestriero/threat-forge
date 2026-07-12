# MR-0001REQ-0030 — Security-Analysis Readiness Boundary for Graph Vocabulary

## Intent

The project must prepare graph vocabulary that supports security analysis without prematurely declaring that threat analysis has been performed.

## Requirement

The project model must distinguish future graph vocabulary readiness from actual base threat-analysis execution. Data-flow, trust-boundary and AI/RAG runtime-support vocabulary is an input to future MR-0004 analysis, not an analysis result by itself.

## Scope

This requirement applies to semantic boundaries between graph vocabulary, Project Model Explorer traversal and future security-analysis workflows. It does not define STRIDE, STRIDE-AI, finding models, risk scoring or mitigation workflows.

## Rules

- Vocabulary planning must not create threat findings or mitigations.
- Base threat analysis must remain owned by MR-0004 or later analysis-specific MR work.
- Project Model Explorer may visualize data-flow and trust-boundary paths once available, but must not claim to complete analysis by visualization alone.
- Future analysis outputs must be separate governed artifacts with evidence and traceability.
- AI-generated suggestions must not be promoted to governed analysis results without explicit review and validation.

## Acceptance Criteria

```gherkin
Scenario: Vocabulary readiness is not a threat-analysis result
  Given future graph vocabulary includes trust boundaries and runtime services
  When the project model is inspected
  Then those graph concepts are treated as analysis inputs
  And no threat finding is implied by their existence

Scenario: Future analysis consumes graph vocabulary
  Given MR-0004 defines base threat-analysis workflows later
  When those workflows need data-flow and boundary information
  Then they can consume the graph vocabulary prepared by MR-0001
```

## Verification Expectation

Current verification is provided by the existing ADR registry, Requirement registry, graph-format, body-format and project-model page gates. This requirement does not require new runtime code in this step. Future verification must be added when the candidate vocabulary is promoted into controlled node-type and predicate registries.
