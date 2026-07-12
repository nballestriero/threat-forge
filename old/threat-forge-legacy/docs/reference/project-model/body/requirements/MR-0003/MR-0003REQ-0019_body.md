# MR-0003REQ-0019 — Reusable Project Model Validator Boundary

## Intent

Child projects must be validated with the same Project Model rules used by threat-forge, not by duplicating or weakening those rules in a child-project-specific checker.

## Requirement

The system must define a reusable Project Model validation boundary that can validate a target repository root and project-model root using the same governance models and validation rules used by threat-forge wherever practical.

## Scope

This requirement applies to future child-project validation tooling and validator refactoring seams.

It does not implement the validator, skeleton generator, UI, RBAC runtime, repository adapter, or threat-analysis gate in this micropasso.

## Rules

- Child-project validation must treat `docs/reference/project-model/` as the canonical project-model root by default.
- Validation logic for registries, governed bodies, body formats, graph records, controlled taxonomy records, append-first behavior, orphan body files, and traceability-compatible records must be shared with threat-forge validators where practical.
- New child-project tooling must prefer wrapper composition, target-root parameters, or shared library extraction over copied validation logic.
- Divergence from the platform validation model requires a future governed ADR and requirement.
- Validator outputs must identify the target root being validated so platform and child-project reports remain distinguishable.

## Acceptance Criteria

```gherkin
Scenario: Child project validation reuses Project Model rules
  Given a governed child project repository
  When the child project Project Model validator runs
  Then it validates the repository through the same Project Model rule set used by threat-forge wherever practical
  And it does not rely on a separate child-project documentation model
```

## Verification Expectation

A future tooling check must demonstrate that the child-project validator delegates to, wraps, or shares the existing Project Model validation rules instead of reimplementing a parallel rule set.
