# ADR-0001 — Modello unificato dei progetti target e separazione tra motore e target

## Status

Draft

## Context

ThreatForge applies governed documentation and analysis principles to itself, to internal demonstration projects and to external child repositories. Treating those cases as unrelated structures would duplicate templates, couple tools to repository location and make equivalence difficult to verify. A private engine copy inside each target would also allow checkers and contracts to diverge from the centrally governed ThreatForge implementation.

## Decision

ThreatForge adopts one Target Project model with self-analysis, internal demonstration and external child repository as governed target kinds. The model assigns every target a stable identity, an explicit target kind, an isolated project root and a generated canonical documentation structure conforming to MR-0001 and Diátaxis. Internal demonstrations and external child repositories derive their initial project structure, valid empty registries and governed document skeleton from the same governed template source. The ThreatForge engine and the analyzed target are separate execution concepts, including self-analysis where both roots identify the same repository. Target-aware tools access project content through reusable interfaces governed by MR-0002 instead of relying on engine-root and target-root equality. Each target owns its project documentation, registries, source content, reports and materialized projections without contributing records or counts to another target. The ThreatForge engine remains centrally maintained and outside generated targets, apart from thin launchers, configuration or continuous-integration metadata that delegate execution to a compatible engine. A separate MR-0004 Decision governs compatibility versions, gate profiles and migration behavior.

## Consequences

- Benefit: Self-analysis, internal demonstrations and external child repositories exercise one project model.
- Benefit: One governed template source prevents structural drift between internal and external targets.
- Benefit: Target isolation prevents registries, reports, counts and materializations from being mixed across projects.
- Benefit: Engine and target separation makes reusable tooling possible without copying canonical rules.
- Benefit: A demonstration project can validate the complete workflow before ThreatForge documentation is analyzed element by element.
- Cost: Existing tools that assume the repository root is both engine and target require explicit target context.
- Cost: Template generation creates valid semantic placeholders instead of relying on empty Git directories.
- Cost: Verification covers self, internal and external target locations.
- Risk: The first template could freeze unnecessary ThreatForge-specific structure into child projects.
- Risk: Thin target launchers could accidentally grow into duplicated engine logic.
- Risk: Target isolation defects could contaminate reports or canonical registries across projects.
- Constraint: MR-0001 remains authoritative for governed documentation structure and Diátaxis rules.
- Constraint: MR-0002 remains authoritative for reusable authoring and target-access interfaces.
- Constraint: MR-0003 remains authoritative for Base Analysis Element semantics and project analysis.
- Constraint: MR-0004 owns target identity, generation, isolation and lifecycle orchestration.
- Constraint: Internal demonstrations and external child repositories originate from the same governed template source.
- Constraint: Target-specific product requirements remain inside the target project model.
- Constraint: Version compatibility and migrations require a separate governed Decision before implementation.

## Non-goals

- Define the final field set of the target project descriptor
- Define project contract versions, gate profile versions or migration algorithms
- Implement target-aware tooling
- Create the first demonstration project
- Support arbitrary unstructured legacy repositories
- Copy the ThreatForge engine into generated targets
