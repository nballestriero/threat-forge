# ADR-0001 — Canonical Base Analysis Element model and documentary provenance

## Status

Draft

## Context

ThreatForge uses governed documentation as the primary project model, but Macro-requirements, Decisions, Requirements and implementation traces do not by themselves form a methodology-neutral representation of the system to analyze.

Threat analysis requires stable identities for relevant actors, components, data resources, boundaries and data flows. Those identities need explicit documentary provenance so that an analyst can distinguish facts already established by governed sources from reviewed analytical additions introduced to complete the system model.

Without one canonical Base Analysis inventory, documentation, diagrams and methodology-specific analyses could create competing element identities, lose the origin of analytical facts and continue using results after their source knowledge changes.

## Decision

ThreatForge adopts the Base Analysis Element, abbreviated BAE, as the canonical methodology-neutral unit of the Base Analysis inventory.

The minimum canonical BAE types are `Actor`, `Component`, `Data Resource`, `Boundary` and `Data Flow`. Project-specific refinements can classify these elements further, but they do not create competing base identities or replace the minimum type of an existing BAE.

Each BAE has one stable governed identifier, one canonical title, one canonical type, an explicit meaning, a lifecycle state and documentary provenance. The identifier is authoritative. Human-readable labels and editor presentations are resolved from the canonical BAE record rather than maintained as independent identities.

A BAE originates either from existing governed project knowledge or from an explicit reviewed analytical addition. Its origin is a semantic governance relation, not the first textual occurrence of its identifier. Provenance records the governed documents, evidence and reviewed analytical statements that support the BAE.

A governed document can reference a BAE only when the resulting governed model contains a resolvable BAE record whose origin is the same document, an ancestor, or an independent source that already justifies the element. A document cannot reference a BAE whose origin exists only in one of that document's descendants.

The BAE inventory owns methodology-neutral system identity and topology. STRIDE, STRIDE-AI and future overlays consume BAE identities and add classifications, hypotheses, findings, mitigations or derived security requirements without silently adding, removing or redefining canonical BAE records. Discovery of a missing or changed element creates a governed Base Analysis update proposal.

Changes to provenance sources are traceable to affected BAE records and to analyses that depend on them. Staleness indicates that a dependency requires review or re-analysis; it does not silently rewrite the BAE or the dependent analysis.

MR-0003 owns BAE semantics, minimum types, origin, provenance, relations and lifecycle. MR-0001 owns the generic governed Markdown representation used to reference canonical entities. MR-0002 owns authoring and editor assistance that consumes the MR-0001 representation and the MR-0003 BAE model without duplicating either source.

The exact registry schema, controlled lifecycle values, relation vocabulary, Markdown grammar, editor behavior and runtime storage are specified by follow-up Requirements and governed profiles.

## Consequences

- Benefit: Documentation can be transformed into one methodology-neutral and traceable system inventory.
- Benefit: Threat analysis can begin before implementation artifacts exist.
- Benefit: Overlay methodologies can share stable system identities without owning the underlying topology.
- Benefit: Source changes can be traced to potentially stale elements and analyses.
- Cost: Authors and reviewers need to distinguish documentary facts from reviewed analytical additions.
- Cost: BAE provenance and lifecycle require dedicated canonical records and deterministic validation.
- Risk: Overly broad project-specific refinements could recreate competing taxonomies.
- Risk: Incomplete provenance could make an apparently valid analysis difficult to justify.
- Constraint: A BAE reference never establishes the governed origin of an element by textual occurrence alone.
- Constraint: A document cannot depend on a BAE introduced only by one of its descendants.
- Constraint: Methodology overlays preserve canonical BAE identity and propose governed inventory changes instead of mutating it silently.
- Constraint: Editor adapters consume canonical BAE projections and contain no independent BAE rules.

## Non-goals

- Define a concrete BAE registry file format
- Define the complete controlled lifecycle taxonomy
- Define the final vocabulary of BAE relations
- Define the generic Markdown reference grammar
- Define completion, hover, diagnostic or quick-fix behavior
- Create concrete BAE records
- Implement extraction, storage, graph projection or threat-analysis execution
- Treat LLM output as canonical without governed review
