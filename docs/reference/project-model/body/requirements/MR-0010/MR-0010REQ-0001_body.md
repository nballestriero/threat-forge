# MR-0010REQ-0001 — Governed Manual Structure and Chapter Index

## Intent

Threat-forge must provide a stable manual structure so readers can study the project knowledge governance system without relying on scattered handoff notes or ad hoc explanations.

## Requirement

The Project Knowledge Governance Manual must be organized as a governed modular chapter set with a stable index, explicit scope boundaries and references back to canonical MR, ADR, requirement, graph, contract and gate records.

## Scope

This requirement governs the manual structure and index. It does not write every chapter, implement a renderer, export a book format or replace canonical project-model registries.

## Rules

- The manual must have an index that lists chapters in a stable study order.
- Each chapter must declare its purpose, intended reader and canonical source references.
- Manual chapters must distinguish explanation from enforceable governance.
- Manual organization must support incremental chapter additions without rewriting unrelated chapters.
- Manual content must remain subordinate to ADRs, requirements, graph records, contracts and deterministic gates.

## Acceptance Criteria

```gherkin
Scenario: Reader enters the manual from the index
  Given a reader wants to understand threat-forge from the project knowledge model
  When the reader opens the manual index
  Then the index presents a coherent chapter order
  And each chapter points to the canonical records it explains
  And the reader can distinguish study material from canonical governance sources
```

## Verification Expectation

Future validation should check that the manual index exists, chapter references resolve and canonical source links point to governed records.
