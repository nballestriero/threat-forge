# MR-0004REQ-0017 — Taxonomy Mapping and Version Binding for Analysis Snapshots

## Intent

Versioned analysis records must remain reproducible when taxonomy definitions evolve.

## Requirement

A future BaseAnalysisVersion must record the taxonomy versions used to classify its base elements, including the canonical base taxonomy version and any domain, methodology, workspace or project custom taxonomy versions referenced by the analysis. Taxonomy changes must be eligible security-relevant change inputs for stale detection.

## Scope

This requirement applies to future analysis snapshot semantics. It does not implement snapshot storage or stale detection tooling.

## Rules

- BaseAnalysisVersion records must identify taxonomy versions used for classification.
- Overlay records must identify methodology taxonomy versions used for analysis.
- Custom taxonomy changes may trigger review, rebase or supersede decisions.
- Historical analysis versions must remain reproducible against the taxonomy versions they used.

## Acceptance Criteria

```gherkin
Scenario: Taxonomy change affects a consolidated analysis
  Given BaseAnalysisVersion-001 was consolidated using project taxonomy irrigation_component_type@1.0.0
  When the project taxonomy changes to irrigation_component_type@1.1.0
  Then CI/CD status reporting can mark the analysis as requiring review or rebase according to policy
```

## Verification Expectation

Future lifecycle validators must verify that analysis snapshots identify the taxonomy versions used for reviewed classifications.

