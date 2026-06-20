# MR-0004REQ-0004 — Methodology overlay immutability boundary

## Intent

The Base Threat Analysis must define an immutability boundary between the canonical base inventory and methodology overlays.

## Requirement

Overlays such as STRIDE and STRIDE-AI may classify, refine, annotate, prioritize, and derive threat hypotheses, security properties, mitigations, findings, and specialized security requirements from the base model.

Overlays must not directly add, remove, or replace canonical Actors, Components, Data Resources, Boundaries, or Data Flows. If an overlay identifies a missing or incorrect base element, it must raise a proposed base-model change or diagnostic rather than silently mutating its own isolated topology.


## Scope

This requirement applies to the Base Threat Analysis model under `MR-0004`.

It does not implement runtime analysis, DFD rendering, STRIDE, STRIDE-AI, OpenAPI contracts, graph schema changes, or specialized security requirement generation.

## Rules

- STRIDE and STRIDE-AI overlays must not own the canonical base inventory.
- Overlay annotations must reference base elements instead of duplicating them as independent assets.
- Missing or incorrect base elements found during overlay work must be reported back to the Base Threat Analysis model.
- Specialized security requirements may be derived from overlay analysis but must preserve traceability to the base element and overlay rationale.

## Acceptance Criteria

```gherkin
Scenario: STRIDE discovers a missing data flow
  Given STRIDE analysis inspects a component and detects that an authentication data flow is missing from the base DFD
  When the STRIDE overlay records the issue
  Then it raises a proposed base-model change or diagnostic
  And it does not silently add a separate STRIDE-only data flow to the canonical topology

Scenario: STRIDE derives a specialized security requirement
  Given a base Data Flow crosses an API Boundary
  And STRIDE classifies the flow as relevant to tampering and information disclosure
  When the analysis derives a security requirement
  Then the specialized requirement references the base Data Flow, the Boundary, and the STRIDE rationale

```

## Verification Expectation

Future Base Threat Analysis, graph, DFD, and overlay gates must be able to verify this requirement before runtime implementation depends on it.
