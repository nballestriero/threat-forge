# MR-0002REQ-0005 — Project Model Explorer read-only API boundary

## Intent

The Project Model Explorer needs a backend-facing product boundary before any UI or runtime implementation is introduced.

This requirement defines the first read-only API boundary for exposing governed project-model information to frontend modules.

## Requirement

Threat-forge must expose the Project Model Explorer through a read-only backend API boundary that returns a normalized explorer view model instead of raw YAML, Markdown, graph registry, Git, filesystem, or generated-page data.

The future implementation must follow the backend architecture defined by `MR-0002`: controller or route boundary, application service, project-model query ports, concrete adapters wired by factory or composition root, Zod runtime validation, and OpenAPI HTTP contract.

## Scope

This requirement applies to the first Project Model Explorer API slice for threat-forge itself and later child-project workspaces.

It defines the API boundary concept only. It does not implement a route, service, port, adapter, OpenAPI file, Zod schema, or persistence mechanism.

## Rules

- The Project Model Explorer API must be read-only in its first slice.
- The API must return a normalized explorer view model.
- The API must not expose raw registry files as its frontend component contract.
- The controller must delegate explorer assembly to an application service when implemented.
- The application service must depend on project-model reader or query ports.
- Concrete filesystem, Git, generated-artifact, registry, or child-workspace adapters must be wired outside controllers.
- The HTTP contract must be represented through OpenAPI when implementation begins.
- Runtime boundary data must be validated with Zod when implementation begins.

## Acceptance Criteria

```gherkin
Scenario: Explorer API returns a read-only view model
  Given the frontend needs to display the Project Model Explorer
  When it requests explorer data
  Then the backend boundary returns a normalized read-only view model
  And it does not return raw YAML, Markdown, Git, filesystem, or generated HTML as the component contract

Scenario: Explorer controller stays thin
  Given the Project Model Explorer API is implemented
  When the controller handles an explorer request
  Then it delegates view-model assembly to an application service
  And it does not instantiate concrete project-model adapters directly
```

## Verification Expectation

Future OpenAPI, Zod, backend architecture, and code-traceability checks must be able to verify that the explorer API is read-only, contract-backed, and assembled through service/port/adapter boundaries.
