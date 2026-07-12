# MR-0002REQ-0006 — Project Model Explorer normalized view model

## Intent

React components need a stable presentation model that is independent from the internal shape of project-model registries and generated artifacts.

This requirement defines what kind of data the Project Model Explorer view model may contain without freezing a final runtime schema in this document-only step.

## Requirement

The Project Model Explorer must use a normalized, presentation-oriented view model for frontend consumption.

The view model must organize project-model information into UI-safe summaries and graph structures, such as macro-requirements, ADR, requirements, taxonomies, graph nodes, graph edges, traceability metadata, diagnostics, counts, and filter metadata. It must hide internal source-file parsing details from React components.

## Scope

This requirement applies to the frontend/backend contract for the explorer. It does not define the exact OpenAPI schema, Zod schema, TypeScript type, visual layout, graph rendering library, or final filter vocabulary.

## Rules

- The view model must be normalized for rendering and traversal.
- The view model must represent stable IDs for macro requirements, ADR, requirements, graph nodes, and graph relations.
- The view model may include counts, lifecycle/status values, type labels, relationship labels, diagnostic summaries, and filter metadata.
- The view model must avoid leaking raw file parser structures as the public component contract.
- The view model must distinguish source identity from presentation state.
- The view model must be suitable for both threat-forge self-exploration and future child-project exploration.

## Acceptance Criteria

```gherkin
Scenario: Explorer view model supports graph rendering
  Given the Project Model Explorer displays project-model relationships
  When the frontend receives the explorer view model
  Then the model contains normalized nodes and edges
  And each rendered relationship can be traced back to governed project-model identity

Scenario: Explorer view model hides source parsing details
  Given project-model data originates from registries and body files
  When the frontend consumes the explorer view model
  Then React components receive summaries and relationships
  And they do not depend on YAML parser structures, Markdown parser output, or filesystem paths as their rendering contract
```

## Verification Expectation

Future contract and frontend tests must verify that explorer components render normalized view-model records and do not depend on raw project-model source-file structures.
