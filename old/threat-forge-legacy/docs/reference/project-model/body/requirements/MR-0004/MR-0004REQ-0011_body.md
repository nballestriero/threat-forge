# MR-0004REQ-0011 — Security-Relevant Change Detection Inputs

## Intent

CI/CD must know which project changes may affect Base Analysis validity.

## Requirement

The project must define security-relevant change inputs for stale detection, including changes to requirements, ADRs, graph relations, API contracts, components, data resources, boundaries, data flows, evidence references and source artifacts linked to analyzed behavior.

## Scope

This requirement defines input classes only. It does not implement change detection or policy thresholds.

## Rules

- Changes to accepted base inventory inputs must be detectable as candidates for stale analysis.
- Changes to data-flow or boundary documentation must be treated as security-relevant candidates.
- Changes to implementation artifacts linked to analyzed components must be reportable.
- Non-relevant changes may be allowed without forcing analysis rebase when policy permits.

## Acceptance Criteria

```gherkin
Scenario: Data flow changes after analysis
  Given a consolidated Base Analysis references a data-flow snapshot
  When a governed data-flow relation changes
  Then CI/CD can classify the change as security-relevant for stale detection
```

## Verification Expectation

Future stale-detection tooling must map changed files and graph records to these input classes.
