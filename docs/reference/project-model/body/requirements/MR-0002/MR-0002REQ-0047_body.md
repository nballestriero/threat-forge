# MR-0002REQ-0047 — Project Documentation Explorer local serve command

## Intent

The Project Documentation Explorer read-only HTTP API must be startable locally through a governed command that uses the approved composition boundaries rather than ad hoc server wiring.

## Requirement

MR-0002 must provide a local Project Documentation Explorer serve command that assembles the backend module through a composition root and starts the read-only HTTP server for the governed Project Documentation Explorer API.

## Scope

This requirement applies to local development and verification startup of the Project Documentation Explorer read-only HTTP API. It does not introduce deployment behavior, mutation endpoints, document editing, registry writes, graph writes, repository operations, dynamic RBAC management, frontend HTTP migration, Base Analysis runtime APIs, STRIDE runtime APIs or STRIDE-AI runtime APIs.

## Rules

- The serve command must be exposed from the root package scripts as `backend:project-documentation-explorer:serve`.
- The serve command must assemble the Project Documentation Explorer module through a composition root or module factory.
- The serve command must pass composed controller and route descriptors into the native HTTP server boundary.
- The serve command must call `listen` only in the process-level CLI boundary.
- Controllers and route handlers must not instantiate concrete filesystem, YAML, Markdown, Git, registry or graph adapters directly.
- The local serve command must keep the API read-only and must not add endpoints beyond the governed Project Documentation Explorer GET operations.
- Host, port and repository-root configuration may be accepted for local use, but must not become a deployment contract in this micropasso.
- Initial access behavior may continue to use the registered-user capability boundary until MR-0007 defines richer runtime identity and authorization semantics.
- The implementation must include runtime smoke coverage for option parsing, composed app creation and short-lived local server startup.

## Acceptance Criteria

```gherkin
Scenario: Project Documentation Explorer starts through a governed local command
  Given the Project Documentation Explorer module factory can compose service, controller, routes, access policy and source adapter
  When the local serve command is executed for verification
  Then the native HTTP server is assembled from the composed controller and route descriptors
  And the server exposes the governed read-only Project Documentation Explorer GET operations
  And the process-level CLI boundary is the only place that starts listening
  And no mutation endpoint, frontend HTTP migration, dynamic RBAC model or threat-analysis runtime storage is introduced
```

## Verification Expectation

Runtime smoke tests must verify option normalization, composition-root app creation and short-lived local startup of the Project Documentation Explorer read-only server.
