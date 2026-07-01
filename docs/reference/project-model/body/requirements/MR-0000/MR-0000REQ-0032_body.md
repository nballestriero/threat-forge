# MR-0000REQ-0032 — LLM-assisted semantic governance review role and prompt registry

## Intent

Threat-forge must provide governed prompt records so an LLM acting as a semantic governance reviewer can understand its role, inputs, scope, output contract and authority limits from repository documentation.

## Requirement

Threat-forge must provide governed prompt records so an LLM acting as a semantic governance reviewer can understand its role, inputs, scope, output contract and authority limits from repository documentation.

## Scope

This requirement governs LLM-assisted semantic governance review before new terminology, Knowledge Graph ingestion, child-project execution or security-analysis automation relies on ambiguous project-model language. It does not implement an LLM runner, select a provider, mutate repository files, block CI, or replace deterministic validators.

## Rules

- The repository must contain a governed registry for LLM semantic governance prompts.
- Each prompt record must have a stable id, version, purpose, intended role, required inputs and required output contract.
- Prompt records must explicitly state that LLM findings are advisory unless promoted through deterministic governance.
- Prompt records must require evidence references to governed ids or repository paths for each finding.
- Prompt records must prohibit automatic mutation, hidden assumptions and uncited canonical claims.
- Prompt changes that materially alter reviewer authority or output obligations must be handled through a new ADR or an explicitly governed registry evolution.

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
