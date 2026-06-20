# MR-0004REQ-0021 — Replaceable First Storage Adapter Constraint

## Intent

SQLite may be used as the first Base Analysis storage adapter, but the product must preserve the ability to replace it with another storage form.

## Requirement

The Base Analysis model must preserve the distinction between governed documentation, logical persistent records and concrete storage adapters. This requirement constrains future runtime persistence design without introducing a database schema in this document-only step.

## Scope

This requirement applies to future Base Analysis persistence, service contracts and storage adapter design. It does not implement runtime storage, SQLite, migrations, OpenAPI, Zod schemas, UI components or CI/CD gates.

## Rules

- A first SQLite adapter may be introduced only after storage-port and service requirements exist.
- SQLite table names, migrations and query details must remain adapter details, not domain terminology forced into controllers or UI components.
- Future PostgreSQL, document-store, file-backed, cloud database, event-store or hybrid adapters must remain possible.
- Tests and validators should target logical behavior and port contracts where practical, not only SQLite implementation details.

## Acceptance Criteria

```gherkin
Scenario: Base Analysis persistence remains storage-independent
  Given a future Base Analysis feature needs to persist dynamic analysis state
  When the feature is designed
  Then it defines logical records and storage-port behavior before introducing a concrete storage adapter
```

## Verification Expectation

Future storage implementation reviews must verify that SQLite-specific code is isolated behind the adapter boundary.
