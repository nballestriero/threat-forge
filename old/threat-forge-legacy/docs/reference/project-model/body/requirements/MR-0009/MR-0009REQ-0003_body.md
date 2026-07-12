# MR-0009REQ-0003 — Security Analysis Policy Gate Outcome Reporting

## Intent

Policy gate warnings and blocks must be explainable.

## Requirement

When a future CI/CD policy gate warns or blocks because security analysis is stale, missing, incomplete or unsupported by evidence, the report must identify the policy outcome, affected analysis record, source snapshot, overlay, finding, requirement, mitigation or evidence item.

## Scope

This requirement applies to policy outcome reporting only. It does not implement the policy engine or gate.

## Rules

- Gate outcomes must distinguish warn from block.
- Reports must identify the concrete reason for each outcome.
- Missing evidence must be reported explicitly.
- Policy outcomes must be auditable under MR-0008.

## Acceptance Criteria

```gherkin
Scenario: CI/CD blocks due to stale overlay
  Given a STRIDE overlay is stale_blocking
  When the future policy gate runs
  Then the report identifies the stale overlay and why it blocks the pipeline
```

## Verification Expectation

Future policy gates must emit structured outcomes consumed by MR-0009 reports and MR-0008 audit records.
