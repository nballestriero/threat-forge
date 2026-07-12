# ADR-0005 — Canonical project model identity and ID namespace rules

## Status

Accepted.

## Context

The project model contains macro requirements, ADRs, requirements, graph nodes, tools, and future generated views.

Some identifiers are globally unique by construction, while others are intentionally scoped by the owning macro requirement. In particular, ADR short identifiers such as `ADR-0001` can appear in more than one macro-requirement decision registry.

If tools, graph traversals, generated views, or LLM handoffs treat short ADR identifiers as globally unique, then cross-area references can become ambiguous.

The project therefore needs explicit namespace rules for canonical identity and display identity.

## Decision

Project model entities must use deterministic canonical identities.

Macro requirement identifiers are globally unique:

```text
MR-0000
MR-0001
```

Requirement identifiers are globally unique because the owning macro requirement is encoded into the requirement id:

```text
MR-0001REQ-0005
```

ADR short identifiers are unique only within their owning `macro_requirement_id` scope. The canonical ADR identity is the pair:

```text
macro_requirement_id + adr_id
```

The canonical display form for cross-area references is:

```text
MR-0001/ADR-0004
```

A graph file may use local ADR node ids such as `ADR-0004` when the graph itself is scoped to one macro requirement and contains `macro_requirement_id`. Cross-area tools, reports, generated views, RTM outputs, LLM guide material, and handoff summaries must qualify ADR references with the macro requirement scope when ambiguity is possible.

Validators and renderers must not use a bare ADR id as a global key. They must resolve ADR identity through macro-requirement scope, registry path, graph scope, or an explicit canonical id.

## Scope

In scope:

- canonical identity rules for macro requirements, ADRs, and requirements;
- distinction between short display ids and canonical scoped identities;
- graph, view, validator, and LLM navigation behavior when resolving ADR references.

Out of scope:

- renaming existing ADR records;
- replacing all local graph node ids with globally qualified ids in this step;
- implementing an identity validator in this step.

## Consequences

### Positive consequences

* Existing ADR short id reuse across macro requirements remains valid.
* Cross-area traversal can become deterministic.
* Generated views and RTM outputs can avoid ambiguous ADR references.
* LLM handoff material can refer to decisions precisely.

### Negative consequences

* Tools must carry macro-requirement context when resolving ADR references.
* Some displays may need both a short label and a canonical identity.
* Future validators must distinguish local graph ids from canonical cross-area ids.

## Follow-up

1. Derive requirements for canonical project-model identity resolution.
2. Ensure existing validators keep enforcing macro-requirement-scoped ADR identity.
3. When cross-area graph views are introduced, require qualified ADR references in generated outputs.
