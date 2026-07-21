# MR-0005 — Common governed analysis model

## Intent

Define the common model through which ThreatForge governs methodology-specific analyses based on the Base Analysis and produces repeatable derived representations.

## Context

The BAE registry is the methodology-neutral canonical source for the analyzed system. Transformation of BAEs into methodology-specific analysis elements involves expert judgment when the selected method does not provide an unambiguous mapping. Reviewed and accepted analysis registries provide the inputs for deterministic validation and derived representation generation.

## Macro obligation

- The common analysis model must preserve the BAE registry as the methodology-neutral canonical source.
- Each analysis must record the expert-approved methodological interpretation separately.
- Methodology-specific registries must use the controlled taxonomies defined by their analysis method.
- The common analysis model must distinguish expert judgment from subsequent deterministic transformations.
- The DFD of an analysis must be derived deterministically from the governed registries accepted for that analysis.
- The renderer must consume a derived projection.
- The renderer must not contain Base Analysis or methodology-specific rules.
- Method-specific taxonomies and rules must belong to dedicated Macro-requirements.
- An analysis that identifies missing Base Analysis knowledge must record the discrepancy explicitly.
- The analysis process must not modify BAE registry records automatically.

## Scope

- Includes: common model and boundaries of governed analyses
- Includes: relationship between the canonical Base Analysis and methodology-specific registries
- Includes: separation between expert interpretation and deterministic transformations
- Includes: deterministic DFD derivation from accepted analysis registries
- Includes: separation between DFD projection and rendering
- Excludes: STRIDE-specific categories and rules
- Excludes: STRIDE-AI-specific categories and rules
- Excludes: detailed definition of DFD detail levels
- Excludes: automatic promotion of analysis discoveries into the BAE registry
- Excludes: automatic replacement of expert judgment

## Non-goals

- Define the complete registry schemas for every methodology
- Define detailed diagram layout rules
- Implement the complete correction lifecycle for elements missing from the Base Analysis
