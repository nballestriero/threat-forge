# MR-0000REQ-0021 — Orphan governed body file detection

## Intent

Threat-forge stores ADR and Requirement bodies as Markdown files referenced by governed registries. A body file that exists but is not referenced by a registry or graph record is invisible to normal traversal and can become misleading documentation.

## Requirement

The repository must provide a deterministic orphan body detection gate for governed project-model body files.

## Scope

This requirement governs Markdown body files under `docs/reference/project-model/body/`. It does not govern generated pages, how-to guides, tutorials or explanation documents unless a future requirement extends the scope.

## Rules

- The gate must scan governed ADR and Requirement body directories.
- Every governed body file in scope must be referenced by a canonical registry entry.
- Every registry `body_path` in scope must resolve to an existing file.
- The gate must fail on orphan body files and missing declared body files.
- Diagnostics must identify the path and whether it is orphaned or missing.

## Acceptance Criteria

```gherkin
Scenario: Unreferenced requirement body fails the orphan body gate
  Given a Markdown body file exists under docs/reference/project-model/body/requirements
  And no requirement registry entry references it by body_path
  When the orphan body gate runs
  Then the gate fails with a diagnostic naming the body file
```

## Verification Expectation

The implementation should either integrate with existing body-format validators or add a focused docs gate with positive and negative fixture coverage.
