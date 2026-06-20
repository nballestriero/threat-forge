# MR-0004REQ-0012 — Base Analysis Rebase and Supersede Lifecycle

## Intent

Stale Base Analysis versions need governed ways to become current again or be replaced.

## Requirement

The Base Analysis lifecycle must support governed review, rebase and supersede outcomes. A stale analysis may be reviewed as still applicable, rebased onto a new source snapshot, or superseded by a new Base Analysis version.

## Scope

This requirement applies to lifecycle decisions. It does not implement diffing, rebase tooling, UI or storage.

## Rules

- Rebase must preserve the previous analyzed snapshot and evidence.
- Supersede must preserve the superseded version for audit.
- Review decisions must record evidence and reviewer context under MR-0008.
- Overlays depending on a superseded or rebased base must receive stale propagation.

## Acceptance Criteria

```gherkin
Scenario: Base Analysis is superseded
  Given BaseAnalysisVersion-001 is stale
  When BaseAnalysisVersion-002 is consolidated as its replacement
  Then BaseAnalysisVersion-001 remains auditable
  And overlays referencing BaseAnalysisVersion-001 are marked stale or superseded according to policy
```

## Verification Expectation

Future lifecycle validators must verify that rebase and supersede transitions are evidence-backed.
