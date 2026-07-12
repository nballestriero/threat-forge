# MR-0000REQ-0024 — Graph and registry ownership consistency gate

## Intent

Threat-forge must strengthen semantic governance before adding real child-project execution, Knowledge Graph ingestion or security-analysis runtime features. Format-valid files are not sufficient if registries, graph records, contracts or controlled values disagree.

## Requirement

The governed repository checks must include a deterministic semantic consistency gate that compares ADR registries, Requirement registries and graph relations so graph ownership cannot drift from canonical registry fields.

## Scope

This requirement governs project-model semantic consistency and gate-hardening behavior. It does not implement the gate in this micropasso, execute child-project gates, mutate child repositories, ingest a Knowledge Graph or introduce Base Analysis, STRIDE or STRIDE-AI runtime behavior.

## Rules

- The gate must confirm that every accepted ADR registry record has a corresponding graph ADR node.
- The gate must confirm that every requirement registry record has a corresponding graph Requirement node.
- The gate must confirm reciprocal ownership for ADR decisions: `MR -> has_decision -> ADR` and `ADR -> belongs_to -> MR` must agree.
- The gate must confirm requirement ownership: every governed requirement must belong to its declared macro-requirement in the graph.
- The gate must confirm that `derived_from_decision_id` in the requirement registry is reflected by the graph relation `ADR -> justifies -> REQ`.
- The gate must fail if a requirement is justified by an extra ADR unless a future governed specialization or secondary-decision model explicitly authorizes that relation.
- The gate must report file, record id, expected relation and actual relation for each mismatch.
- The gate must run under `npm run repo:check` before child-project gate execution or Knowledge Graph ingestion are treated as reliable.

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
