# ADR-0004 — Standard governance for ADR records and ADR body format

## Status

Accepted.

## Context

The project model uses ADR records to capture functional and structural decisions that justify requirements, tools, and verification behavior.

ADR metadata is stored in compact decision registry records, while the long decision narrative is stored in separate Markdown body files.

If ADR registry fields remain free text, then lifecycle status, decision type, identifiers, macro-requirement ownership, and body paths can diverge without a deterministic signal.

If ADR body files remain unconstrained, then decisions may become difficult to compare, render, validate, and trace back to requirements.

The project therefore needs one general ADR governance registry that defines the controlled field vocabulary and body section contract for all functional ADRs.

## Decision

All functional ADRs in the project model must follow a standard governed format.

The standard is split into two controlled areas:

1. ADR registry fields;
2. ADR Markdown body format.

ADR registry fields are not all free text. Fields representing identifiers, lifecycle states, decision types, ownership, references, and paths must be constrained by controlled values, deterministic patterns, or existing project model records.

The controlled ADR registry field rules and body section rules must be defined in one general ADR governance registry:

```text
docs/reference/project-model/registers/decisions/adr-governance.registry.yml
```

The ADR governance registry is a register, not a taxonomy file. It defines the required ADR metadata fields, controlled lifecycle values, controlled decision types, reference rules, path rules, and required Markdown body sections for ADR documents.

Two independent validators must be introduced after this decision and after their requirements exist:

1. one validator for ADR registry field governance;
2. one validator for ADR body format governance.

The validators must not be introduced before their requirements and graph relations exist.

## Scope

This decision applies to functional ADRs registered in project model decision registries, including:

```text
docs/reference/project-model/registers/decisions/*.yml
docs/reference/project-model/body/decisions/**/*.md
```

This decision does not require the validator tools to be implemented in the same step.

This decision does not make every future ADR body identical in content; it standardizes the required structure and the controlled metadata needed for deterministic governance.

## Consequences

### Positive consequences

* ADR lifecycle states become controlled values instead of free text.
* ADR decision types become controlled values instead of free text.
* ADR identifiers can be checked for uniqueness and deterministic format.
* ADR macro-requirement ownership can be checked against existing macro requirements.
* ADR body files can be checked for required headings and stable ordering.
* Rendering and graph traceability can rely on a predictable ADR structure.

### Negative consequences

* Adding an ADR requires more structured metadata.
* Existing ADR records may need small alignment edits as the validators become stricter.
* The project must maintain the ADR governance registry as a controlled source of truth.

## Follow-up

Create two requirements derived from this ADR:

1. one requirement for ADR registry field validation;
2. one requirement for ADR body format validation.

After the requirements and graph relations exist, introduce the ADR governance registry and then implement the dedicated validators in separate requirement-backed tool steps.
