# MR-0003REQ-0066 — Registered child project documentation source resolver

## Intent

Threat-forge must derive a child project's documentation source from the child project registration record instead of relying on a single global frontend child documentation URL.

## Requirement

MR-0003 must provide a backend resolver that accepts a registered child project record and returns a child Project Documentation Explorer source descriptor. The descriptor must identify whether the registered source is available, unconfigured, unsupported or unavailable.

For local child project registrations, the resolver must use the registered local repository path and Project Model root to determine whether the child Project Model can be served from the registered workspace.

## Scope

This requirement applies to the backend child project management boundary and its read models.

It does not require a new HTTP child-documentation proxy endpoint, Git checkout management, frontend routing changes, write APIs or mutation of child project files.

## Rules

- The resolver must use the registered child project record as the source of truth.
- Local child project records with an existing Project Model directory must resolve to an available filesystem source descriptor.
- Git-only child project records must resolve to an explicit unsupported state until a governed checkout/workspace resolver exists.
- The child project management read model must include the derived documentation source descriptor.
- The resolver must not substitute threat-forge platform Project Documentation Explorer endpoints or snapshots.

## Acceptance Criteria

```gherkin
Scenario: Local child project source is available
  Given a registered local child project has a local path
  And the configured Project Model root exists inside that child workspace
  When the backend resolves the documentation source
  Then the source status is available
  And the source type is filesystem

Scenario: Git child project source is not silently resolved
  Given a registered child project has only a Git repository URL
  When the backend resolves the documentation source
  Then the source status is unsupported
  And no platform documentation source is returned
```

## Verification Expectation

Runtime tests must exercise the resolver with local and Git child project registration records. The governed repository check must continue to pass.
