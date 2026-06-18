# MR-0001REQ-0006 — Atomic requirement records

## Intent

The project model must represent requirements as small atomic records before implementation work starts.

## Requirement

Every newly introduced governed requirement must describe one coherent obligation that can be traced, implemented, verified, and reported independently.

Requirement records must avoid combining unrelated concerns such as identity rules, body format rules, validator architecture, generated reports, and source-code traceability in a single large requirement.

When an ADR implies multiple obligations, those obligations must be split into separate requirement records and separate requirement body files.

## Scope

This requirement applies to new Requirement records introduced after the accepted requirement model decision.

It does not require rewriting every existing legacy requirement in this micropasso.

## Rules

- A requirement must have a stable id.
- A requirement must have a concise title.
- A requirement must have an owning macro requirement.
- A requirement must reference the ADR that justifies it.
- A requirement must have its own governed Markdown body.
- A requirement must be small enough to be verified by a deterministic validator, generated report, source-code traceability check, or explicit manual review gate.

## Acceptance Criteria

```gherkin
Scenario: Deriving small requirements from an ADR
  Given an accepted ADR introduces multiple governed obligations
  When requirement records are derived from the ADR
  Then each distinct obligation is represented as a separate requirement record
  And each requirement has its own body file
  And each requirement can be linked independently in the project model graph
```

## Verification Expectation

A future Requirement registry validator must check that required requirement header fields exist and that duplicate requirement identifiers are rejected.

A future Requirement body validator or review gate may further check body completeness and canonical sections.
