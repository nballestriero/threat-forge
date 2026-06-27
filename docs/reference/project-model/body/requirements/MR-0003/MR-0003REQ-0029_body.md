# MR-0003REQ-0029 — Demo Child Project Reset Operation

## Intent

The platform must provide a safe operation for resetting the demo child project to its initial seed-derived state.

## Requirement

The reset operation must delete and recreate only the contained demo workspace, copy the versioned seed into it, register or update the demo child-project operational record, and run the standard child-project skeleton validation profile.

## Scope

This requirement applies to future child-project demo generation, reset, validation, registration and UI workflows.

It does not implement the seed files, reset command, SQLite registration, backend actions, UI buttons, repository cloning, Project Documentation Explorer child-root switching or governed child-project commit/push in this micropasso.

## Rules

- The reset operation must refuse path traversal outside the configured workspace root.
- The reset operation must refuse to delete arbitrary user paths.
- The reset operation must not mutate the versioned seed.
- The reset operation must not commit or push child-project changes.
- The reset operation must report validation status through child-project management operational state.

## Acceptance Criteria

```gherkin
Scenario: Demo Child Project Reset Operation
  Given a user wants to learn or demonstrate child-project governance
  When threat-forge prepares a demo child project
  Then the demo behavior follows this requirement
  And the platform keeps canonical source, generated runtime state and production child-project locations separated
```

## Verification Expectation

Future reset command tests must verify path containment, seed immutability, workspace recreation, registration/update behavior and skeleton validation reporting.
