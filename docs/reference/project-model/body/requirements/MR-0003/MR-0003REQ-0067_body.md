# MR-0003REQ-0067 — Child project documentation source unavailable semantics

## Intent

Child documentation source failures must be explicit and safe. A missing, invalid or escaping child Project Model path must not look like valid platform documentation.

## Requirement

MR-0003 must keep child documentation source resolution fail-closed. If a registered child project cannot provide a valid child Project Model source, the resolver must return an explicit non-available descriptor with a stable status and explanatory message.

## Scope

This requirement applies to backend source resolution and derived child project read-model metadata.

It does not require implementing the final user-facing error copy, frontend routing, Git workspace provisioning or platform-to-child documentation proxy endpoints.

## Rules

- Missing local child repository paths must resolve to `unconfigured`.
- Unsupported repository kinds or Git-only registrations must resolve to `unsupported` until a governed checkout source exists.
- Missing Project Model directories must resolve to `unavailable`.
- Absolute Project Model roots or roots that resolve outside the registered child workspace must resolve to `unavailable`.
- Non-available child documentation sources must never fall back to threat-forge platform documents.

## Acceptance Criteria

```gherkin
Scenario: Missing local path stays explicit
  Given a registered local child project has no local path
  When the backend resolves the documentation source
  Then the source status is unconfigured
  And no platform source is returned

Scenario: Project Model root escapes the child workspace
  Given a registered child project declares a Project Model root outside its workspace
  When the backend resolves the documentation source
  Then the source status is unavailable
  And the descriptor explains that the root escapes the child workspace
```

## Verification Expectation

Runtime tests must cover unavailable and path-escape cases. Future project-scoped child documentation APIs must preserve these states rather than converting them into platform fallback behavior.
