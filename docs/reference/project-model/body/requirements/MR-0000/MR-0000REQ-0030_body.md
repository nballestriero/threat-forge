# MR-0000REQ-0030 — Child check-run freshness status model

## Intent

Threat-forge must know whether a child-project check result is fresh enough to trust independently from whether the last run passed or failed.

## Requirement

Child-project check runs must have governed freshness semantics that distinguish fresh, stale, expired and unknown evidence before their results are used for child-project trust or Knowledge Graph ingestion.

## Scope

This requirement governs freshness semantics for child-project check runs and derived trust decisions. It does not implement scheduling, polling, remote repository access, timestamp calculation or UI rendering in this micropasso.

## Rules

- Freshness status must be separate from gate execution result status.
- A previously passing check run must become stale or expired when repository head, branch, source registration or governed documentation evidence changes beyond the accepted freshness boundary.
- Unknown freshness must fail closed for Knowledge Graph ingestion.
- Freshness evaluation must record the evidence used, such as repository head, checked_at timestamp, source descriptor or project-model snapshot identity.
- Stale, expired or unknown check runs must not be used as trusted LLM or security-analysis knowledge.

## Acceptance Criteria

```gherkin
Scenario: Passing but stale check results are not trusted
  Given a child project has a previous passing check run
  And the governed source evidence is newer or no longer matches the recorded repository head
  When ingestion eligibility is evaluated
  Then the check run is not considered fresh
  And the child project is not eligible for trusted Knowledge Graph ingestion
```

## Verification Expectation

Verification should include deterministic freshness fixtures after the check-run model is implemented and graph traceability from this requirement to the freshness evaluator.
