# MR-0004REQ-0019 — Dynamic Analysis Data Storage Boundary

## Intent

Base Analysis candidates, reviews, snapshots, DFD working state and lifecycle status must be treated as dynamic project application state, not as ordinary governed Markdown/YAML documentation.

## Requirement

The Base Analysis model must preserve the distinction between governed documentation, logical persistent records and concrete storage adapters. This requirement constrains future runtime persistence design without introducing a database schema in this document-only step.

## Scope

This requirement applies to future Base Analysis persistence, service contracts and storage adapter design. It does not implement runtime storage, SQLite, migrations, OpenAPI, Zod schemas, UI components or CI/CD gates.

## Rules

- Governed documentation must remain canonical for ADRs, requirements, taxonomy definitions, graph rules and validation policy.
- Dynamic storage must persist analysis instances, candidate review state, accepted analysis inventory, DFD derivation state, source snapshot bindings and analysis lifecycle status.
- Reports or summaries may be exported from dynamic records, but exported reports must not become the mutable working state of the analysis unless explicitly governed as such.
- Child project analysis data must be scoped to the relevant workspace/project context.

## Acceptance Criteria

```gherkin
Scenario: Base Analysis persistence remains storage-independent
  Given a future Base Analysis feature needs to persist dynamic analysis state
  When the feature is designed
  Then it defines logical records and storage-port behavior before introducing a concrete storage adapter
```

## Verification Expectation

Future implementation gates must prevent Base Analysis runtime state from being stored by directly mutating governed documentation files as the primary persistence mechanism.
