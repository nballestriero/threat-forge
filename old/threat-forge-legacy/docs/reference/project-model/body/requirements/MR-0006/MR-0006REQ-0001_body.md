# MR-0006REQ-0001 — STRIDE-AI overlay preserves base inventory

## Intent

STRIDE-AI analysis must enrich the Base Threat Analysis model without creating a competing AI-specific topology.

## Requirement

The STRIDE-AI overlay must preserve the Base Threat Analysis inventory of Actor, Component, Data Resource, Boundary, and Data Flow elements.

STRIDE-AI may classify, annotate, prioritize, and derive AI/RAG-specific reasoning from base elements and flows. It must not silently add, remove, or replace canonical model servers, vector stores, retrieval indexes, document corpora, agents, prompts, model responses, boundaries, or data flows. Missing AI/RAG pipeline elements must be proposed as Base Threat Analysis inventory changes.

## Scope

This requirement applies to STRIDE-AI under `MR-0006`.

It does not implement AI/RAG infrastructure, agents, model calls, vector indexes, or STRIDE-AI analysis tooling.

## Rules

- STRIDE-AI overlays must reference canonical base elements and data flows.
- AI/RAG-specific terms must refine or classify base elements; they must not replace base element identity.
- Missing pipeline elements discovered by STRIDE-AI must be proposed as Base Threat Analysis changes.
- Overlay annotations must remain distinguishable from base inventory records.

## Acceptance Criteria

```gherkin
Scenario: STRIDE-AI review identifies a missing vector index
  Given a base analysis includes an analysis agent and ChromaDB component but no retrieval index data resource
  When STRIDE-AI review identifies the missing index
  Then the review proposes a Base Threat Analysis inventory change
  And it does not create an overlay-only canonical data resource
```

## Verification Expectation

Future STRIDE-AI tooling should verify that AI/RAG overlay records reference base inventory and do not introduce ungoverned canonical elements.
