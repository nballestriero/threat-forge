# MR-0001REQ-0027 — Future Data-Flow and Trust-Boundary Graph Vocabulary

## Intent

The project needs a governed way to describe data movement and boundary crossings before threat analysis can reason about them deterministically.

## Requirement

The project model must reserve future graph vocabulary for data-flow and trust-boundary concepts, including payloads, formats, contracts, validation boundaries, trust boundaries, transformations and component/application boundaries.

## Scope

This requirement applies to graph-model vocabulary planning for data-flow and boundary semantics. It does not implement registry entries, validators, runtime data-flow extraction or threat-analysis findings.

## Rules

- Candidate data-flow concepts must be documented before they are added to controlled registries.
- Trust-boundary concepts must be modeled as graph semantics that can later support security analysis.
- The vocabulary must distinguish data movement from threat findings.
- The vocabulary must be usable by Project Model Explorer traversal and future MR-0004 analysis.
- Candidate concepts must not be treated as allowed node types or predicates until registry work explicitly adds them.

## Acceptance Criteria

```gherkin
Scenario: Data-flow vocabulary is planned but not implemented as registry semantics
  Given the project needs to represent data movement and trust boundaries
  When the future graph vocabulary is inspected
  Then candidate data-flow and trust-boundary concepts are documented
  And they are not treated as controlled registry entries in this step

Scenario: Data-flow vocabulary supports future security analysis
  Given a browser request crosses application and backend boundaries
  When a future graph path is modeled
  Then the path can include payload, format, contract, validation, transformation and boundary concepts
```

## Verification Expectation

Current verification is provided by the existing ADR registry, Requirement registry, graph-format, body-format and project-model page gates. This requirement does not require new runtime code in this step. Future verification must be added when the candidate vocabulary is promoted into controlled node-type and predicate registries.
