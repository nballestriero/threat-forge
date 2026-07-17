# MR-0003 — Modello di Analisi Base derivato dalla documentazione

## Intent

Define a methodology-neutral and documentation-derived system model that transforms governed project knowledge into a canonical inventory of Base Analysis Elements for threat analysis before implementation and throughout system evolution.

## Context

MR-0001 establishes governed documentation as the primary project model, while MR-0002 governs document authoring and the path from Requirements to implementation artifacts.

ThreatForge currently lacks an explicit analytical representation derived from governed documentation without replacing its canonical facts. Base Analysis Elements provide stable identities, provenance and relations for reconstructing the system being designed, identifying incomplete knowledge and determining whether prior analyses are stale.

This boundary supports moving threat analysis into the documentation and design phase instead of waiting for implementation artifacts to exist.

## Macro obligation

- ThreatForge must maintain one canonical inventory of Base Analysis Elements for each analyzed project.
- Every Base Analysis Element must have a stable governed identity, canonical type, canonical title, explicit meaning, provenance and lifecycle state.
- Every Base Analysis Element must be justified by existing governed project knowledge or by an explicit reviewed analytical addition.
- The governed origin of a Base Analysis Element must exist before any document that references that element.
- A document must not reference a Base Analysis Element whose governed origin belongs to one of that document's descendants.
- Base Analysis Element provenance must identify the governed documents and evidence from which the element is derived.
- The Base Analysis model must preserve explicit relations among elements and between elements, Decisions, Requirements and other governed project records.
- The Base Analysis inventory must remain methodology-neutral.
- The Base Analysis inventory must not contain STRIDE, STRIDE-AI or other overlay-specific classifications as base facts.
- Threat-analysis overlays must consume the canonical Base Analysis inventory without silently adding, removing or redefining its elements.
- Missing or changed system knowledge discovered by an overlay must produce a governed proposal to update the Base Analysis inventory.
- Changes to governed source documentation must support deterministic identification of Base Analysis Elements and analyses that are potentially stale.
- The Base Analysis model must support analysis before implementation and re-analysis after architectural, requirement or feature changes.
- MR-0003 must own Base Analysis Element semantics, provenance, relations and lifecycle without owning the generic Markdown reference syntax governed by MR-0001.
- MR-0003 must expose canonical Base Analysis projections that MR-0002 authoring tools and editor adapters can consume without duplicating domain rules.

## Scope

- Includes: Methodology-neutral Base Analysis model
- Includes: Canonical Base Analysis Element inventory
- Includes: Stable Base Analysis Element identities and canonical types
- Includes: Documentary provenance and governed origin
- Includes: Relations among Base Analysis Elements and governed project records
- Includes: Base Analysis Element lifecycle and staleness
- Includes: Derivation from Macro-requirements, Decisions, Requirements and other governed project documentation
- Includes: Reviewed analytical additions when governed documentation is incomplete
- Includes: Canonical system topology and data-flow projections for later threat-analysis overlays
- Includes: Traceability from source documentation to Base Analysis Elements and dependent analyses
- Excludes: Generic Markdown syntax for governed entity references
- Excludes: Editor-owned completion, hover, diagnostics or quick-fix rules
- Excludes: STRIDE and STRIDE-AI classifications
- Excludes: Methodology-specific threats, findings, mitigations or security requirements
- Excludes: Runtime Base Analysis implementation and user-interface behavior
- Excludes: Automatic canonical acceptance of LLM-inferred elements
- Excludes: Replacement of Macro-requirement, Decision or Requirement registries

## Non-goals

- Freeze the complete Base Analysis Element taxonomy in the Macro-requirement
- Select the physical registry or database schema
- Implement extraction, validation, graph or editor tooling
- Treat the first textual occurrence of an element as its governed origin
- Make an LLM inference canonical without explicit governed review
- Duplicate project facts that already have an authoritative governed source
