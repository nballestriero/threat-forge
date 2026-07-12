# MR-0004REQ-0009 — Versioned Analysis Source Snapshot Boundary

## Intent

A consolidated Base Analysis version must preserve the project source snapshot it analyzed.

## Requirement

The Base Analysis lifecycle must record a source snapshot boundary that identifies the governed documentation, registries, graph records, source/code references, API contracts, component declarations, data-resource declarations, boundary declarations, data-flow declarations and evidence references used to produce the version.

## Scope

This requirement applies to Base Analysis versioning and reproducibility. It does not implement storage, hashing, snapshot comparison or CI/CD checks.

## Rules

- A consolidated Base Analysis version must reference a source snapshot.
- The source snapshot must be sufficient for later stale comparison.
- Historical snapshots must remain auditable after new project commits.
- Snapshot identity must not be replaced by mutable current-branch assumptions.

## Acceptance Criteria

```gherkin
Scenario: Base Analysis preserves its analyzed project state
  Given a Base Analysis is consolidated
  When the project later changes
  Then the Base Analysis still references the documentation, graph, code and contract snapshot it analyzed
```

## Verification Expectation

Future lifecycle gates must verify that consolidated Base Analysis versions reference a source snapshot before overlays depend on them.
