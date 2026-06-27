# MR-0000REQ-0002 — Code Traceability to Governed ADR and Requirement Records

## Intent

This starter requirement keeps the demo child project aligned with threat-forge governance.

## Requirement

Implementation code added to the child project must be traceable to governed requirements and supporting ADR decisions.

## Scope

This applies to the minimal demo seed and to resettable demo workspaces copied from the seed.

## Rules

- Preserve the standard Project Model structure.
- Keep changes small and traceable.
- Validate the child project from threat-forge before accepting changes.

## Acceptance Criteria

```gherkin
Scenario: Code Traceability to Governed ADR and Requirement Records
  Given the demo child project is reset from the versioned seed
  When threat-forge validates the child project skeleton
  Then this requirement remains represented by registry, body and graph records
```

## Verification Expectation

The standard child-project Project Model skeleton checker must accept the reset demo workspace.
