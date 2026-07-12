# MR-0004REQ-0005 — Governed Project Knowledge Collection for Base Analysis

## Intent

The Base Threat Analysis must start from governed project knowledge rather than from an empty manual DFD.

## Requirement

The Base Analysis lifecycle must be able to collect and review security-relevant project knowledge from governed documentation, graph relations, requirements, ADRs, API contract ownership, source-layout decisions, runtime component descriptions, validation boundaries, data-flow vocabulary and evidence artifacts.

Collected knowledge may propose base-analysis candidates, but it must not become accepted Base Analysis inventory without review.

## Scope

This requirement applies to the Base Threat Analysis pipeline under `MR-0004`.

It does not implement extraction tooling, graph query APIs, DFD rendering, STRIDE, STRIDE-AI, reporting dashboards or security findings.

## Rules

- Project knowledge used by Base Analysis must be traceable to governed sources.
- Knowledge collection must distinguish source evidence from accepted Base Analysis inventory.
- Missing source evidence must be surfaced as a readiness issue instead of being silently guessed.
- The same collection model must apply to threat-forge itself and to child projects.

## Acceptance Criteria

```gherkin
Scenario: Base Analysis prepares candidates from governed project knowledge
  Given governed requirements, ADRs and graph relations describe a frontend, backend, registry data source and validation boundary
  When the Base Analysis preparation step collects project knowledge
  Then it can present candidate Components, Data Resources and Boundaries with source evidence
  And none of those candidates is accepted until reviewed
```

## Verification Expectation

Future Base Analysis readiness gates must verify that collected project knowledge remains source-traceable before candidate generation or review tooling depends on it.
