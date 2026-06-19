# MR-0003REQ-0002 — Child project governed commit-push gates

## Intent

Child projects must not bypass documentation and security-readiness checks during normal development.

This requirement extends the governed repository operation pattern used by threat-forge to future child projects.

## Requirement

The system must require routine child-project commit and push operations to run governed gates before changes are committed and pushed.

A governed child project must provide or receive an operation path equivalent in intent to threat-forge's `repo:check` and `repo:commit-push` flow. The child-project runner may be implemented differently, but it must enforce required documentation, graph, traceability, and threat-analysis readiness checks before routine commit/push operations.

Direct Git operations must remain an exception path for bootstrap, recovery, or emergency maintenance, not the routine workflow for governed child projects.

## Scope

This requirement applies to future child-project scaffolding, local repository operation policy, and child-project validation gates.

It covers the obligation to enforce checks before routine commit/push operations in child projects.

It does not define remote branch protection, CI/CD policy, or server-side hooks.

## Rules

- Governed child projects must have a local check command or equivalent governed operation entrypoint.
- Governed child projects must have a commit/push path that runs required gates before staging, committing, and pushing routine changes.
- Required gates must include documentation governance checks defined by the child project's profile.
- Required gates must include threat-analysis readiness checks once those profiles are introduced.
- Direct `git commit` or `git push` must be reserved for bootstrap, recovery, or emergency cases.
- Handoff instructions for child projects must prefer the governed operation path.

## Acceptance Criteria

```gherkin
Scenario: Child project routine change uses governed gates
  Given a governed child project has local changes
  When the operator performs a routine commit and push
  Then the child-project governed operation path runs required gates first
  And the commit/push is blocked if a required gate fails

Scenario: Missing gate blocks governed child-project status
  Given a child project does not provide a governed check or commit-push path
  When threat-forge validates the child project governance profile
  Then the child project is reported as not fully governed
```

## Verification Expectation

A future child-project operation validator must fail when a governed child project lacks a required check/commit-push path or when that path omits mandatory documentation and security-readiness gates.
