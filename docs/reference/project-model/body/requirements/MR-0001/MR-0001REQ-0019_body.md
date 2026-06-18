# MR-0001REQ-0019 — Code RTM generation from knowledge graph

## Intent

This requirement derives from `MR-0001/ADR-0008` and defines one small, verifiable obligation for the project-model governance substrate.

## Requirement

The project model must generate code traceability matrix outputs from the knowledge graph rather than maintaining the matrix manually.

## Scope

This requirement defines the obligation only. It does not implement a validator, registry, renderer, RTM generator, graph view, LLM guide, source-code scanner, or runner in this micropasso.

## Rules

- The requirement must remain traceable to its deriving ADR.
- Any future implementation must be represented in the project-model graph before it is treated as implemented.
- Any future verification must produce deterministic diagnostics and must be represented in the project-model graph before the requirement is considered verified.
- Dynamic repository facts must be checked by commands at handoff time rather than inferred from static documentation.

## Acceptance Criteria

```gherkin
Scenario: Requirement is represented as a governed project-model obligation
  Given the deriving ADR has been accepted
  When this requirement is added to the project model
  Then the requirement has a registry record
  And the requirement has an independent body
  And the project-model graph links the ADR to the requirement
  And no implementation is introduced before this requirement exists
```

## Verification Expectation

A future validator must check that this requirement remains registered, has a body conforming to the governed requirement body format, and remains connected to its deriving ADR in the project-model graph.
