# MR-0004 — Ciclo di vita governato dei progetti target

## Intent

Define how ThreatForge creates, accesses, validates, isolates and analyzes governed Target Projects at user-selected filesystem locations.

## Context

ThreatForge needs one small and reproducible path from project creation to governed documentation and documentation-derived Base Analysis. An internal demonstration project and a newly created external project use the same Target Project model even though their destination locations differ. The ThreatForge engine remains separate from every target, and the initial demonstrable target can represent a system through governed documentation before executable application code exists.

## Macro obligation

- ThreatForge must use one Target Project model for an internal demonstration project and a newly created external project.
- Target Project creation must receive one explicit destination root selected for the creation request.
- Subsequent Target Project authoring, verification and analysis must receive one explicit target root.
- Internal and external Target Projects must originate from the same governed template and application behavior.
- Every Target Project must own its project-local documentation, registries, reports and materialized projections.
- A Target Project must remain structurally valid without executable source code, a running backend, a frontend or a database instance.
- Every Target Project must support project-local Macro-requirement, Decision, Functional Requirement and Base Analysis records.
- Target Project documentation must provide project-local sources for actors, logical components, data resources, trust boundaries and information flows.
- Target Project records must preserve stable project-local identifiers and source paths.
- Base Analysis Element provenance must resolve to governed sources owned by the analyzed Target Project or to explicit reviewed analytical additions.
- Target Project creation and use must not modify or contaminate the canonical ThreatForge project model.
- ThreatForge repository verification must remain development governance.
- ThreatForge repository verification must not be represented as a Target Project kind.
- MR-0001 must remain authoritative for governed documentation structure, document semantics and Diátaxis organization.
- MR-0002 must remain authoritative for reusable application interfaces, target-access boundaries and delivery-adapter separation.
- MR-0003 must remain authoritative for Base Analysis Element semantics, provenance, relations and lifecycle.
- Target-specific product requirements must remain inside the governed project model of the owning Target Project.

## Scope

- Includes: One Target Project model for internal and external destinations
- Includes: Explicit destination-root project creation
- Includes: Explicit target-root authoring, verification and analysis
- Includes: Shared governed Target Project template
- Includes: Project-local governed documentation and registries
- Includes: Document-only Target Projects without executable application code
- Includes: Project-local sources for actors, components, data resources, boundaries and flows
- Includes: Base Analysis readiness and documentary provenance
- Includes: Isolation of target records, reports and materializations
- Includes: Minimal Target Project lifecycle orchestration
- Excludes: Import or migration of arbitrary existing repositories
- Excludes: Compatibility-version negotiation or migration mechanisms
- Excludes: Multiple concurrent target sessions
- Excludes: Final web-interface behavior
- Excludes: Product-domain requirements of a specific Target Project
- Excludes: STRIDE, STRIDE-AI or other methodology overlays
- Excludes: Executable application code as a prerequisite for project analysis

## Non-goals

- Model ThreatForge repository verification as a Target Project kind
- Define compatibility versions, gate profiles or migration mechanisms
- Import arbitrary unstructured repositories
- Implement multiple concurrent Target Project sessions
- Define the final web user interface
- Define the product-domain requirements of the first demonstration Target Project
- Require executable application code before documentation-derived Base Analysis
