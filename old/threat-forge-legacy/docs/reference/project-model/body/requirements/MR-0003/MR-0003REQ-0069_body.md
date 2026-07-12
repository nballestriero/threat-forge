# MR-0003REQ-0069 — Project-scoped child documentation detail endpoint

## Intent

Threat-forge must provide governed Markdown detail reads for selected child project documentation entities without falling back to platform documentation.

## Requirement

MR-0003 must expose a read-only child project documentation detail endpoint scoped by child project id and documentation entity id. The endpoint must resolve the registered child project source and return the Project Documentation Explorer detail view-model for that child entity when the source is available.

If the child source is unavailable or the entity is missing, the endpoint must return explicit typed errors. The endpoint must not read or serve threat-forge platform documentation for a selected child project.

## Scope

This requirement applies to child-project-scoped backend detail routing, controller/service coordination, HTTP error mapping and runtime verification.

It does not require frontend consumption, write APIs, Git checkout management, child Project Model mutation, or platform documentation endpoint changes.

## Rules

- The detail endpoint must be scoped by child project id and entity id.
- Encoded entity ids must be decoded safely by the HTTP adapter.
- The endpoint must use the registered child project documentation source resolver.
- The endpoint must return child Project Documentation Explorer detail view-models only for available child sources.
- Source-unavailable and not-found states must remain explicit and must not cause platform fallback.

## Acceptance Criteria

```gherkin
Scenario: Available child project detail is served
  Given a registered local child project has an available Project Model source
  And the child Project Model contains a requirement body
  When the backend receives a project-scoped child documentation detail request
  Then it returns the child requirement detail view-model
  And the governed Markdown body is loaded from the child workspace

Scenario: Missing child source does not fall back
  Given a registered child project has no available Project Model source
  When the backend receives a project-scoped child documentation detail request
  Then it returns an explicit source unavailable error
  And no platform detail view-model is returned
```

## Verification Expectation

Runtime tests must cover detail reads from an available demo child Project Model and explicit failure for unavailable child sources. The governed repository check must continue to pass.
