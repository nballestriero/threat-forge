# MR-0002REQ-0016 — Project Model Explorer guided traversal and data-flow traceability contract

## Intent

The Project Model Explorer must eventually explain logical paths through the system, including the data passed between browser, API, backend layers, project-model sources, and frontend rendering.

This requirement supports system understanding and precise security analysis by making boundary, requirement, implementation, and data-flow paths explicit.

## Requirement

A future Project Model Explorer API must support guided traversal paths that can explain how a feature, browser request, route, document entity, ADR, requirement, or security concern connects to related project-model and implementation artifacts.

Guided traversal must be able to show paths such as browser request to API boundary, OpenAPI contract, runtime validation, controller, service, port, adapter, project-model source, normalized response, frontend client, view model, and rendered UI state.

Traversal results must also be able to describe data-flow and format traceability for important handoffs. For each important handoff, the future representation must be able to identify the data being passed, its format, applicable contract, source boundary, target boundary, validation, transformation, and related ADR or requirement.

## Scope

This requirement applies to future guided traversal and explainability-path API design for the Project Model Explorer.

It does not create path endpoints, traversal algorithms, source-code analyzers, data-flow taxonomies, STRIDE analysis, backend routes, OpenAPI schemas, Zod schemas, frontend UI, or security reports.

## Rules

- Guided traversal must be read-only.
- Traversal semantics must be owned by backend/project-model services, not React components.
- Traversal must be able to connect MR, ADR, functional requirements, specialized/security requirements, implementation artifacts, backend components, verification evidence, and diagnostics when available.
- Traversal must be able to include boundary and data-flow information when available.
- Data-flow traceability must record or describe data shape, format, contract, validation, transformation, source boundary, and target boundary.
- The contract must prepare for future trust-boundary and security-analysis use cases.
- Full threat-analysis methodology behavior belongs to `MR-0004` and later analysis macro requirements, not to this API-boundary requirement.

## Acceptance Criteria

```gherkin
Scenario: User follows a feature-to-implementation path
  Given guided traversal is implemented
  When a user starts from a Project Model Explorer browser feature
  Then the backend can return an explainable path through API boundary, ADR, requirements, implementation artifacts, backend components, and verification evidence where available
  And the frontend renders the path without deriving traversal semantics from raw source files

Scenario: Security reviewer inspects data passed through a boundary
  Given guided traversal includes data-flow traceability
  When a security reviewer follows a browser-to-backend path
  Then the response identifies the data handoffs, formats, contracts, validations, transformations, and source/target boundaries available for that path
  And the result can support later STRIDE or STRIDE-AI analysis
```

## Verification Expectation

Future OpenAPI, backend, graph, and security-analysis gates must be able to verify that guided traversal and data-flow traceability are governed contracts before runtime implementation relies on them.
