# MR-0004 — Ciclo di vita governato dei progetti target

## Intent

Define how ThreatForge creates, identifies, versions, validates, migrates and maintains governed target projects across self-analysis, internal demonstrations and external child repositories.

## Context

ThreatForge applies the same governed documentation and analysis principles to itself and to other projects. The target-project model combines a canonical Diátaxis structure, generated project-model registries and explicit compatibility coordinates so that project validity remains reproducible across supported engine versions.

## Macro obligation

- ThreatForge must treat self-analysis, internal demonstrations and external child repositories as target kinds governed by one lifecycle model.
- Every target project must have a stable governed identity and an explicit target kind.
- Every target project must conform to the canonical governed documentation structure defined by MR-0001.
- Every target project must organize tutorials, how-to guides, reference material and explanations according to Diátaxis.
- Required project folders, valid empty registries and initial governed documents must be generated deterministically.
- Internal demonstrations and external child repositories must derive their initial structure from the same governed template source.
- Each target project must keep its registries, counts, reports, materializations and generated artifacts isolated from every other target.
- Every target project must declare the compatibility coordinates required to select its project contract and gate profile.
- A target generated for one contract version must remain verifiable by an engine version declared compatible with that contract.
- A newer engine must not silently reinterpret an older target through the latest schemas or gate rules.
- Breaking project-contract or gate-profile changes must introduce an explicit version transition and a governed migration path.
- Governed migrations must be deterministic, previewable and non-destructive toward authored project semantics.
- An unsupported target contract must fail with an explicit compatibility diagnostic before secondary model validation.
- ThreatForge self-analysis must use the same target-project contract exposed to internal demonstrations and external child repositories.
- MR-0004 must own target identity, generation, compatibility and lifecycle without duplicating the documentation rules of MR-0001.
- MR-0004 must consume reusable target-access and execution interfaces governed by MR-0002.
- MR-0004 must expose target projects to the Base Analysis capabilities governed by MR-0003.

## Scope

- Includes: Governed target-project identity and target kinds
- Includes: Canonical generated project structure
- Includes: Diátaxis documentation skeleton
- Includes: Valid initial registries and governed document templates
- Includes: Internal demonstration projects
- Includes: External child repositories
- Includes: Versioned project contracts and gate profiles
- Includes: Compatibility resolution and governed migrations
- Includes: Isolation and equivalence verification across target locations
- Includes: ThreatForge self-analysis as a target project
- Excludes: Product-domain requirements of a specific demonstration project
- Excludes: Duplication of the ThreatForge engine inside every target project
- Excludes: Threat-analysis methodology overlays
- Excludes: Automatic migration of authored semantic decisions
- Excludes: Immediate support for arbitrary unstructured legacy repositories

## Non-goals

- Make every target depend on the latest ThreatForge engine
- Merge target-project records into the canonical ThreatForge project model
- Maintain separate hand-authored templates for internal and external targets
- Copy checker implementations into generated projects
- Define the functional requirements of the first demonstration application
