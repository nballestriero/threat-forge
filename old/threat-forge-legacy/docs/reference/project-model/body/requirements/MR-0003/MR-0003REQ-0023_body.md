# MR-0003REQ-0023 — Child Project Management Storage Port

## Intent

Child-project management must persist platform operational state without binding the domain service to SQLite or any other concrete database.

## Requirement

The system must define a child-project management storage port that exposes stable persistence operations for managed child projects, validation runs, gate results, violations and lifecycle read models.

## Scope

This requirement applies to future backend child-project management services and storage adapters.

It does not implement the storage port, SQLite adapter, backend HTTP API, UI, skeleton generator, repository cloning, RBAC runtime or child-project commit/push runner in this micropasso.

## Rules

- The service layer must depend on a storage port, not on a concrete database adapter.
- The port must represent domain/application records such as child project, repository location, governance profile, check run, gate result and violation.
- The port must not expose SQLite-specific details, SQL strings, database file paths, row IDs as domain identifiers, or adapter-specific result shapes.
- The port must keep platform operational state separate from child-project Project Model documentation records.
- The port must support future read models needed by the Governance Console Child Projects area.

## Acceptance Criteria

```gherkin
Scenario: Service depends on child-project storage abstraction
  Given a child-project management service needs managed-project state
  When the service reads or writes child-project operational records
  Then it uses a storage port
  And it does not depend directly on SQLite APIs or schema details
```

## Verification Expectation

A future implementation must include a storage-port module and tests proving that the service can be composed with a fake or alternate adapter without changing service logic.
