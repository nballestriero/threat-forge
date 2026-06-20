# MR-0004REQ-0010 — Base Analysis Lifecycle and Stale Status Model

## Intent

Base Analysis must have explicit lifecycle and stale states so CI/CD can distinguish historical coverage from current coverage.

## Requirement

The Base Analysis lifecycle must support draft, ready_for_review, consolidated, stale_warning, stale_blocking, requires_rebase, superseded and archived semantics. Current coverage must be derived from lifecycle state plus snapshot comparison rather than from the mere existence of an old analysis.

## Scope

This requirement applies to lifecycle state semantics. It does not implement UI, storage, policy configuration or gate execution.

## Rules

- Draft analyses must not be treated as current coverage.
- Consolidated analyses may be current only while their source snapshot remains applicable.
- Stale states must preserve historical evidence.
- Superseded analyses must remain available for audit.

## Acceptance Criteria

```gherkin
Scenario: Project changes after Base Analysis consolidation
  Given BaseAnalysisVersion-001 is consolidated
  When a security-relevant project input changes
  Then the Base Analysis is no longer silently treated as current coverage
  And its lifecycle indicates stale or rebase status according to policy
```

## Verification Expectation

Future CI/CD gates must report Base Analysis lifecycle state before accepting analysis coverage.
