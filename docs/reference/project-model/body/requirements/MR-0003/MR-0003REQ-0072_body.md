# MR-0003REQ-0072 — Documentation source status metadata contract

## Intent

The frontend needs stable metadata that identifies which documentation source is selected and which source is effectively serving the displayed Project Documentation Explorer data.

## Requirement

Project Documentation Explorer frontend clients must attach a normalized `data_source` status record to collection, filter and detail view-models. The status must identify selected source, effective source, fallback state, source scope, transport, endpoint or endpoint template, project id or label when relevant, and whether the data is live.

The same metadata must be available through the client `describeDataSource` boundary before reads complete so the UI can render source status during loading or unavailable states.

## Scope

This requirement applies to generated snapshot, live platform HTTP, live HTTP with snapshot fallback, unavailable child source and project-scoped child documentation frontend clients.

It does not require backend schema changes, write APIs, filesystem access from the browser or removal of the platform snapshot fallback for platform documentation views.

## Rules

- Snapshot-backed platform data must be identified as non-live static data.
- Governed platform HTTP data must be identified as live HTTP data.
- Snapshot fallback must preserve the selected source and expose the effective snapshot source plus the live failure message.
- Project-scoped child documentation data must include the child project id, label and project-scoped endpoint template.
- Unavailable child documentation sources must expose `effective_source: unavailable` and must not report live data.

## Acceptance Criteria

```gherkin
Scenario: Frontend clients expose source metadata
  Given a Project Documentation Explorer frontend client
  When it returns collection, filter or detail data
  Then the payload includes normalized data_source metadata
  And the metadata identifies live, snapshot, fallback or unavailable source state
```

## Verification Expectation

Runtime frontend-client tests must verify source metadata for snapshot, live HTTP, snapshot fallback, project-scoped child API and unavailable child source clients. The governed repository check must continue to pass.
