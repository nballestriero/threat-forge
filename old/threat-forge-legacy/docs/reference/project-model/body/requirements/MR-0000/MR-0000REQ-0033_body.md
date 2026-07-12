# MR-0000REQ-0033 — Advisory semantic review report boundary

## Intent

Threat-forge must keep LLM semantic review output as an evidence-linked advisory report rather than a blocking gate or canonical source.

## Requirement

Threat-forge must keep LLM semantic review output as an evidence-linked advisory report rather than a blocking gate or canonical source.

## Scope

This requirement governs LLM-assisted semantic governance review before new terminology, Knowledge Graph ingestion, child-project execution or security-analysis automation relies on ambiguous project-model language. It does not implement an LLM runner, select a provider, mutate repository files, block CI, or replace deterministic validators.

## Rules

- LLM semantic review reports must distinguish observation, risk, suggested action and deterministic-promotion candidate fields.
- Each finding must include affected governed ids or paths, severity, confidence and rationale.
- A report must be allowed to state that no issue was found for the requested scope.
- Reports must not change repository state, statuses, graph relations, controlled values or canonical terminology by themselves.
- Reports must not be used as the only evidence for Knowledge Graph ingestion trust decisions.
- Any future report storage must keep model identity, prompt id/version, input scope and timestamp so findings remain auditable.

## Acceptance Criteria

```gherkin
Scenario: LLM semantic review remains governed and advisory
  Given a future LLM reviewer reads the governed project documentation
  When it performs semantic terminology or naming review
  Then it follows the prompt registry role and output contract
  And every finding is evidence-linked and advisory until promoted through deterministic governance
```

## Verification Expectation

Verification should include a governed prompt registry, graph traceability from this requirement to the prompt registry, and later optional runner output that records prompt id, prompt version, input scope and advisory findings without blocking `npm run repo:check`.
