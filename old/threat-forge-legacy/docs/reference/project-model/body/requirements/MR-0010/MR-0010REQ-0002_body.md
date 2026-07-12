# MR-0010REQ-0002 — Study-Oriented Learning Paths for Students and Developers

## Intent

Threat-forge must be understandable to a student, developer or maintainer who needs to learn the full system before contributing code, diagrams, documentation or thesis material.

## Requirement

The manual must provide guided learning paths that explain the project from the documentation model through graph semantics, deterministic gates, code traceability, UI exploration, child-project governance and the future threat-analysis roadmap.

## Scope

This requirement governs learning-path semantics. It does not implement a learning UI, course system, assessment system or thesis text generator.

## Rules

- The manual must include at least a student path, a developer path and a maintainer/reviewer path.
- Learning paths must explain which chapters to read first and which canonical records support each topic.
- The student path must support detailed study of the project for future thesis work.
- The developer path must teach the ADR → REQ → graph → code → gate workflow before code modification.
- Learning paths must avoid duplicating canonical facts when a link to source records is sufficient.

## Acceptance Criteria

```gherkin
Scenario: Developer learns how to add coherent code
  Given a developer has not worked on threat-forge before
  When the developer follows the manual developer path
  Then the developer learns to inspect relevant MR, ADR, requirements and graph relations before coding
  And the developer learns that code changes require JSDoc traceability and deterministic gate verification
```

## Verification Expectation

Future validation should check that learning routes exist and reference chapters and governed project-model records.
