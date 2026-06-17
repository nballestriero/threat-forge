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