# MR-0001REQ-0025 — Requirement governance registry

## Intent

Requirement registries need a governed source for controlled lifecycle statuses, requirement types, and specialized requirement suffix families.

ADR status values are already governed through the ADR governance registry. Requirement status values and specialized requirement family suffixes need the same kind of controlled source before a deterministic Requirement registry validator can enforce them.

## Requirement

The project model must provide a governed Requirement governance registry.

The registry must define controlled Requirement lifecycle statuses, controlled Requirement types, specialized Requirement suffix families, and Requirement registry field rules needed by future deterministic validators.

## Scope

This requirement applies to Requirement registry metadata governance under the project model.

It covers lifecycle statuses such as proposed, approved, implemented, superseded, rejected, and deprecated. It also covers the functional and specialized Requirement types and the initial specialized suffix families SEC, PERF, GOV, TRC, QLT, OPS, UX, and COMP.

It does not implement the Requirement registry validator, change existing legacy Requirement records, change ADR lifecycle status governance, or introduce new graph predicates.

## Rules

- The Requirement governance registry must be a governed YAML registry under the project-model registers tree.
- Every controlled status, type, and specialized family entry must have a stable identifier.
- Every controlled status, type, and specialized family entry must include a purpose or function and a description.
- Requirement lifecycle statuses must distinguish non-binding proposed requirements from binding approved requirements.
- Requirement lifecycle statuses must distinguish implemented requirements from approved-but-not-yet-implemented requirements.
- Superseded, rejected, and deprecated requirements must remain historically traceable but must not silently govern new work.
- Specialized requirement families must use stable uppercase suffixes that can be derived from specialized Requirement identifiers.
- The registry must explicitly describe transitional handling for existing legacy Requirement records that do not yet declare `type`.
- Future validators must consume this registry instead of hardcoding Requirement status, type, or specialized suffix values.

## Acceptance Criteria

```gherkin
Scenario: Requirement governance registry declares controlled Requirement values
  Given the project model contains Requirement registry records
  When the Requirement governance registry is inspected
  Then it defines controlled lifecycle statuses
  And it defines controlled Requirement types
  And it defines controlled specialized Requirement suffix families
  And each controlled value has a stable id, function, and description
```

## Verification Expectation

A future deterministic gate must validate the Requirement governance registry and then use it to validate Requirement registry fields, lifecycle statuses, requirement types, and specialized suffix families.
