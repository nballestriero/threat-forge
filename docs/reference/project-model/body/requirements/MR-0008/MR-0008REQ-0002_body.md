# MR-0008REQ-0002 — Threat Analysis Evidence and Review Record Retention

## Intent

Review and policy decisions must preserve evidence across evolving project states.

## Requirement

Threat Analysis review decisions must retain evidence records for accepted/rejected findings, stale reviews, rebase decisions, supersede decisions, policy warnings, policy blocks, mitigations and verification results.

## Scope

This requirement defines evidence retention boundaries. It does not implement storage, retention policy, UI or export.

## Rules

- Evidence records must reference the analyzed source snapshot or lifecycle transition.
- Evidence must not be destroyed when a newer analysis supersedes an older one.
- Rejected findings must preserve rationale.
- Policy blocks must expose the evidence or missing evidence that caused them.

## Acceptance Criteria

```gherkin
Scenario: Finding is rejected during review
  Given a candidate finding exists
  When a reviewer rejects it
  Then the rejection rationale and evidence are retained for audit
```

## Verification Expectation

Future evidence validators must check that accepted/rejected lifecycle decisions keep review evidence.
