# MR-0000REQ-0034 — Deterministic promotion policy for LLM semantic findings

## Intent

Threat-forge must define how advisory LLM findings become deterministic governance only when they are stable, narrow, reviewed and testable.

## Requirement

Threat-forge must define how advisory LLM findings become deterministic governance only when they are stable, narrow, reviewed and testable.

## Scope

This requirement governs LLM-assisted semantic governance review before new terminology, Knowledge Graph ingestion, child-project execution or security-analysis automation relies on ambiguous project-model language. It does not implement an LLM runner, select a provider, mutate repository files, block CI, or replace deterministic validators.

## Rules

- An LLM finding may be promoted only after human acceptance and an explicit governed decision or requirement update.
- Promotion must identify the exact deterministic rule, affected fields, included paths and excluded contexts.
- Promotion must include at least one negative fixture that fails before the rule is satisfied.
- Promotion must include graph traceability from the governing requirement to the implementing tool or registry.
- Promotion must avoid broad prose scanning unless a future ADR defines the false-positive boundary and migration strategy.
- Deterministic promotion must prefer small high-confidence rules over large synonym or ontology lists.

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
