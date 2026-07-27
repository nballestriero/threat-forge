# ADR-0010 — Registry-derived extensibility of governed document models

## Status

Draft

## Context

ADR-0007 established the initial governed-document baseline as four logical models and seven representation profiles. ADR-0009 subsequently introduced Security Requirement as a fifth logical model, exposing that fixed model and profile cardinalities cannot remain structural invariants of the shared source loader or its consumers. Model-oriented validation remains valid, but its active model inventory requires an explicit extension boundary that preserves one canonical source and prevents consumer-specific inventories.

## Decision

ThreatForge treats the canonical document model index as the inventory of active governed document models and the referenced representation profiles as the corresponding profile inventory. Shared loaders, validators, authoring catalogs, assistance engines and other consumers derive their active inventories from those canonical sources or from deterministic projections. Numeric model and profile counts characterize individual governed milestones rather than the lasting shape of shared loading and validation infrastructure. A model extension consists of a canonical model entry, resolvable representation profiles, stable identifiers, controlled-value references, validation coverage and declared consumer coverage. Filesystem discovery and consumer-local model lists have no canonical role. ADR-0007 records the initial four-model, seven-profile baseline and the origin of canonical model-oriented validation. ADR-0009 owns Security Requirement semantics and records the first governed extension of that baseline.

## Consequences

- Benefit: Security Requirement can be introduced as a governed model extension instead of a shared-loader exception.
- Benefit: Future document models reuse one explicit catalog and deterministic extension boundary.
- Benefit: Consumers remain aligned with the same canonical model and profile inventory.
- Cost: Existing consumers with fixed four-model inventories require later governed refactoring.
- Cost: Model activation requires explicit source validation and consumer coverage.
- Risk: A model could be registered before every required consumer supports it.
- Risk: Overloading the model descriptor could transfer consumer-specific behavior into the canonical source.
- Constraint: Model and profile discovery remains explicit and registry-derived.
- Constraint: Milestone cardinalities remain separate from shared infrastructure invariants.
- Constraint: Model-specific semantics remain owned by their governing Decisions and Requirements.

## Non-goals

- Implement the Security Requirement model
- Modify the current model or representation profile registries
- Generalize governed document authoring or Markdown assistance
- Enable Governance Requirement children of Security Requirements
- Reintroduce the legacy graph or append-first mechanisms
