# ADR-0011 — LLM-assisted semantic governance review and deterministic promotion boundary

## Status

Accepted.

## Context

ADR-0009 introduced semantic gate hardening before real child-project execution and Knowledge Graph ingestion. It also identified minimal canonical terminology protection as a needed hardening area.

A purely deterministic terminology guard can become fragile if it tries to maintain broad allow/deny lists, synonym sets or natural-language context rules. Terminology and semantic drift often depend on intent, historical context, nearby governed records and whether a term is being introduced as a new canonical label or merely discussed as legacy context.

Threat-forge needs LLM assistance for this open-ended review class, but an LLM response is non-deterministic and must not become an automatic source of canonical truth or a blocking CI decision.

## Decision

Threat-forge will treat semantic terminology and naming review as an LLM-assisted advisory governance activity before promoting any narrow, stable rule to deterministic enforcement.

LLM reviewers must be guided by governed prompt records. The prompt records define the role, inputs, scope, output contract, confidence handling, evidence requirements and prohibited actions. A reviewer can flag ambiguous terminology, duplicated concepts, likely non-canonical labels, scattered ownership semantics or candidates for deterministic promotion.

LLM findings are advisory. They may guide human review, ADR drafting, requirement refinement, Knowledge Graph curation or future gate design, but they do not mutate files, block `repo:check`, create canonical terminology, or override registries, ADRs, requirements or deterministic gates.

A finding becomes enforceable only after a governed promotion path: human acceptance, canonical ADR/REQ update, explicit scope, deterministic rule, negative fixture and graph traceability.

## Scope

In scope:

- defining the LLM semantic governance reviewer role;
- versioning prompts as governed registry records;
- requiring structured evidence-linked review output;
- distinguishing advisory LLM findings from deterministic blocking gates;
- defining when an LLM finding may be promoted to a deterministic rule.

Out of scope:

- implementing an LLM runner;
- selecting a concrete model provider;
- making LLM output a blocking CI gate;
- automatically editing ADRs, requirements, registries, graph files or runtime contracts;
- building a complete terminology ontology or synonym database;
- replacing deterministic validators for format, ownership, vocabulary or traceability.

## Consequences

### Positive consequences

* Open-ended terminology and semantic-drift review can benefit from LLM context without creating a brittle deterministic word list.
* Future LLM agents can read governed prompts and know their role, inputs, output format and limits.
* Deterministic gates remain low-noise and maintainable because only reviewed, narrow and stable findings are promoted.
* Semantic review reports can support Knowledge Graph curation and future development guidance while preserving human governance authority.

### Negative consequences

* LLM-assisted review is advisory until additional tooling records and report storage exist.
* Findings require human review before they affect canonical records or CI behavior.
* Prompt records must be versioned and maintained as the project model evolves.

## Follow-up

1. Add a governed LLM semantic review prompt registry.
2. Define a report artifact shape for advisory findings.
3. Later implement an optional LLM review runner that emits reports without blocking `repo:check`.
4. Promote only repeated, high-confidence and narrowly scoped findings to deterministic gates through ADR/REQ/fixture/graph changes.
