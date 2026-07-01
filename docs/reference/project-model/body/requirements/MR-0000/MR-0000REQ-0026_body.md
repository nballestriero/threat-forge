# MR-0000REQ-0026 — Minimal canonical terminology guard for governed labels

## Intent

Threat-forge must strengthen semantic governance before adding real child-project execution, Knowledge Graph ingestion or security-analysis runtime features. Format-valid files are not sufficient if registries, graph records, contracts or controlled values disagree.

## Requirement

The project must prevent high-impact product/component naming drift in governed titles and labels without creating a broad prose-policing taxonomy.

## Scope

This requirement governs project-model semantic consistency and gate-hardening behavior. It does not implement the gate in this micropasso, execute child-project gates, mutate child repositories, ingest a Knowledge Graph or introduce Base Analysis, STRIDE or STRIDE-AI runtime behavior.

## Rules

- The guard must focus on governed titles and labels such as ADR titles, Requirement titles, registry labels, graph node labels and UI navigation labels.
- The guard must not scan every historical body paragraph as a blocking condition.
- The guard must support a small set of canonical product/component names that materially affect user and LLM navigation.
- The guard must allow explicitly documented historical terms in legacy context when they are not introduced as new canonical labels.
- The guard must prevent new governed labels from using deprecated aliases for active product slices, such as using historical Project Model Explorer language where Project Documentation Explorer is the active canonical slice.
- The guard must produce low-noise diagnostics with the offending label and suggested canonical term.

## Acceptance Criteria

```gherkin
Scenario: Semantic governance drift is not allowed to pass silently
  Given a governed repository state contains registry, graph or contract records covered by this requirement
  When the corresponding semantic gate is implemented and npm run repo:check executes
  Then the gate fails on mismatched controlled values or ownership semantics
  And the diagnostic identifies the file, field and governed record that must be corrected
```

## Verification Expectation

Verification should include a deterministic checker, at least one focused negative fixture for the governed mismatch class, graph traceability from this requirement to the checker, and governed runner output proving the checker runs under `npm run repo:check`.
