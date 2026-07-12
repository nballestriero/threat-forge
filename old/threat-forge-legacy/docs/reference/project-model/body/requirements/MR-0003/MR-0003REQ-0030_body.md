# MR-0003REQ-0030 — Production Child Project External Workspace Policy

## Intent

The platform must keep production child projects outside the threat-forge governed source tree while allowing generated demo/runtime workspaces for learning and testing.

## Requirement

Production child projects must be represented by configured external local paths or independent Git repositories. The internal `.threat-forge/workspaces/` area must be reserved for generated demo/runtime/checkout state and must not redefine production child-project ownership.

## Scope

This requirement applies to future child-project demo generation, reset, validation, registration and UI workflows.

It does not implement the seed files, reset command, SQLite registration, backend actions, UI buttons, repository cloning, Project Documentation Explorer child-root switching or governed child-project commit/push in this micropasso.

## Rules

- Production child-project records must store repository/location metadata through the child-project management storage port.
- The platform must not treat `examples/` seed content as a production child-project instance.
- The platform must not require production child projects to live inside the threat-forge repository.
- Future UI labels must distinguish demo/generated workspaces from production child projects.
- Future governed child-project commit/push operations must target the managed child project, not the versioned demo seed.

## Acceptance Criteria

```gherkin
Scenario: Production Child Project External Workspace Policy
  Given a user wants to learn or demonstrate child-project governance
  When threat-forge prepares a demo child project
  Then the demo behavior follows this requirement
  And the platform keeps canonical source, generated runtime state and production child-project locations separated
```

## Verification Expectation

Future backend and UI tests must verify that demo/generated workspaces and production child-project locations are represented distinctly in operational state and capability-driven actions.
