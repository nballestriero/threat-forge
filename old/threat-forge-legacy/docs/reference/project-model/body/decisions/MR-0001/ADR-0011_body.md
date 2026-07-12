# ADR-0011 — Diátaxis Placement for Governed Development Guides

## Status

Accepted.

## Context

MR-0001 owns the project method and documentation-management model. ADR-0001 already adopted Diátaxis for the project documentation tree, separating tutorials, how-to guides, reference material, and explanations.

The project now needs operational guidance for programmers and LLM-assisted work. These documents are not ADRs, requirements, registries, schema contracts, or graph records. They are instructions for performing governed work correctly.

If these guides are embedded inside ADR bodies or Requirement bodies, the project would mix decision records, verifiable contracts, and operational how-to content. That would weaken the Diátaxis separation and make future documentation controls harder to reason about.

## Decision

Governed development guides must be placed in the Diátaxis how-to space under `docs/how-to/`.

The initial governed-development guide area is:

```text
docs/how-to/governed-development/
```

The programmer guide must be created at:

```text
docs/how-to/governed-development/programmer-governed-development-guide.md
```

The LLM guide must be created at:

```text
docs/how-to/governed-development/llm-governed-development-guide.md
```

ADR and Requirement records remain in the project-model reference space. They govern the existence, purpose, and traceability of the guides, but the guide content itself stays in the how-to space.

The project graph may reference guide documents as governed `Document` nodes when a requirement is described or operationalized by a guide. The graph must not treat guide documents as ADRs, Requirement bodies, or implementation source modules.

## Scope

In scope:

- placing operational programmer and LLM guidance under `docs/how-to/`;
- keeping ADR and Requirement bodies limited to decisions and verifiable contracts;
- linking guide documents to MR-0001 requirements through governed graph relations;
- establishing the first governed-development how-to area.

Out of scope:

- implementing a dedicated guide body-format validator in this step;
- defining all future guide profiles;
- creating tutorials, explanations, or reference pages for reusable interfaces;
- implementing frontend or backend modules.

## Consequences

### Positive consequences

- The project keeps Diátaxis categories clean and inspectable.
- Operational instructions can evolve as how-to documents without bloating ADRs or Requirement bodies.
- Future documentation validators can distinguish guide placement from reference/project-model placement.
- LLM and programmer guidance can be reused by threat-forge and future child projects without changing canonical project-model records.

### Negative consequences

- The project now has one more documentation area to keep coherent.
- Guide documents are initially governed by graph and requirements, but do not yet have a dedicated Markdown body-format validator.
- Future work may need additional guide profile controls once the guide set grows.

## Follow-up

1. Add a functional requirement for governed development guide placement.
2. Add specialized requirements for the programmer guide and the LLM guide.
3. Add the initial guide documents under `docs/how-to/governed-development/`.
4. Link the guide documents in `GRAPH-0001` as how-to documents governed by MR-0001 requirements.
5. Consider a future guide body-format profile only after multiple guide documents require deterministic body validation.
