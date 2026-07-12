# MR-0000REQ-0025 — Controlled vocabulary consistency across registries and contracts

## Intent

Threat-forge must strengthen semantic governance before adding real child-project execution, Knowledge Graph ingestion or security-analysis runtime features. Format-valid files are not sufficient if registries, graph records, contracts or controlled values disagree.

## Requirement

Governed controlled values that appear in registries, runtime contracts, OpenAPI schemas, storage records or UI states must be traceable to a single vocabulary owner or an explicit governed mapping.

## Scope

This requirement governs project-model semantic consistency and gate-hardening behavior. It does not implement the gate in this micropasso, execute child-project gates, mutate child repositories, ingest a Knowledge Graph or introduce Base Analysis, STRIDE or STRIDE-AI runtime behavior.

## Rules

- The repository must identify vocabulary owners for governed enum-like fields used across documentation, runtime APIs and storage.
- The gate must fail when a runtime contract accepts a governed status value that is absent from the owning registry.
- The gate must fail when an owning registry contains an active value that the mapped runtime/OpenAPI contract cannot represent.
- The gate must distinguish planned status, execution result, freshness and Knowledge Graph ingestion state rather than collapsing them into one ambiguous enum.
- The gate must require explicit mapping when a runtime contract intentionally uses a different external representation than the registry value id.
- The gate must include child-project governance status vocabularies before real child-project gate execution is enabled.
- The gate must report vocabulary owner, field name, source file and mismatched value.

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
