# ADR-0006 — Canonical ADR and Requirement document format governance

## Status

Accepted.

## Context

ADR records already have a governance registry that defines controlled ADR metadata and required ADR body sections.

Requirements also need stable records and Markdown bodies so that humans, tools, generated pages, LLM handoffs, graph views, and future RTM reports can rely on deterministic structure.

Format governance and identity governance are related but separate concerns. Identity rules decide whether a record can be referenced unambiguously. Format rules decide whether the record and body can be parsed, rendered, validated, and traversed consistently.

If ADRs and requirements remain structurally inconsistent, then deterministic graph traversal and generated reports will become fragile.

## Decision

ADR and Requirement documents must follow canonical governed formats.

ADR governance remains split into:

1. ADR registry field governance;
2. ADR Markdown body format governance.

Requirement governance must follow the same principle:

1. Requirement registry field governance;
2. Requirement Markdown body format governance.

Each governed record must have a compact registry entry and a separate Markdown body file. The registry entry carries deterministic metadata and the body file carries the readable explanation.

Canonical format validation must check at least:

- required registry fields;
- controlled field values;
- valid identifiers;
- valid `body_path` values;
- body file existence;
- H1 consistency with the governed id and title;
- required Markdown sections;
- governed section order;
- absence of orphan body files;
- absence of records without body files.

ADR and Requirement validators must remain specialized. The future MR-0000 runner may orchestrate them, but must not duplicate their format logic.

## Scope

In scope:

- declaring stable format governance for ADR and Requirement records and bodies;
- declaring that ADR and Requirement format validation are separate from identity rules and graph traversal;
- preparing future requirements for Requirement registry and body validators.

Out of scope:

- implementing ADR body validation in this step;
- implementing Requirement registry or body validation in this step;
- changing existing Requirement record fields in this step;
- introducing a mega-runner in this step.

## Consequences

### Positive consequences

* ADR and Requirement documents can be parsed and rendered consistently.
* Future LLM guidance can rely on predictable sections.
* Future RTM and graph views can consume stable records.
* Format errors can be detected before they corrupt graph traversal or generated artifacts.

### Negative consequences

* New documents require stricter structure.
* Existing documents may need alignment before stricter validators are enabled.
* Several focused validators will be needed before the future runner can provide full state coverage.

## Follow-up

1. Derive requirements for Requirement registry field validation and Requirement body format validation.
2. Implement ADR body format validation against the existing ADR body requirement.
3. Define a Requirement governance registry before implementing Requirement format validators.
4. Link validators to requirements and verification relations in the graph before introducing code.
