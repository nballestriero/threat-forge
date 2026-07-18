# ADR-0002 — Historical BAE origin and authoritative source continuity

## Status

Draft

## Context

Base Analysis Element records preserve one governed origin and documentary provenance. When a governed source becomes superseded, deprecated or removed, the historical source that introduced the BAE and the source that currently maintains it represent two distinct facts. Replacing the original source loses historical traceability, while retaining only the original source leaves current authority unresolved. Documentary provenance and textual reference occurrences also represent distinct relations. BAE creation occurs manually in the canonical registry before documentary use, while the locations of later canonical citations are mechanically derivable facts.

## Decision

ThreatForge models BAE source continuity through separate authored and derived structures. Origin identifies the immutable historical source that introduced and justified the element. Authoritative source identifies the governed source currently maintaining the element. Source history records the ordered append-only sequence of authority transitions, beginning with the historical origin and ending with the current authoritative source. A governed review records continuity confirmation, authority transfer, BAE supersession or BAE deprecation as the outcome of a source lifecycle change. Provenance records semantic origin and supporting evidence.

BAE identity, title, type, meaning, lifecycle state, origin, authoritative source, source history and provenance remain manually governed fields. Only BAE records already present in the canonical registry are eligible for citation from governed Markdown bodies. Governed bodies introduce and reuse registered BAE records through the ordinary canonical reference syntax in profile-declared reference positions; no special visible origin syntax is required. The document declared as historical origin contains one eligible introductory canonical citation, and that citation is also an ordinary reference occurrence.

Reference occurrences are a deterministic managed projection stored with each BAE record. A registered repository materializer scans governed bodies and replaces only the managed reference_occurrences fields before the blocking checks. The validator independently recalculates the projection and fails when the stored projection is missing, stale, noncanonical or references an unregistered BAE. Repeated materialization of unchanged sources is byte-stable.

## Consequences

- Benefit: Historical BAE origin remains inspectable after document lifecycle transitions.
- Benefit: Current source authority resolves independently from historical origin.
- Benefit: Documentation introduces BAE concepts naturally through ordinary canonical citations.
- Benefit: Provenance remains distinct from derived textual reference occurrences.
- Benefit: Reference occurrence indexes remain current without manual duplication.
- Benefit: Source continuity and BAE lifecycle transitions remain auditable.
- Constraint: Manual registration precedes documentary citation of a BAE.
- Constraint: Historical origin is immutable.
- Constraint: Source history is append-only, ordered, continuous and acyclic.
- Constraint: Authority transitions originate from an explicit governed review.
- Constraint: Each active BAE resolves one current authoritative governed source.
- Constraint: Materializer write authority is limited to reference_occurrences.
- Constraint: Validators remain side-effect-free.
- Constraint: The governed runner materializes occurrences before executing the repository gate.

## Non-goals

- Create a BAE automatically from prose or from an unknown citation
- Infer historical origin from textual occurrence order
- Infer authority transfer from textual occurrence order
- Replace provenance with reference occurrences
- Modify authored BAE semantic fields during materialization
- Rewrite source history automatically after a source lifecycle change
- Define editor rendering or runtime database storage
- Define methodology-overlay lifecycle behavior
