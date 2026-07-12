# MR-0003REQ-0028 — Resettable Demo Child Project Workspace

## Intent

The platform must create demo child-project working copies in a generated runtime workspace so users can experiment without dirtying governed platform source files.

## Requirement

The default demo workspace must be `.threat-forge/workspaces/demo-child-project/` or an equivalent configured runtime workspace contained under `.threat-forge/workspaces/`.

## Scope

This requirement applies to future child-project demo generation, reset, validation, registration and UI workflows.

It does not implement the seed files, reset command, SQLite registration, backend actions, UI buttons, repository cloning, Project Documentation Explorer child-root switching or governed child-project commit/push in this micropasso.

## Rules

- Runtime demo workspaces must be ignored by git.
- Runtime demo workspaces must be treated as generated state, not canonical platform source content.
- The workspace must behave like a child project root for external-root validators.
- The workspace path must remain separate from the versioned seed path.
- The workspace may be deleted and recreated by a contained reset operation.

## Acceptance Criteria

```gherkin
Scenario: Resettable Demo Child Project Workspace
  Given a user wants to learn or demonstrate child-project governance
  When threat-forge prepares a demo child project
  Then the demo behavior follows this requirement
  And the platform keeps canonical source, generated runtime state and production child-project locations separated
```

## Verification Expectation

Future reset tests must verify that generating the runtime workspace does not dirty tracked platform source files except intended governed implementation changes.
