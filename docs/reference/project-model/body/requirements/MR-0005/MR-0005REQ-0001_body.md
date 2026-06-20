# MR-0005REQ-0001 — STRIDE overlay preserves base inventory

## Intent

STRIDE analysis must enrich the Base Threat Analysis model without creating a competing canonical topology.

## Requirement

The STRIDE overlay must preserve the Base Threat Analysis inventory of Actor, Component, Data Resource, Boundary, and Data Flow elements.

STRIDE may classify, annotate, prioritize, and derive security reasoning from base elements and flows. It must not silently add, remove, or replace canonical base elements. When a STRIDE review discovers a missing element or flow, it must record a proposed Base Threat Analysis inventory change instead of mutating only the STRIDE overlay.

## Scope

This requirement applies to the STRIDE overlay governed by `MR-0005`.

It does not implement STRIDE analysis, graph schemas, security findings, mitigations, or specialized security requirement tooling.

## Rules

- STRIDE overlays must reference canonical base elements and data flows.
- STRIDE overlays must not create a parallel asset, boundary, or data-flow inventory.
- Missing canonical elements discovered by STRIDE must be proposed as Base Threat Analysis changes.
- Overlay annotations must remain distinguishable from base inventory records.

## Acceptance Criteria

```gherkin
Scenario: STRIDE review finds a missing boundary
  Given a base analysis contains a frontend, backend, and data flow but no API boundary
  When STRIDE review identifies the missing API boundary
  Then the STRIDE overlay records a proposed base-model change
  And it does not create an overlay-only canonical boundary
```

## Verification Expectation

Future STRIDE tooling and graph validation should verify that overlay records reference base elements and do not create ungoverned canonical inventory.
