# ADR-0003 — Estrazione documentale e revisione dei candidati BAE

## Status

Draft

## Context

ThreatForge already defines the canonical Base Analysis Element inventory, controlled base types, lifecycle states, documentary provenance, relations, source continuity and reference occurrences. A Target Project can therefore store valid BAE records, but the current model does not define how actors, components, data resources, boundaries and data flows are discovered from governed project documentation. Writing extraction results directly into the canonical inventory would treat heuristic or LLM-assisted interpretation as accepted project knowledge, lose the distinction between source evidence and analytical judgment, and make repeated extraction capable of silently changing stable BAE identities.

## Decision

ThreatForge introduces a governed BAE candidate layer between documentary extraction and the canonical Base Analysis inventory. Extraction reads a validated Target Project corpus through an explicit target root and produces deterministic candidate records that preserve the source document identity, repository-relative source path, evidence occurrence and extraction rationale for every proposed element or relation. A candidate proposes a canonical BAE type, title and meaning but does not own a BAE identifier and does not become authoritative project knowledge. Candidate records have an explicit review lifecycle and remain separate from the canonical BAE inventory. Human review accepts, rejects, merges, splits or defers candidates. Acceptance materializes or updates canonical BAE records only through a governed operation that preserves origin, provenance, stable identity and relation integrity. Rejection preserves the candidate and review evidence so identical unchanged evidence is not repeatedly presented as a new unreviewed proposal. Data Flow candidates propose source endpoint, target endpoint and crossed Boundary candidates or canonical identities when the evidence supports them. Extraction can be rule-based, model-assisted or hybrid, but extraction strategy and confidence are advisory metadata and never replace documentary evidence or governed review. Repeated extraction of unchanged validated sources produces equivalent candidate identities and evidence references without modifying target-authored documentation or the canonical BAE inventory.

## Consequences

- Benefit: Documentary analysis can propose BAE elements before application code exists.
- Benefit: Source evidence remains distinguishable from analytical interpretation and canonical acceptance.
- Benefit: Review decisions remain traceable and reproducible.
- Benefit: Repeated extraction can reuse stable candidates instead of creating uncontrolled duplicates.
- Benefit: Canonical BAE identity and provenance remain protected from automatic inference.
- Benefit: Data Flow endpoints and Boundary crossings can be reviewed before topology materialization.
- Cost: Target Projects require a candidate registry and review records in addition to the canonical BAE inventory.
- Cost: Extraction and acceptance require separate commands and verification surfaces.
- Cost: Merge, split and update decisions require explicit review semantics.
- Risk: Weak evidence selection could produce noisy or misleading candidates.
- Risk: Unstable candidate identity could create duplicate review work.
- Risk: Reviewers could accept incomplete topology without examining related candidates.
- Risk: Extraction strategy metadata could be mistaken for authoritative confidence.
- Constraint: Extraction operates only on a structurally valid Target Project corpus.
- Constraint: Every candidate preserves exact documentary evidence and source identity.
- Constraint: Candidate identifiers remain distinct from canonical BAE identifiers.
- Constraint: Extraction never writes directly to the canonical BAE inventory.
- Constraint: Canonical materialization requires an explicit governed acceptance decision.
- Constraint: Rejected and deferred candidates preserve their review history.
- Constraint: Repeated extraction of unchanged sources remains deterministic and non-destructive.
- Constraint: MR-0003 owns candidate semantics while MR-0004 owns target-root verification and isolation.

## Non-goals

- Select one final extraction algorithm or language model
- Define user-interface behavior for candidate review
- Automatically accept candidates based on confidence
- Require executable source code for documentary extraction
- Define STRIDE or STRIDE-AI classifications
- Implement candidate extraction or canonical materialization in this Decision
