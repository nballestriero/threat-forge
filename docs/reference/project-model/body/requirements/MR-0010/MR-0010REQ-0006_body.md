# MR-0010REQ-0006 — Canonical-Source Boundary for Thesis-Oriented Explanations

## Intent

The manual must be useful for future thesis work while preserving the difference between explanatory narrative, canonical governance records and deterministic evidence.

## Requirement

The manual must support thesis-oriented study of threat-forge by explaining the architecture, methodology, graph, gates and development workflow in depth while clearly separating explanatory text from canonical project-model sources and gate evidence.

## Scope

This requirement governs the boundary between long-form explanation and canonical governance. It does not create the thesis document, define university formatting or make manual prose enforceable by itself.

## Rules

- Thesis-oriented explanations must cite or link canonical records when they describe governed behavior.
- Manual prose must not override ADRs, requirements, graph records, contracts or validator output.
- If thesis/manual work discovers a missing or wrong rule, the rule must be promoted through ADR/REQ/graph before enforcement.
- The manual must distinguish current implemented behavior from planned or future behavior.
- Diagrams intended for thesis reuse must remain traceable to source records or clearly marked as explanatory abstraction.

## Acceptance Criteria

```gherkin
Scenario: Thesis explanation references governance behavior
  Given the manual explains why code cannot diverge from documentation
  When it describes a deterministic gate or traceability rule
  Then it links to the governing requirement, graph relation or tool artifact
  And it does not present unsupported prose as canonical behavior
```

## Verification Expectation

Future validation should check that thesis-oriented manual chapters declare canonical source references and implementation status boundaries.
