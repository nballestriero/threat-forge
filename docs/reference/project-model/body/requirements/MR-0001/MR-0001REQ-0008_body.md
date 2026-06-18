# MR-0001REQ-0008 — Independent requirement bodies for functional and specialized requirements

## Intent

Functional and specialized requirements must both have governed Markdown bodies with standard, deterministic structure.

## Requirement

Every requirement, whether functional or specialized, must have an independent body file referenced by its registry record.

The body must provide the human-readable explanation, scope, rules, acceptance criteria, and verification expectation for that specific requirement. Specialized requirements must not be stored only as inline notes inside a functional requirement body.

## Scope

This requirement applies to Requirement body governance for both functional requirements and specialized child requirements.

It does not define the final complete body-format profile in this micropasso; that profile must be declared through the governed body format registry before broad enforcement.

## Rules

- Every requirement record must reference a body path.
- Every requirement body path must point to an existing Markdown file.
- The body H1 must identify the requirement id and title.
- Functional and specialized requirements must both follow governed body-format profiles.
- Specialized requirement bodies must be independently traceable in generated pages, graph views, RTM reports, and LLM guidance.
- A requirement body must not serve as the only canonical location for hidden child requirements.

## Acceptance Criteria

```gherkin
Scenario: Functional and specialized requirements have independent bodies
  Given a functional requirement and a specialized child requirement exist
  When their records are loaded from the requirement registry
  Then each record references a body path
  And each body path points to an existing Markdown file
  And each body can be rendered, validated, and traced independently
```

## Verification Expectation

A future Requirement body validator must check body existence, H1 consistency, required sections, required section order, and orphan body files for both functional and specialized requirements.
