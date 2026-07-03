# Next topics draft

This file is a temporary brainstorming note.

It is not a macro-requirement, not a decision, not a requirement, not a registry, and not a canonical source.
It can be edited or deleted after the documentation model direction is stabilized.

## Current seed

The current seed contains the first documentation-management model draft:

- `MR-0001` — Gestione documentale governata.
- `ADR-0001` — Uso di Diátaxis per classificare la documentazione.
- One how-to draft for writing governed documentation.
- `ADR-0002` — Vocabolario controllato della documentazione governata.
- A first minimal controlled vocabulary registry for documentation terms.

## Topics to discuss next

### Notes after ADR-0001 revision

Confirmed direction:

- Do not use temporary workspace names inside governed document bodies.
- ADR-0001 decides only the Diátaxis classification.
- ADR-0001 does not decide the canonical source of a document Diátaxis category.
- The canonical source for controlled values must be unique.
- Body prose, generated indexes and readable views must not become competing sources of controlled values.
- The first functional requirement for Diátaxis remains brainstorming until the canonical source of the Diátaxis category is decided.

Candidate follow-up:

- ADR-0002 should decide whether the Diátaxis category is derived from the canonical documentation path.
- ADR-0003 should decide mandatory and controlled document fields.
- A first functional requirement can then state the obligation in a way that does not create two competing sources.


### ADR-0002 — Vocabolario controllato della documentazione governata

Current direction:

- The documentation model needs a minimal controlled vocabulary before the first canonical requirement and before any corpus-quality tool.
- The controlled vocabulary is a registry, not a free glossary.
- It defines canonical names, allowed labels, forbidden aliases and usage notes for central documentation terms.
- It does not yet define corpus quality metrics, asset registry, or term extraction algorithms.

Next questions:

- Which labels are allowed only for human-readable Italian prose and which labels are canonical for deterministic checks?
- Should forbidden labels become blocking errors immediately or report-only findings first?
- Should the vocabulary distinguish canonical machine names from rendered human labels?

### Future ADR — Metriche deterministiche di qualità del corpus documentale

Current direction:

- Use known algorithms and established practices where possible; do not invent opaque personal scoring.
- Start with a non-blocking report, not a gate.
- Measure canonical term usage, forbidden aliases, candidate domain terms, unregistered asset-like terms and vocabulary drift.
- Do not penalize common language words outside the vocabulary.
- Produce readable reports and later charts for humans and LLM-assisted review.

Candidate first report outputs:

- canonical term counts;
- forbidden alias counts;
- frequent candidate domain terms not in vocabulary;
- asset references and unresolved asset-like terms;
- top recurring words or n-grams by document and by macro-requirement.

### Future ADR — Asset registry della documentazione governata

Current direction:

- Documentation sources, registries, controlled vocabularies and generated documentation are assets.
- Do not make every individual file a separate asset by default.
- Start with asset classes such as governed documentation set, registry, Markdown body, controlled vocabulary registry and generated readable documentation.
- Individual documents can be referenced through document registries or body paths unless they require asset-specific threat analysis.

### ADR-0002 — Organizzazione dei documenti per macrorequisito e tipo documentale

Questions:

- Should how-to, tutorial, reference and explanation documents be grouped by `MR-XXXX` path?
- Should a how-to linked to `MR-0001` live under `docs/how-to/MR-0001/`?
- Should the path convention be checked against a metadata field such as `macro_requirement_id`?
- How do we generate the MR-first readable book without maintaining manual indexes?

Candidate direction:

- Path convention helps humans.
- Metadata or registry binding helps deterministic checks.
- Generated indexes must not be maintained manually.

### ADR-0003 — Campi obbligatori e campi controllati

Questions:

- Which fields are mandatory for every governed document?
- Which fields are controlled by vocabularies, taxonomies or registries?
- How do we distinguish document type, lifecycle status, authority level, canonical source and derived output?

