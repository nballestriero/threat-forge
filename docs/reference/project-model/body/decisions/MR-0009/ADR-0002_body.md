# ADR-0002 — CI/CD Security Analysis Reporting and Policy Gate Boundary

## Status

Accepted.

## Context

Threat analysis must support continuous development. Base Analysis and methodology overlays are versioned against snapshots, while code, documentation, graph records and contracts continue to change.

CI/CD must expose whether the current project state is covered by current security analysis, partially covered, stale, blocked by policy or waiting for review. Reporting must come before implementation so future gates and dashboards share the same semantic boundary.

This step is document-only. It does not implement CI/CD checks, dashboards, policy engines, stale detection tooling or report payloads.

## Decision

`MR-0009` must own product-level reporting for CI/CD security analysis status and policy gate outcomes.

The report boundary must distinguish at least:

```text
current
partially_current
stale_warning
stale_blocking
requires_review
requires_rebase
superseded
not_started
not_applicable
```

CI/CD policy outcomes must be explainable. A future gate must report which analysis record, snapshot, overlay, finding, requirement, mitigation or evidence item caused a warning or block.

The report must not be the policy engine itself. It is the product-intelligence boundary consumed by dashboards, CI logs, future APIs and human reviewers.

## Scope

In scope:

- CI/CD security analysis status reporting semantics;
- policy gate outcome reporting;
- explaining stale/blocked/review-required outcomes;
- product-level reporting for threat-forge and child projects.

Out of scope:

- implementing the policy engine;
- implementing CI/CD jobs;
- defining final report JSON schema;
- implementing dashboards or exports.

## Consequences

### Positive consequences

- Development can continue while stale analysis is visible.
- Policy blocks can be explained and audited.
- Dashboards and CI/CD logs can use consistent status semantics.

### Negative consequences

- Future gates must produce structured outcomes, not just pass/fail text.
- Reporting cannot be complete until analysis lifecycle records and evidence records exist.

## Follow-up

1. Define the CI/CD security analysis report contract.
2. Define default policy levels for stale and missing analysis.
3. Define dashboard views for branch/project/child-project security analysis status.
