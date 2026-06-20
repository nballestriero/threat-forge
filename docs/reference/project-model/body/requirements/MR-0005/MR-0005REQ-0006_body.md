# MR-0005REQ-0006 — STRIDE Overlay Stale and Rebase Policy

## Intent

STRIDE overlay status must follow stale Base Analysis changes.

## Requirement

When the referenced Base Analysis version becomes stale, requires rebase or is superseded, the STRIDE overlay must be marked stale, require review, require rebase or be superseded according to policy. Historical findings must remain linked to their original overlay.

## Scope

This requirement applies to STRIDE overlay lifecycle semantics. It does not define final policy thresholds or implement gates.

## Rules

- Stale base status must propagate to dependent STRIDE overlays.
- Accepted findings must retain historical overlay references.
- Rebased overlays must not overwrite previous evidence.
- CI/CD reports must distinguish historical STRIDE findings from current STRIDE coverage.

## Acceptance Criteria

```gherkin
Scenario: STRIDE base becomes stale
  Given a STRIDE overlay references BaseAnalysisVersion-001
  When BaseAnalysisVersion-001 becomes stale_blocking
  Then the STRIDE overlay is not reported as current coverage without review or rebase
```

## Verification Expectation

Future reporting must expose STRIDE stale/rebase state in the CI/CD security analysis report.
