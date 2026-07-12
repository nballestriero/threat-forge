# MR-0003REQ-0021 — Child Project Validator Reuse Policy

## Intent

Child-project governance must remain aligned with threat-forge by reusing existing validators and shared models rather than copying rules into a new checker family.

## Requirement

The system must require child-project validation tooling to reuse existing threat-forge validators, contracts, controlled registries, and parser behavior wherever practical, introducing only the minimal adapter seams needed for a target child-project root.

## Scope

This requirement applies to future validator implementation and refactoring decisions.

It does not require all validators to become fully generic in a single change, and it does not authorize new dependencies or a TypeScript migration.

## Rules

- The child-project validator must compose existing checks before introducing new rule logic.
- Existing parser behavior for YAML-like governed registries and Markdown bodies must remain the shared behavior unless a future ADR changes it.
- Existing graph node type and SPO predicate registries remain the source of truth for child-project graph validation.
- Existing body-format profiles remain the source of truth for child-project ADR and requirement bodies.
- New code must include JSDoc traceability to the governing MR, ADR, and requirements before implementation.
- No new dependency, transpile step, TypeScript migration, or file rename is allowed by this requirement.

## Acceptance Criteria

```gherkin
Scenario: Child project validator avoids duplicate rule implementation
  Given existing threat-forge Project Model validators
  When child-project validation is implemented
  Then the implementation reuses existing validators or shared validator seams where practical
  And any new logic is limited to root selection, containment, orchestration, and child-project-specific reporting
```

## Verification Expectation

A future code traceability check and review must show that child-project validation code references the governing requirements and does not duplicate complete copies of existing validator rule sets.
