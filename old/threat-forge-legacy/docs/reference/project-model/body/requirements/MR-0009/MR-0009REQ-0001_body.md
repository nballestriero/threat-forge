# MR-0009REQ-0001 — Threat Analysis Readiness Report

## Intent

Users must be able to understand whether a workspace has enough governed knowledge to start Threat Analysis.

## Requirement

The reporting model must support a Threat Analysis readiness report that summarizes whether governed documentation and graph relations are sufficient to prepare Base Analysis candidates and later methodology overlays.

The report must distinguish between missing evidence, weak evidence, incomplete Base Analysis preparation and overlay readiness. It must guide users toward documentation and graph improvements rather than pretending an analysis can proceed without required knowledge.

## Scope

This requirement applies to reporting semantics under `MR-0009`.

It does not implement report payloads, APIs, dashboards, scoring algorithms, gates, extraction tooling, DFD rendering, STRIDE or STRIDE-AI.

## Rules

- Readiness reporting must separate Base Analysis readiness from STRIDE and STRIDE-AI readiness.
- Readiness reporting must identify missing or weak evidence for assets, components, data resources, boundaries and data flows.
- Readiness reporting must not create canonical Base Analysis inventory.
- Readiness reporting must support threat-forge itself and child project workspaces.
- Future deterministic gates must be introduced only after readiness criteria and fixtures exist.

## Acceptance Criteria

```gherkin
Scenario: Project lacks explicit boundary evidence
  Given a workspace has components and data resources but no documented boundary evidence
  When a Threat Analysis readiness report is prepared
  Then the report marks Base Analysis readiness as incomplete
  And it explains that explicit boundary evidence is missing
  And it does not create or assume the missing boundary automatically
```

## Verification Expectation

Future reporting gates must verify readiness report criteria and negative fixtures before readiness status is used to block governed operations.
