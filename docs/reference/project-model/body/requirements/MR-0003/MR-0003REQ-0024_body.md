# MR-0003REQ-0024 — SQLite Child Project Store Adapter Boundary

## Intent

SQLite is the pragmatic first database for child-project management state, but it must remain replaceable.

## Requirement

The system must implement SQLite, when introduced, as an adapter behind the child-project management storage port rather than as a direct dependency of the service or UI.

## Scope

This requirement applies to the first concrete child-project management persistence adapter.

It does not require adding SQLite in this micropasso and does not select SQLite as a permanent database technology.

## Rules

- The SQLite adapter must implement the child-project storage port.
- The adapter must own SQLite connection, schema, migrations or initialization concerns when those are introduced.
- The adapter must translate between SQLite rows and stable application records.
- The service and controller must not embed SQL or SQLite-specific behavior.
- Replacing SQLite with another adapter must not require changes to child-project Project Model validators, skeleton generation, UI read-model contracts or service use-case logic.

## Acceptance Criteria

```gherkin
Scenario: SQLite is replaceable
  Given child-project management state is persisted through SQLite
  When another storage adapter is composed behind the same port
  Then service behavior and UI read-model contracts remain unchanged
```

## Verification Expectation

A future SQLite adapter must have focused tests for persistence behavior and at least one service test using a non-SQLite fake adapter to demonstrate storage replacement.
