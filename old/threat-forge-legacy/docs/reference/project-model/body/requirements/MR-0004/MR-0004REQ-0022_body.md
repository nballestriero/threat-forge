# MR-0004REQ-0022 — Analysis Record Source and Evidence Linkage

## Intent

Dynamic Base Analysis records must retain source, taxonomy, review and evidence links required for reproducibility, audit and stale detection.

## Requirement

The Base Analysis model must preserve the distinction between governed documentation, logical persistent records and concrete storage adapters. This requirement constrains future runtime persistence design without introducing a database schema in this document-only step.

## Scope

This requirement applies to future Base Analysis persistence, service contracts and storage adapter design. It does not implement runtime storage, SQLite, migrations, OpenAPI, Zod schemas, UI components or CI/CD gates.

## Rules

- Analysis version records must bind source snapshots such as documentation, graph, code, contracts, taxonomy versions and relevant commit identifiers.
- Candidate and accepted base elements must retain source references or review rationale sufficient for traceability.
- Review records must identify the accepted, rejected or evidence-needed decision state and link to reviewer/evidence information when available.
- Taxonomy classifications must identify the taxonomy version or extension used.
- Records must expose enough linkage for future MR-0008 audit/evidence trails and MR-0009 CI/CD reporting.

## Acceptance Criteria

```gherkin
Scenario: Base Analysis persistence remains storage-independent
  Given a future Base Analysis feature needs to persist dynamic analysis state
  When the feature is designed
  Then it defines logical records and storage-port behavior before introducing a concrete storage adapter
```

## Verification Expectation

Future reports and stale-detection gates must be able to trace analysis state back to source snapshots, taxonomy versions and review/evidence records.
