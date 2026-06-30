# MR-0003REQ-0073 — Visible live documentation source status

## Intent

Users reviewing Project Documentation Explorer data must be able to see whether the current documentation is loaded from a live source, a generated snapshot, a snapshot fallback or an unavailable child project source.

## Requirement

The Project Documentation Explorer page must render a visible live documentation source status. The status must show the source label, live/snapshot/fallback/unavailable state, selected and effective source identifiers, scope, transport, project label when available and endpoint or endpoint template when available.

The status must remain visible while loading and when a child project documentation source is unavailable, so source failures are explainable instead of appearing as generic empty states.

## Scope

This requirement applies to the Project Documentation Explorer page and frontend composition used by platform and child project document views.

It does not require shell-wide telemetry, backend endpoint changes, write APIs, dynamic RBAC administration or repository cloning.

## Rules

- Platform snapshot views must be labeled as snapshot-backed rather than live.
- Platform HTTP views must be labeled as live.
- HTTP-to-snapshot fallback must be labeled as fallback and show the failure message.
- Child project views must identify the selected child project when the client provides project metadata.
- Unavailable child project sources must keep the source status visible alongside the unavailable error.

## Acceptance Criteria

```gherkin
Scenario: User sees documentation source state
  Given the Project Documentation Explorer page is opened
  When documentation data is loading, loaded or unavailable
  Then the page shows a live documentation source status
  And the status distinguishes live API data from generated snapshots and unavailable child sources
```

## Verification Expectation

Frontend-client runtime tests must verify the source metadata consumed by the page. The governed repository check and frontend build must continue to pass.
