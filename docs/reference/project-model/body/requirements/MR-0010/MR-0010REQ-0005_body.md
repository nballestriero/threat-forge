# MR-0010REQ-0005 — LLM Reading Routes for Assisted Development and Semantic Review

## Intent

LLM assistance must be grounded in the same project knowledge that governs human development, instead of relying on broad unstructured repository scanning or hidden assumptions.

## Requirement

The manual must define reading routes that tell an LLM which canonical records, graph neighborhoods, manual chapters and implementation artifacts to inspect before proposing a development step, semantic review finding or documentation change.

## Scope

This requirement governs LLM reading-route semantics. It does not implement an LLM runner, make LLM output blocking, select a model provider or authorize automatic mutation.

## Rules

- LLM reading routes must start from canonical MR, ADR, requirement and graph records when a governed change is requested.
- Reading routes must identify which manual chapters explain the selected work type.
- Reading routes must tell the LLM to inspect implementation artifacts only after understanding the governing records.
- Reading routes must preserve the advisory-only boundary for semantic review.
- LLM proposals must cite evidence paths or governed ids and must identify uncertainty or missing context.

## Acceptance Criteria

```gherkin
Scenario: LLM proposes a micropasso
  Given a user asks an LLM to continue threat-forge development
  When the LLM follows the manual reading route for development assistance
  Then it first identifies relevant MR, ADR, requirements and graph relations
  And it proposes a small governed step with evidence and explicit limits
  And it does not treat its proposal as canonical until the normal governance path is followed
```

## Verification Expectation

Future validation should verify that reading-route records reference existing canonical ids and manual chapters once the route registry is introduced.
