# ADR-0008 — Code RTM derived from knowledge graph

## Status

Accepted.

## Context

The project needs a code traceability matrix that explains which requirements justify which implementation artifacts and which verification artifacts prove those requirements.

A hand-maintained RTM table would become stale as code, tools, validators, graph relations, and requirements evolve.

The existing project model already expresses the core RTM traversal:

```text
MR -> has_decision -> ADR -> justifies -> REQ -> implemented_by -> implementation artifact
implementation or verification artifact -> verifies -> REQ
```

The future code RTM should therefore be derived from the knowledge graph and from governed code declarations, not maintained as an independent source of truth.

## Decision

The code RTM must be an automatically generated view derived from the project knowledge graph and governed code declarations.

The knowledge graph remains the canonical source of logical traceability. The generated RTM is a report or view artifact and must not become canonical source data.

Future code artifacts, tools, validators, and commands must declare their governed traceability in structured headers or JSDoc. The declarations must include the implemented requirement, the relevant ADR, and the macro requirement when applicable.

The RTM generation and validation flow must compare both directions:

```text
graph -> implementation artifact declarations
implementation artifact declarations -> graph
```

The RTM should eventually expose at least:

- requirement id;
- requirement title;
- owning macro requirement;
- justifying ADR canonical identity;
- implementation artifact or tool;
- verification artifact or command;
- coverage status;
- unresolved or inconsistent traceability findings.

Generated RTM outputs must be placed under `artifacts/` or another explicitly derived-output location and must not be treated as authored canonical records.

## Scope

In scope:

- declaring the RTM as a derived knowledge-graph view;
- declaring bidirectional consistency between graph relations and code declarations;
- declaring that generated RTM artifacts are non-canonical outputs.

Out of scope:

- implementing RTM generation in this step;
- defining every future code declaration field in this step;
- introducing methodology-specific RTM logic for STRIDE, PASTA, or STRIDE-AI;
- replacing existing graph or validator behavior.

## Consequences

### Positive consequences

* The RTM can stay synchronized with governed graph relations.
* Code traceability can be checked deterministically.
* Missing implementation or verification coverage can become visible.
* LLMs and humans can inspect code coverage through generated views instead of manual tables.

### Negative consequences

* Code artifacts will need structured traceability declarations.
* Graph relations and JSDoc/header declarations must be kept consistent.
* Future validators must fail closed when graph and code traceability disagree.

## Follow-up

1. Derive requirements for code RTM generation and bidirectional graph/code traceability checks.
2. Define the minimum code declaration format for tools and validators.
3. Introduce RTM graph view profiles before implementing a generator.
4. Implement RTM generation only after requirements and graph relations exist.