Candidate minimum fields to evaluate:

- `id`
- `title`
- `document_type`
- `macro_requirement_id`, where applicable
- `lifecycle_status`
- `governance_authority`
- `canonical_source`
- `derived_from`, where applicable

### ADR-0004 — Vocabolari controllati e tassonomie

Questions:

- Do we use a SKOS-like model for canonical terms, alternative labels, hidden labels and concept relations?
- Do we need an owner registry for controlled fields and vocabularies?
- How do we prevent free synonyms from entering normative documentation?
- Which terms are canonical, aliases, forbidden aliases or explanatory labels?

Candidate direction:

- Use SKOS-like semantics.
- Do not adopt RDF, SKOS, SHACL or OWL as mandatory technical formats at the beginning.

### Ciclo di vita documentale

Questions:

- Which lifecycle states are needed immediately?
- How do we deprecate, retire and eventually remove documents without breaking history, links or auditability?
- Do removed documents need tombstone records?
- Which removal mechanism is human-facing retirement and which part is deterministic garbage collection?

### Documentazione derivata e libro generato

Questions:

- Should the generated document be MR-first?
- For each MR chapter, should ADRs and derived requirements be presented immediately under that MR?
- Should each MR chapter have a local generated index?
- Should metadata tables be generated as appendices instead of appearing at the beginning of the chapter?
- Which outputs should exist: PDF, HTML, generated LaTeX, generated indexes, coverage reports?

Candidate direction:

- MR is the main theme and book chapter.
- ADRs are local decisions inside the MR theme.
- Requirements are shown close to the ADR from which they derive.
- Metadata belongs in generated appendices or views, not in the main reading flow.

### Asset governance and threat-analysis readiness

Questions:

- When does a candidate asset become a registered asset?
- How are assets referenced from ADR, requirements and how-to/reference documents?
- Should the asset mention index be generated instead of maintained manually?
- How do asset references prepare future threat analysis?

Candidate direction:

- Asset registry defines assets once.
- Documents reference assets with ID or canonical name.
- Mention indexes are generated or deterministically validated.

### Functional and specialized requirements

Questions:

- How do functional requirements derive from ADRs?
- How do security, privacy, audit and compliance requirements attach to functional requirements?
- Which relation name should be used for specialized requirements linked to functional requirements?

Candidate direction:

- Every specialized requirement must be linked to at least one functional requirement.
- Specialized requirements should also declare affected assets when relevant.

### How-to governance

Questions:

- How do we ensure how-to documents are operational guidance and not hidden normative sources?
- Should each how-to declare the MR it supports?
- Should how-to documents include procedure, checklist, anti-patterns and references to normative sources?

Candidate direction:

- How-to applies MR/ADR/REQ/reference.
- How-to must not introduce unique normative rules that are absent from governed sources.

### Application and repository layout

Questions:

- Where do backend, frontend, tools, contracts, registries and taxonomies live?
- Is this part of `MR-0001`, or should it belong to a separate macro-requirement about application/project structure?

Candidate direction:

- Documentation layout belongs to `MR-0001`.
- Backend/frontend/tools layout should probably be decided in a separate MR/ADR.

### Child project boundary

Questions:

- How do child projects expose documentation for audit and conformance validation?
- Which parts are required for documentation-first governance?
- How do we avoid treating child projects as runtime-coupled systems?

Candidate direction:

- Child projects are autonomous repositories.
- threat-forge audits conformance and documentation quality.
- threat-forge does not generate runtime contracts for child projects.

## Anti-patterns to avoid

- One ADR covering too many unrelated decisions.
- Manual indexes that duplicate derivable information.
- Free synonyms in normative documentation.
- How-to documents becoming hidden normative sources.
- Metadata tables interrupting human reading flow.
- Adding registries, graphs and gates before the underlying concept is stable.
- Designing backend/frontend/tool layout inside the Diátaxis ADR.
