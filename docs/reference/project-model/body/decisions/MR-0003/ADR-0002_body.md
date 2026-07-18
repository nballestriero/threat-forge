# ADR-0002 — Historical BAE origin and authoritative source continuity

## Status

Draft

## Context

Base Analysis Element records currently preserve one governed origin and documentary provenance. When a governed source becomes superseded, deprecated or removed, the historical source that introduced the BAE and the source that currently maintains it represent two distinct facts. Replacing the original source loses historical traceability, while retaining only the original source leaves current authority unresolved. Documentary provenance and textual reference occurrences also represent distinct relations.

## Decision

ThreatForge models BAE source continuity through three separate structures. Origin identifies the immutable historical source that introduced and justified the element. Authoritative source identifies the governed source currently maintaining the element. Source history records the ordered append-only sequence of authority transitions, beginning with the historical origin and ending with the current authoritative source. A governed review records continuity confirmation, authority transfer, BAE supersession or BAE deprecation as the outcome of a source lifecycle change. Provenance records semantic origin and supporting evidence. Reference occurrences form a separate deterministic derived projection of BAE usage across governed documents. An active BAE associated with a non-active authoritative source and no recorded lifecycle outcome represents an inconsistent governed state. Validation and staleness reporting expose such inconsistencies without changing canonical BAE records.

## Consequences

- Benefit: Historical BAE origin remains inspectable after document lifecycle transitions.
- Benefit: Current source authority resolves independently from historical origin.
- Benefit: Provenance remains distinct from derived textual reference occurrences.
- Benefit: Source continuity and BAE lifecycle transitions remain auditable.
- Constraint: Historical origin is immutable.
- Constraint: Source history is append-only, ordered, continuous and acyclic.
- Constraint: Authority transitions originate from an explicit governed review.
- Constraint: Each active BAE resolves one current authoritative governed source.
- Constraint: Validators report inconsistencies without modifying canonical records.

## Non-goals

- Infer authority transfer from textual occurrence order
- Replace provenance with reference occurrences
- Rewrite BAE records automatically after a source lifecycle change
- Define editor rendering or runtime database storage
- Define methodology-overlay lifecycle behavior
