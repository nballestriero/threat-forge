# MR-0010REQ-0003 — Versionable Diagram Strategy for Graph, Gates, Contracts and Code

## Intent

Threat-forge must use diagrams to make the relationships between documentation, graph, gates, contracts and code understandable without creating untracked image drift.

## Requirement

The manual must use versionable diagrams to explain governance flows, graph relations, deterministic gate pipelines, runtime/API contract alignment, code traceability and child-project governance flows.

## Scope

This requirement governs diagram strategy for the manual. It does not mandate a specific renderer, generate final thesis images or replace graph registries.

## Rules

- Diagrams should be stored as versionable text where practical, preferably Mermaid embedded in Markdown.
- Each diagram must have a nearby explanation and reference the canonical records or components it represents.
- Diagrams must distinguish canonical source records from generated artifacts and advisory LLM reports.
- Diagrams explaining gate behavior must show inputs, checks, outputs, failure modes and evidence.
- Diagrams must not introduce relationships that are absent from the graph unless clearly marked as future or explanatory.

## Acceptance Criteria

```gherkin
Scenario: Student studies a gate diagram
  Given a student is reading the gate chapter
  When the student views a diagram for a deterministic gate
  Then the diagram shows the gate input, checked records, output and failure behavior
  And the text links the diagram back to the requirement and implementation artifact that govern the gate
```

## Verification Expectation

Future validation should check diagram source presence, basic Mermaid parseability where supported and references to canonical records.
