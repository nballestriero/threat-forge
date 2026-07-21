# ADR-0001 — Expert analysis records and deterministic DFD derivation

## Status

Draft

## Context

The canonical Base Analysis represents methodology-neutral system knowledge. Method-specific interpretation can involve expert judgment, while repeatable validation, diagram generation and rendering require explicit accepted inputs and stable ownership boundaries.

## Decision

ThreatForge separates the canonical BAE registry, expert-authored methodology-specific analysis registries, deterministic DFD projections and rendering adapters. Methodology-specific analysis registries reference the canonical Base Analysis without modifying its records. Expert judgment produces reviewable analysis records governed by the selected method and its controlled taxonomies. Once those records are accepted, deterministic projection logic derives the DFD model consumed by renderers. Renderers present the derived model without owning Base Analysis or methodology-specific semantics.

## Consequences

- Benefit: The canonical Base Analysis remains independent from individual analysis methods.
- Benefit: Expert interpretation remains explicit and reviewable.
- Benefit: Accepted analysis registries provide stable inputs for repeatable DFD generation.
- Benefit: Multiple renderers can consume the same deterministic projection.
- Benefit: Method-specific Macro-requirements can extend the common model without redefining its boundaries.
- Cost: Each analysis method requires governed registries and controlled taxonomies.
- Cost: Expert-authored records require review before deterministic generation begins.
- Risk: Incomplete expert interpretation can produce an incomplete methodological analysis.
- Risk: Divergent method-specific schemas can reduce reuse when they bypass the common model.
- Constraint: Methodology-specific analysis registries do not modify canonical BAE records.
- Constraint: Deterministic DFD projection begins only from accepted analysis records.
- Constraint: Rendering adapters contain no independent Base Analysis or methodology-specific rules.

## Non-goals

- Define STRIDE-specific analysis categories
- Define STRIDE-AI-specific analysis categories
- Define detailed DFD layout or detail-level rules
- Implement the complete Base Analysis correction lifecycle
