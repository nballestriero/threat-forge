# MR-0009REQ-0002 — CI/CD Threat Analysis Status Report

## Intent

CI/CD must report whether current project state is covered by current security analysis.

## Requirement

The product reporting boundary must expose Threat Analysis status for the current branch/project state, including current, partially_current, stale_warning, stale_blocking, requires_review, requires_rebase, superseded, not_started and not_applicable outcomes.

## Scope

This requirement applies to reporting semantics. It does not implement report generation, JSON schema, APIs, dashboards or CI jobs.

## Rules

- Reports must include Base Analysis status.
- Reports must include STRIDE and STRIDE-AI overlay status when applicable.
- Reports must identify stale or missing analysis causes.
- Reports must support both threat-forge self-analysis and child projects.

## Acceptance Criteria

```gherkin
Scenario: Base Analysis is stale in CI
  Given the current branch changes a governed data flow
  When the CI/CD status report is produced
  Then it reports the affected Base Analysis as stale or requiring review according to policy
```

## Verification Expectation

Future CI/CD report generators must produce structured status records for dashboards and logs.
