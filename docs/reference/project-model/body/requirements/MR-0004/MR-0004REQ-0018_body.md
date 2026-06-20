# MR-0004REQ-0018 — Base Analysis Logical Record Model

## Intent

Future Base Analysis services must use a logical record model for persistent analysis state before any concrete database schema is implemented.

## Requirement

The Base Analysis model must preserve the distinction between governed documentation, logical persistent records and concrete storage adapters. This requirement constrains future runtime persistence design without introducing a database schema in this document-only step.

## Scope

This requirement applies to future Base Analysis persistence, service contracts and storage adapter design. It does not implement runtime storage, SQLite, migrations, OpenAPI, Zod schemas, UI components or CI/CD gates.

## Rules

- The logical record set must include at least BaseAnalysisVersion, source snapshot binding, base element candidate, accepted base actor, accepted base component, accepted base resource, accepted base boundary, accepted base flow, DFD derivation reference, taxonomy classification, source reference and review record concepts.
- Logical records must describe domain semantics and relationships, not SQLite-specific tables or column names.
- Logical records must be suitable for mapping to relational, document, event or hybrid storage forms.
- The model must support versioned analysis, stale detection, rebase and supersede lifecycle semantics.

## Acceptance Criteria

```gherkin
Scenario: Base Analysis persistence remains storage-independent
  Given a future Base Analysis feature needs to persist dynamic analysis state
  When the feature is designed
  Then it defines logical records and storage-port behavior before introducing a concrete storage adapter
```

## Verification Expectation

Future design reviews must verify that Base Analysis persistence requirements define logical records before storage-specific schemas or adapters.
