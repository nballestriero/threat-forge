# ADR-0001 — Modello unificato dei progetti target e separazione tra motore e target

## Status

Draft

## Context

ThreatForge needs a small demonstrable path from governed project creation to documentation, code traceability and threat analysis. The first usable product covers an internal demonstration project and a newly created external project, both generated in a location selected by the user. Separate implementations for internal and external projects would duplicate structure and behavior, while embedding project-generation logic directly in a command-line interface would obstruct the later web interface.

## Decision

ThreatForge adopts one Target Project model for internal demonstration projects and newly created external projects. Project creation receives an explicit destination root selected by the user and produces the governed project structure at that location. Subsequent authoring, verification and analysis receive an explicit target root identifying the created project. The same project generator, target-access behavior and governed template apply whether the destination is located inside the ThreatForge repository or elsewhere on the filesystem. The ThreatForge engine and the target project remain separate execution concepts, and each target owns its documentation, registries, source content, reports and materialized projections. Application services contain project creation and target-access behavior independently from delivery adapters. The initial product exposes those services through a command-line adapter, while a later web interface reaches the same services through a backend API without duplicating generation or analysis logic. ThreatForge repository verification remains development governance and is not represented as a Target Project kind.

## Consequences

- Benefit: One generator supports both the internal demonstration and a newly created external project.
- Benefit: An explicit destination root lets the user choose where a new project is created.
- Benefit: An explicit target root lets later commands operate on the created project without assuming its location.
- Benefit: Shared application services preserve the same behavior across the initial CLI and the later web interface.
- Benefit: Target isolation prevents documentation, registries, reports, counts and materializations from contaminating the ThreatForge project model.
- Cost: Project creation and project access require separate validated path inputs.
- Cost: Filesystem operations require safe path resolution and deterministic handling of existing destinations.
- Cost: CLI and backend API adapters require verification against the same application-service contracts.
- Risk: An incorrect destination could overwrite or mix content if destination validation is incomplete.
- Risk: Adapter-specific logic could cause CLI and web behavior to diverge.
- Risk: Internal demonstration paths could accidentally be included in ThreatForge canonical counts.
- Constraint: MR-0001 remains authoritative for governed documentation structure and Diátaxis rules.
- Constraint: MR-0002 remains authoritative for reusable application interfaces and delivery-adapter separation.
- Constraint: MR-0003 remains authoritative for Base Analysis Element semantics and project analysis.
- Constraint: MR-0004 owns target generation, target-root selection, isolation and lifecycle orchestration.
- Constraint: Internal and external projects originate from the same governed template and application services.
- Constraint: The initial implementation uses a CLI adapter and preserves a backend-service boundary suitable for the later web interface.
- Constraint: Target-specific product requirements remain inside the generated target project model.

## Non-goals

- Model ThreatForge repository verification as a Target Project kind
- Import or migrate arbitrary existing repositories
- Define compatibility versions or migration mechanisms
- Implement multiple concurrent target sessions
- Define the final web user interface
- Implement project generation or target analysis in this Decision
