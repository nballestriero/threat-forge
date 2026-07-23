# ADR-0004 — Semantic boundary between Base Analysis and methodological interpretations

## Status

Draft

## Context

ThreatForge already defines canonical Base Analysis Elements, documentary
provenance, lifecycle, relations and reviewed candidate extraction. The
common analysis model and future STRIDE, STRIDE-AI and other overlays need
to consume the same documented system without introducing their own
classifications into the canonical Base Analysis. At the same time,
analytical work can reveal missing actors, components, data resources,
boundaries, flows or relations that improve the project documentation.
Without an explicit semantic boundary, method-specific interpretations
could become indistinguishable from system facts, while useful discoveries
made during analysis could remain disconnected from governed documentary
evolution.

## Decision

ThreatForge treats the Base Analysis as the canonical
methodology-neutral description of the analyzed system. Information belongs
to the Base Analysis when its meaning remains valid independently of the
analysis method and is supported by governed documentary evidence or a
reviewed analytical addition. Domain-specific terminology, including AI and
machine-learning terminology, remains eligible when it describes a factual
actor, component, data resource, boundary, data flow or neutral relation.
Method-controlled classifications, threat categories, affected security
properties, failure modes, attack classes, risk judgments, applicability
results and other expert interpretations remain outside the canonical BAE
inventory. Analysis overlays consume Base Analysis Elements, their
relations and governed functional requirements without directly changing
them. When an overlay exposes missing or inaccurate system knowledge, it
records a documentation gap or Base Analysis change proposal identifying
the affected sources, elements and supporting evidence. Promotion into
governed documentation or the canonical BAE inventory occurs through
MR-0003 review and preserves identity, provenance, lifecycle and relation
integrity. Functional requirements remain governed documents referenced by
the analysis and are not reclassified as Base Analysis Elements.

## Consequences

- Benefit: Multiple analysis methods can reuse one stable description of the system.
- Benefit: Domain-specific architecture can be represented without embedding one methodological taxonomy.
- Benefit: Analytical discoveries can improve governed documentation through an explicit feedback path.
- Benefit: Findings can remain traceable to stable Base Analysis Elements and governed functional requirements.
- Cost: Reviewers need to distinguish factual system knowledge from methodological interpretation.
- Cost: Documentation gaps and Base Analysis change proposals require review before canonical promotion.
- Risk: An overly narrow interpretation of methodology neutrality could exclude useful system facts.
- Risk: Familiar methodological terms could be mistaken for factual architectural classifications.
- Risk: Different overlays could produce overlapping change proposals for the same documentary gap.
- Constraint: Overlay records do not directly alter governed documentation or the canonical BAE inventory.
- Constraint: Every Base Analysis change proposal preserves supporting evidence and affected source references.
- Constraint: Accepted additions follow the existing MR-0003 identity provenance lifecycle and relation rules.
- Constraint: Method-specific payloads remain outside BAE records even when they reference the same system elements.

## Non-goals

- Define the common finding lifecycle
- Define the STRIDE taxonomy or analysis procedure
- Define the STRIDE-AI taxonomy or analysis procedure
- Extend the current BAE base types or relation predicates
- Implement overlay or Base Analysis change-proposal tooling
