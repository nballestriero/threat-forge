# MR-0000REQ-0016 — Deterministic append-first guard for canonical registries and graph files

## Intent

The append-first policy must be enforceable by a deterministic guard before protected project-model changes become part of the governed workflow.

## Requirement

The system must provide a deterministic append-first guard for canonical registries and graph files.

## Scope

This requirement defines the future guard behavior. It does not implement the guard in this micropasso. The first implementation should remain under `MR-0000` because the guard is a cross-cutting system-state consistency control.

## Rules

- The guard must classify added records as append additions.
- The guard must classify changed existing records as modifications.
- The guard must classify missing existing records as deletions.
- The guard must fail on unconfirmed modifications and deletions.
- The guard must produce diagnostics that identify the file, record identity, change kind, and required confirmation.
- The guard must be designed to work with registries and graph files before it is extended to other artifact classes.

## Acceptance Criteria

```gherkin
Scenario: Append-only registry change passes the append-first guard
  Given a protected registry baseline
  When the current registry only adds new records
  Then the append-first guard reports additions
  And the guard does not fail because of destructive changes

Scenario: Unconfirmed graph relation removal fails the append-first guard
  Given a protected graph baseline containing an SPO relation
  When the current graph no longer contains that relation
  And no explicit confirmation is provided
  Then the append-first guard fails with a diagnostic naming the removed relation
```

## Verification Expectation

A future implementation must include deterministic tests or negative fixtures for append-only additions, unconfirmed modifications, unconfirmed deletions, and confirmed non-append changes.
