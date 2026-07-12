# MR-0005REQ-0005 — STRIDE Overlay BaseAnalysisVersion Binding

## Intent

STRIDE overlays must be reproducible over a specific base snapshot.

## Requirement

Every STRIDE overlay must reference exactly one consolidated Base Analysis version and must treat that version as its canonical topology. The overlay must not claim current coverage for a different base snapshot without governed review or rebase.

## Scope

This requirement applies to STRIDE overlay lifecycle records. It does not implement STRIDE execution or finding generation.

## Rules

- A STRIDE overlay must reference one consolidated Base Analysis version.
- STRIDE findings must preserve the overlay version that produced them.
- STRIDE must not read mutable current documentation as canonical topology during overlay execution.

## Acceptance Criteria

```gherkin
Scenario: STRIDE overlay starts
  Given BaseAnalysisVersion-001 is consolidated
  When a STRIDE overlay is created
  Then it references BaseAnalysisVersion-001 as its canonical topology source
```

## Verification Expectation

Future STRIDE validators must reject overlays that do not reference a consolidated Base Analysis version.
