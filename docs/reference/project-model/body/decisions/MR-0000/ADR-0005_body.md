# ADR-0005 — Append-first governance for canonical registries and graph records

## Status

Accepted.

## Context

The project model is increasingly based on canonical registries and graph records. These files define decisions, requirements, body-format profiles, graph nodes, graph relations, technical node types, and SPO predicates.

Many of these records represent historical governance facts. If an existing registry item or graph relation is silently changed or deleted, the project can lose traceability, invalidate previous handoffs, break generated views, or hide why a tool, requirement, decision, or profile exists.

Most normal project-model evolution should therefore be append-first: new records, new decisions, new requirements, new graph relations, and new body-format profiles are added without rewriting or removing existing governed records.

Some changes remain legitimate. Examples include correcting a typo, fixing an invalid path, superseding a decision, deprecating a profile, archiving an obsolete record, or removing a mistaken record before it becomes a stable referenced artifact. These changes must be explicit and reviewed because they can affect traceability.

## Decision

Canonical registries and graph records must follow an append-first evolution model by default.

For protected project-model files, adding new records is the normal change path. Modifying or deleting existing records is a destructive or history-affecting change and must require explicit confirmation before it is accepted.

Protected files include, at minimum:

- macro-requirement registries;
- ADR registries;
- Requirement registries;
- body-format registries;
- graph registries;
- graph node-type registries;
- SPO predicate registries.

A future deterministic guard must detect changes to stable record identities and protected fields. The guard must distinguish append-only additions from modifications and deletions. When a modification or deletion is detected, the change must fail unless a governed confirmation mechanism explicitly declares that the non-append change is intentional.

The confirmation mechanism is not implemented by this ADR. It may later be represented by a dedicated change intent file, an explicit command flag, a governed change record, or another controlled mechanism. The important rule is that destructive changes must not pass silently.

This rule does not forbid legitimate evolution. It requires that non-append evolution be deliberate, visible, and traceable.

## Scope

In scope:

- declaring append-first behavior as the default for canonical registries and graph records;
- distinguishing additions from modifications and deletions;
- requiring explicit confirmation for non-append changes;
- preparing future deterministic checks for protected project-model files.

Out of scope:

- implementing the append-first guard;
- choosing the final confirmation mechanism;
- preventing all edits to governed files;
- applying append-first rules to generated artifacts under `artifacts/`;
- freezing source code files, tests, or implementation artifacts.

## Consequences

### Positive consequences

* Historical governance records become more stable.
* Accidental deletion of decisions, requirements, graph nodes, graph relations, registry entries, and body-format profiles becomes detectable.
* Handoff and GraphRAG-style project exploration can rely on stable identifiers and append-first history.
* Future RTM and traceability reports become safer because their source records are less likely to disappear silently.

### Negative consequences

* Some legitimate cleanup operations require an additional explicit confirmation step.
* Validators must compare the current state against a previous baseline or protected snapshot to distinguish append-only changes from destructive changes.
* The project must eventually define where and how non-append confirmations are recorded.

## Follow-up

1. Derive requirements for append-first protected project-model evolution.
2. Derive requirements for explicit confirmation of modifications and deletions.
3. Derive requirements for a future deterministic append-first guard.
4. Later, implement the guard under `MR-0000` after requirements and graph relations exist.
