# MR-0000REQ-0015 — Explicit confirmation for protected record modifications and deletions

## Intent

Legitimate non-append changes must be possible, but they must be deliberate and visible because they can affect historical traceability.

## Requirement

The system must require explicit confirmation before accepting modifications or deletions of protected project-model records.

## Scope

This requirement defines the confirmation obligation only. It does not define the final confirmation mechanism and does not implement the guard in this micropasso.

## Rules

- Unconfirmed modification of a protected existing record must be treated as unsafe.
- Unconfirmed deletion of a protected existing record must be treated as unsafe.
- Confirmation must identify the affected record and the reason for the non-append change.
- Confirmation must be governed, reviewable, and suitable for deterministic validation.
- The future mechanism may use a change-intent file, command flag, registry field, or dedicated change record if it remains traceable.

## Acceptance Criteria

```gherkin
Scenario: Protected record deletion requires confirmation
  Given a protected registry contains a stable requirement record
  When a change deletes that requirement record
  And no explicit confirmation is provided
  Then the append-first guard fails

Scenario: Protected record modification is intentionally confirmed
  Given a protected graph relation exists in the baseline
  When a change modifies or removes that relation
  And a governed confirmation mechanism explicitly declares the change intentional
  Then the append-first guard may accept the non-append change according to its rules
```

## Verification Expectation

A future validator must include negative coverage for unconfirmed deletion and unconfirmed modification of protected records.
