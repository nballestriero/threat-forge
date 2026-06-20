# MR-0004REQ-0020 — Analysis Storage Port Abstraction

## Intent

Base Analysis persistence must be accessed through an application storage port so services and controllers do not depend on a concrete database implementation.

## Requirement

The Base Analysis model must preserve the distinction between governed documentation, logical persistent records and concrete storage adapters. This requirement constrains future runtime persistence design without introducing a database schema in this document-only step.

## Scope

This requirement applies to future Base Analysis persistence, service contracts and storage adapter design. It does not implement runtime storage, SQLite, migrations, OpenAPI, Zod schemas, UI components or CI/CD gates.

## Rules

- Backend controllers must not instantiate SQLite, filesystem or concrete analysis storage adapters.
- Base Analysis services must depend on a storage port/interface for commands and queries.
- The composition root must select and assemble the concrete adapter.
- Adapter implementations must preserve the logical record semantics defined for Base Analysis.
- Frontend components must consume API/view-model contracts and must not access analysis storage directly.

## Acceptance Criteria

```gherkin
Scenario: Base Analysis persistence remains storage-independent
  Given a future Base Analysis feature needs to persist dynamic analysis state
  When the feature is designed
  Then it defines logical records and storage-port behavior before introducing a concrete storage adapter
```

## Verification Expectation

Future backend implementation must cite this requirement and demonstrate controller/service/port/adapter separation for Base Analysis persistence.
