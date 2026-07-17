# ADR-0008 — Canonical governed entity references in Markdown bodies

## Status

Draft

## Context

Governed Markdown bodies currently represent document identity in their headers and controlled values in profile-defined sections, but they lack one canonical representation for references to other governed entities.

Base Analysis Elements introduce the first immediate use case. The same problem also applies to future threats, findings, mitigations, snapshots and other canonical records. Free-form alternatives such as bare identifiers, parenthesized tokens, Markdown links or independently authored labels create ambiguous parsing and allow readable titles to diverge from their authoritative records.

A reference also has different semantics from an origin relation. Text containing an identifier does not establish when or why the referenced entity came into existence.

## Decision

ThreatForge adopts one canonical governed entity reference payload:

`[<canonical-id>] <canonical-title>`

The canonical identifier is authoritative. The canonical title is a required human-readable mirror resolved from the entity's authoritative governed source. Exactly one ASCII space separates the closing bracket from the title, and the payload contains no surrounding whitespace.

The containing body profile defines the reference-bearing position and any Markdown container outside the payload. A list marker, section heading or other profile-owned structure is not part of the reference payload. Identical text outside a declared reference-bearing position remains ordinary Markdown prose.

Each referenceable governed entity type is associated with one registered canonical resolver. The resolver identifies the authoritative source, canonical title, entity type and semantic eligibility rules for the current document and reference position.

A canonical reference resolves to exactly one existing entity of an allowed type. Unknown identifiers, ambiguous identifiers, disallowed entity types, divergent titles and failed eligibility rules are invalid reference states.

Alternative forms such as `(@BAE-0001) Title`, a bare `BAE-0001`, or `[BAE-0001](target)` are not canonical governed entity references and receive no compatibility alias.

A textual reference does not create, originate or justify the referenced entity. Origin, provenance, lifecycle and reference eligibility remain owned by the entity's governing model. For BAE records, MR-0003 defines those semantics, including the prohibition against references to an element introduced only by a descendant document.

MR-0001 owns the shared reference representation and generic resolution contract. Entity-owning Macro-requirements own entity semantics and eligibility. MR-0002 authoring and editor adapters consume both sources without duplicating either rule set.

The exact grammar contract, profile declarations, resolver registration, diagnostics and verification behavior are specified by follow-up Requirements.

## Consequences

- Benefit: Humans, deterministic tools and LLMs receive one readable and machine-resolvable reference form.
- Benefit: Future governed entity types reuse the same representation without BAE-specific syntax duplication.
- Benefit: Canonical titles remain visible while identifiers preserve stable identity.
- Cost: Reference-bearing body profiles require explicit position and container declarations.
- Cost: Every referenceable entity type requires an authoritative resolver and source projection.
- Risk: Treating identifier-like prose as a governed reference could create false diagnostics.
- Risk: Stale title mirrors could mislead readers until corrected.
- Constraint: Only profile-declared reference-bearing positions receive governed reference semantics.
- Constraint: The identifier remains authoritative and the title remains a derived mirror.
- Constraint: Reference resolution remains side-effect-free.
- Constraint: Compatibility aliases do not expand the canonical grammar.

## Non-goals

- Define BAE origin, provenance, topology or lifecycle semantics
- Define editor completion ranking or user-interface presentation
- Convert every identifier occurrence in existing prose into a governed reference
- Define external URL or citation syntax
- Create concrete BAE, threat, finding or mitigation records
- Introduce compatibility aliases for alternative reference forms
