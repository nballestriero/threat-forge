# MR-0000REQ-0014 — Append-first evolution for protected project-model records

## Intent

Canonical project-model records should evolve primarily by addition so that historical governance, handoff, graph traversal, and traceability remain stable.

## Requirement

The system must treat protected project-model registries and graph files as append-first records by default.

## Scope

This requirement applies to protected project-model governance files, including decision registries, requirement registries, body-format registries, graph registries, graph node-type registries, and SPO predicate registries. It does not apply to generated artifacts, transient handoff ZIP files, or implementation source files unless a future requirement explicitly brings those files into scope.

## Rules

- Adding a new governed record is the default accepted evolution path.
- Existing governed record identities must remain stable.
- Existing records should be superseded, deprecated, or archived through explicit governed fields where possible rather than silently removed.
- A future guard must distinguish additions from modifications and deletions.

## Acceptance Criteria

```gherkin
Scenario: Append-only registry evolution is allowed
  Given a protected requirement registry already contains stable records
  When a new requirement record is appended
  And no existing stable record is modified or deleted
  Then the change is treated as append-first evolution
```

## Verification Expectation

A future validator must compare protected records against a baseline and report whether a change is append-only or includes modifications/deletions.
