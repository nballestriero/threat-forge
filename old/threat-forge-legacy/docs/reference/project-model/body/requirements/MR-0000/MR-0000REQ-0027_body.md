# MR-0000REQ-0027 — Child execution and knowledge graph ingestion hardening prerequisite

## Intent

Threat-forge must strengthen semantic governance before adding real child-project execution, Knowledge Graph ingestion or security-analysis runtime features. Format-valid files are not sufficient if registries, graph records, contracts or controlled values disagree.

## Requirement

Threat-forge must not treat child-project gate execution or child-project Knowledge Graph ingestion as reliable until semantic gate hardening, status freshness and ingestion eligibility are governed.

## Scope

This requirement governs project-model semantic consistency and gate-hardening behavior. It does not implement the gate in this micropasso, execute child-project gates, mutate child repositories, ingest a Knowledge Graph or introduce Base Analysis, STRIDE or STRIDE-AI runtime behavior.

## Rules

- The project must define child gate planning status separately from gate execution result status.
- The project must define check-run freshness separately from pass/fail execution outcomes.
- The project must define Knowledge Graph ingestion eligibility for child projects before child data is exposed to LLM-assisted development or security analysis.
- A child project with unresolved source, failed semantic gates, stale check results or incomplete governance records must be marked unavailable, stale or quarantined rather than ingested as trustworthy knowledge.
- Real child-project gate execution must persist check runs, gate results and violations using controlled statuses aligned with the owning vocabularies.
- The working plan must keep Base Analysis, STRIDE and STRIDE-AI runtime work parked until this ingestion boundary is defined or explicitly reprioritized.

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
