# ADR-0009 — Atomic functional and linked specialized requirement model

## Status

Accepted.

## Context

The project derives requirements from ADRs before introducing graph relations, tools, validators, generated reports, or code changes.

If one ADR produces a few large requirements, the requirements become difficult to verify deterministically, difficult to link to source code, and difficult to display in generated RTM or GraphRAG-style views.

The project also needs requirements beyond functional behavior. Security, performance, governance, traceability, quality, operability, usability, compatibility, and similar concerns must be represented as first-class governed requirements when they constrain or harden a functional capability.

Those specialized requirements must not become a separate unanchored registry of generic quality statements. They must be linked to the functional requirement they constrain, harden, measure, or verify.

## Decision

ADRs must derive small, atomic, verifiable requirements.

The primary requirement type is `functional`. A functional requirement describes a capability, behavior, workflow, validation behavior, generated artifact, or user-visible outcome that the system must provide.

Specialized non-functional or control requirements are first-class requirements with their own registry headers and Markdown body files. They are not inline notes inside the functional requirement body.

Specialized requirements must be children of a functional requirement. Each specialized requirement must declare a parent functional requirement through a controlled parent reference in its registry header.

The functional parent must not maintain a manually duplicated list of children. The child-to-parent reference is the canonical direction. Tools, generated pages, graph views, RTM reports, and LLM guidance may derive the inverse parent-to-children view automatically.

Specialized requirement identifiers must derive from the functional parent identifier using a controlled suffix family. Examples:

```text
MR-0001REQ-0006SEC-0001
MR-0001REQ-0006PERF-0001
MR-0001REQ-0006GOV-0001
MR-0001REQ-0006TRC-0001
MR-0001REQ-0006QLT-0001
```

The initial specialized suffix families are:

```text
SEC   security
PERF  performance
GOV   governance
TRC   traceability
QLT   quality
OPS   operability
UX    usability
COMP  compatibility
```

The Requirement registry for each macro requirement remains the canonical registry for all requirements owned by that macro requirement, both functional and specialized. No separate registry per non-functional category is introduced.

A future Requirement registry validator must check at least:

- requirement id format;
- requirement type;
- body path existence;
- functional requirement id pattern;
- specialized requirement id pattern;
- specialized requirement parent reference;
- specialized parent existence;
- specialized parent type is `functional`;
- no duplicate requirement ids;
- no orphan requirement body files;
- no manually duplicated child lists as canonical sources.

A future Requirement body validator must check that functional and specialized requirements each have a governed Markdown body format.

## Scope

In scope:

- deciding the distinction between functional and specialized requirements;
- deciding that specialized requirements are first-class governed requirements;
- deciding that specialized requirements have their own headers and body files;
- deciding that specialized requirements are stored in the same macro-requirement registry as their functional parent;
- deciding that child-to-parent references are canonical and parent child lists are derived;
- preparing future requirements for deterministic requirement registry and body validation.

Out of scope:

- rewriting existing requirement records in this step;
- introducing specialized requirements in this step;
- implementing the requirement registry validator in this step;
- implementing the requirement body validator in this step;
- adding new graph predicates for parent-child requirement relations in this step.

## Consequences

### Positive consequences

* Requirements can stay small and directly verifiable.
* Non-functional and control concerns become traceable without becoming detached generic statements.
* Requirement hierarchy can be rendered and queried without duplicating parent-child state.
* RTM and GraphRAG-style views can group specialized requirements under the functional capability they constrain.
* Future source-code traceability can point to the exact functional or specialized requirement being implemented or verified.

### Negative consequences

* Requirement registries need stricter validation before specialized requirements can be safely added.
* Requirement ids become longer for specialized children.
* Generated views must derive parent-to-children groupings rather than reading them directly from parent records.
* Existing requirement records may need a controlled `type` field and body alignment before full enforcement.

## Follow-up

1. Derive requirements for functional requirement registry validation.
2. Derive requirements for specialized child requirement registry validation.
3. Derive requirements for functional and specialized requirement body validation.
4. Decide or register any graph predicate needed to represent child-to-parent requirement specialization after the requirement model is in place.
5. Implement validators only after their requirements and graph relations exist.
