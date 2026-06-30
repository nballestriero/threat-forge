# MR-0003REQ-0068 — Project-scoped child documentation collection endpoint

## Intent

Threat-forge must let the platform request documentation items for the selected child project through a backend project-scoped API instead of a global child documentation URL.

## Requirement

MR-0003 must expose a read-only child project documentation collection endpoint scoped by child project id. The endpoint must resolve the registered child project, use its derived documentation source metadata, and return a Project Documentation Explorer collection view-model for that child project when the source is available.

If the child project source is unconfigured, unsupported or unavailable, the endpoint must return an explicit typed error and must not return threat-forge platform documentation.

## Scope

This requirement applies to the backend child project management API, its controller/service boundary, route descriptors, native HTTP adapter and OpenAPI contract.

It does not require frontend routing changes, write APIs, Git checkout management, child project mutation or removal of the existing platform documentation endpoints.

## Rules

- The endpoint must be scoped by registered child project id.
- The endpoint must use the child project documentation source resolver as the source of truth.
- Available local filesystem sources may be served through the Project Documentation Explorer service boundary.
- Non-available child sources must return explicit typed errors.
- The endpoint must not substitute platform Project Documentation Explorer endpoints or snapshots.

## Acceptance Criteria

```gherkin
Scenario: Available child project collection is served
  Given a registered local child project has an available Project Model source
  When the backend receives a project-scoped child documentation collection request
  Then it returns Project Documentation Explorer items from the child project
  And it does not include platform-only documentation items

Scenario: Unavailable child source is explicit
  Given a registered child project has no available Project Model source
  When the backend receives a project-scoped child documentation collection request
  Then it returns an explicit documentation source unavailable error
  And no platform documentation is returned
```

## Verification Expectation

Runtime tests must cover collection reads for an available demo child Project Model and explicit unavailable-source responses. The governed repository check must continue to pass.
