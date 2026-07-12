# MR-0000REQ-0029 — Child gate execution result status model

## Intent

Threat-forge must define child gate execution outcomes without mixing them with planning, freshness or ingestion eligibility.

## Requirement

Executed child-project gates must use controlled result statuses that represent the outcome of a concrete execution or an explicit non-execution decision.

## Scope

This requirement governs execution result semantics. It does not implement the executor, mutate child repositories, write SQLite migrations, update OpenAPI, or normalize existing runtime values in this micropasso.

## Rules

- Execution result status must be separate from gate planning status.
- Pass, fail and warning outcomes must only describe a concrete evaluated gate result.
- Explicit non-execution outcomes must not be treated as evidence that the gate passed.
- Transitional runtime values must be mapped to the canonical execution vocabulary or replaced before real child execution is trusted.
- Overall check-run status must be derived from gate results and blocking violations, not manually invented as an unrelated enum.
- Execution result vocabulary must be owned by a governed registry or by an explicit governed mapping.

## Acceptance Criteria

```gherkin
Scenario: Non-executed gates do not create trusted pass evidence
  Given a child-project gate has not run
  When the latest check-run status is evaluated for trust
  Then the missing execution cannot be represented as pass
  And the record preserves the reason for non-execution
```

## Verification Expectation

Verification should include controlled vocabulary alignment across registry, runtime contract, OpenAPI and storage representations before real execution is enabled.
