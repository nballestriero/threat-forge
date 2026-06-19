# ADR-0003 — Governance degli script e dei tool del repository

## Status

Accepted.

## Context

The project model is being built incrementally and must preserve a strict governance order:

1. decision;
2. requirement;
3. knowledge graph relation;
4. implementation artifact or tool;
5. graph relation from requirement to implementation;
6. verification;
7. graph relation from verification to requirement.

The repository already contains executable scripts and tools that support documentation structure checks, graph format checks, page generation, and handoff packaging.

These tools are part of the governed project system because they can validate, generate, package, or otherwise affect governed documentation and project model artifacts.

If executable tools are added or modified without requirement traceability, the repository can gain behavior that is not justified by a decision, not derived from a requirement, not visible in the graph, and not reviewable through deterministic governance.

## Decision

Every executable repository script or tool that validates, generates, packages, transforms, or enforces project artifacts must be governed before it is introduced or materially modified.

A governed tool change must follow this order:

1. an accepted ADR or equivalent decision justifies the tool behavior;
2. a requirement is derived from that decision;
3. the knowledge graph links the decision, requirement, and intended implementation semantics;
4. the tool file is created or modified;
5. the graph links the requirement to the tool implementation;
6. a verification command, fixture, or manual verification evidence checks the requirement;
7. the graph links the verification evidence back to the requirement.

Each governed tool source file must include readable JSDoc traceability near the top of the file.

The JSDoc traceability must identify at least:

* the implemented requirement ID;
* the originating decision ID when applicable;
* the macro-requirement ID.

A tool that verifies a requirement must be represented as verification evidence as well as implementation.

A tool that only generates or packages artifacts must still be represented as an implementation artifact if it affects governed project model workflows.

## Scope

This decision applies to executable repository tooling, including scripts under paths such as:

```text
tools/**
backend/tools/**
```

In scope:

- executable project-model validators;
- renderers and generators that affect governed artifacts;
- handoff or packaging tools that affect governed workflows;
- source-level traceability declarations for governed tools.

Out of scope:

- implementing all future tool traceability validators in this decision;
- changing application runtime behavior unrelated to governed project-model workflows;
- replacing human review with autonomous code changes.

## Consequences

### Positive consequences

* Tool behavior becomes explainable through ADRs and requirements.
* Future LLM-assisted development has explicit boundaries for code changes.
* The knowledge graph can show which tools implement and verify which requirements.
* Reviewers can reject executable changes that lack governed traceability.

### Negative consequences

* Even small tools require a decision and requirement trail before implementation.
* Some quick automation changes will need to be split into small governed micropassi.
* Existing tools may need incremental backfill of source-level traceability.

## Follow-up

1. Keep new tool implementations linked to requirements and graph relations before merge.
2. Add deterministic checks for source-level JSDoc traceability after the source traceability model is stable.
3. Ensure future runners orchestrate focused validators instead of hiding tool logic inside a mega-runner.
