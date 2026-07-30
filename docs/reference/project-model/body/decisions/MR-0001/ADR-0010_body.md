# ADR-0010 — Registry-derived extensibility of governed document models

## Status

Draft

## Context

ADR-0007 established canonical model-oriented validation for governed documents. Some shared loaders and consumers nevertheless encoded the active model inventory through fixed cardinalities or locally authored lists. ADR-0009 requires Security Requirement to enter the catalog as an additional governed document model, exposing the need for an explicit extension boundary that preserves one canonical inventory and prevents consumer-specific inventories.

## Decision

ThreatForge treats the canonical document model index as the inventory of active governed document models and the referenced representation profiles as the corresponding profile inventory. Shared loaders, validators, authoring catalogs, assistance engines and other consumers derive their active inventories from those canonical sources or from deterministic projections. Numeric model and profile counts are observations of a repository state and never define the lasting shape of shared loading, validation or consumer infrastructure. A model extension consists of a canonical model entry, resolvable representation profiles, stable identifiers, controlled-value references, validation coverage and declared consumer coverage. Filesystem discovery and consumer-local model lists have no canonical role. ADR-0007 owns canonical model-oriented validation, while ADR-0009 owns Security Requirement semantics and its governed extension of the catalog.

## Consequences

- Benefit: Security Requirement can be introduced as a governed model extension instead of a shared-loader exception.
- Benefit: Future document models reuse one explicit catalog and deterministic extension boundary.
- Benefit: Consumers remain aligned with the same canonical model and profile inventory.
- Cost: Existing consumers with consumer-local model inventories or closed dispatch require governed refactoring.
- Cost: Model activation requires explicit source validation and consumer coverage.
- Risk: A model could be registered before every required consumer supports it.
- Risk: Overloading the model descriptor could transfer consumer-specific behavior into the canonical source.
- Constraint: Model and profile discovery remains explicit and registry-derived.
- Constraint: Numeric model and profile cardinalities are not canonical architecture constraints.
- Constraint: Model-specific semantics remain owned by their governing Decisions and Requirements.

## Non-goals

- Implement the Security Requirement model
- Modify the current model or representation profile registries
- Implement model-specific authoring or Markdown assistance providers in this Decision
- Enable Governance Requirement children of Security Requirements
- Reintroduce the legacy graph or append-first mechanisms
