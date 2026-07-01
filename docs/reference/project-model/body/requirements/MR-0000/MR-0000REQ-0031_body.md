# MR-0000REQ-0031 — Child Knowledge Graph ingestion eligibility status model

## Intent

Threat-forge must prevent stale, incomplete or semantically inconsistent child-project knowledge from entering the trusted Knowledge Graph used by LLM-assisted development and security analysis.

## Requirement

Child-project Knowledge Graph ingestion must use controlled eligibility statuses and must fail closed when source, semantic gate, freshness or ownership evidence is missing or untrusted.

## Scope

This requirement governs ingestion eligibility semantics. It does not implement ingestion, vector storage, graph storage, LLM context assembly, Base Analysis, STRIDE or STRIDE-AI runtime behavior.

## Rules

- Knowledge Graph ingestion status must be separate from planning, execution and freshness statuses.
- A child project may be eligible only when registration is valid, documentation source resolution is available, semantic gates pass, freshness is acceptable and vocabulary/ownership consistency is trusted.
- Unavailable, unsupported, stale, failed, unknown or semantically inconsistent child-project evidence must result in blocked, stale or quarantined ingestion status.
- Quarantined child-project knowledge must not be exposed as trusted LLM context or security-analysis evidence.
- Ingestion status must preserve the blocking reason so users can fix registration, source, freshness or semantic consistency issues.

## Acceptance Criteria

```gherkin
Scenario: Semantically inconsistent child data is quarantined from the Knowledge Graph
  Given a child project has documentation records available
  But semantic ownership or controlled vocabulary checks fail
  When Knowledge Graph ingestion eligibility is evaluated
  Then the child project is marked quarantined or blocked
  And no trusted LLM/security-analysis knowledge is produced from that source
```

## Verification Expectation

Verification should include an ingestion eligibility evaluator before any child Knowledge Graph ingestion job or LLM context builder is allowed to consume child-project data.
