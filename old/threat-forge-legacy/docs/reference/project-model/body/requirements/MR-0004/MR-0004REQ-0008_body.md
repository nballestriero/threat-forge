# MR-0004REQ-0008 — Versioned Base Analysis Snapshot for Overlays

## Intent

Methodology overlays must use a stable, reviewed Base Analysis snapshot as their canonical topology input.

## Requirement

The Base Analysis lifecycle must produce versioned snapshots that preserve accepted Actors, Components, Data Resources, Boundaries, Data Flows, DFD projections, aggregation views, source evidence and review status.

STRIDE, STRIDE-AI and future methodology overlays must reference a specific Base Analysis snapshot. They must not treat raw documentation or unreviewed candidates as their canonical topology.

## Scope

This requirement applies to the boundary between Base Threat Analysis and methodology overlays.

It does not implement snapshot storage, overlay execution, findings, mitigation tracking, STRIDE, STRIDE-AI or reporting dashboards.

## Rules

- A consolidated Base Analysis snapshot must be versioned.
- Overlay analyses must reference a specific Base Analysis snapshot.
- Superseded snapshots must remain available for evidence and reproducibility.
- Overlay-discovered topology gaps must create correction proposals for a future Base Analysis version.
- Overlays must not directly add, remove or mutate canonical base inventory.

## Acceptance Criteria

```gherkin
Scenario: STRIDE references a reviewed Base Analysis snapshot
  Given BaseAnalysisVersion-001 is consolidated
  When a STRIDE overlay is started
  Then the overlay references BaseAnalysisVersion-001
  And it cannot directly add or remove canonical Actors, Components, Data Resources, Boundaries or Data Flows
```

## Verification Expectation

Future overlay gates must verify that each overlay references a consolidated Base Analysis snapshot before findings or security requirements are promoted.
