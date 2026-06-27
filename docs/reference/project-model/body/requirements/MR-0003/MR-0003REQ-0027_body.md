# MR-0003REQ-0027 — Child Project Demo Seed Template

## Intent

The platform must provide a versioned minimal child-project demo seed that can be used to generate repeatable tutorial and presentation workspaces.

## Requirement

The seed must live under `examples/child-projects/minimal-governed-child-project/` and must represent example/template content, not a live managed child-project working copy.

## Scope

This requirement applies to future child-project demo generation, reset, validation, registration and UI workflows.

It does not implement the seed files, reset command, SQLite registration, backend actions, UI buttons, repository cloning, Project Documentation Explorer child-root switching or governed child-project commit/push in this micropasso.

## Rules

- The seed must use the standard child-project Project Model structure established for MR/ADR/REQ/body/graph reuse.
- The seed may include minimal Diátaxis learning documents needed for onboarding.
- The seed must be changed only through governed threat-forge commits.
- The seed must not be mutated by demo runtime operations.
- The seed must not be stored in SQLite as the live child project instance.

## Acceptance Criteria

```gherkin
Scenario: Child Project Demo Seed Template
  Given a user wants to learn or demonstrate child-project governance
  When threat-forge prepares a demo child project
  Then the demo behavior follows this requirement
  And the platform keeps canonical source, generated runtime state and production child-project locations separated
```

## Verification Expectation

Future generator tests must verify that the versioned seed can produce a child project accepted by the standard child-project Project Model skeleton validator.
