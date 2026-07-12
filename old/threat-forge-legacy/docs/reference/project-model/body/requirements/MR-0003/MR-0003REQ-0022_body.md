# MR-0003REQ-0022 — Child Project Standard Skeleton Validation Profile

## Intent

The first child-project validator must define a small but strict profile that confirms the child repository is a valid standard Project Model skeleton before generation, UI, or lifecycle reporting depends on it.

## Requirement

The system must define a child-project standard skeleton validation profile that checks the presence and validity of the minimal Project Model directories, registries, governed bodies, graph records, body-format declarations, and taxonomy controls required for a governed child project.

## Scope

This requirement applies to the first child-project standard Project Model skeleton validator.

It does not validate full threat analysis records, execute STRIDE or STRIDE-AI, create child projects, or generate implementation code.

## Rules

- The validation profile must require `docs/reference/project-model/` and `WORKING_PLAN.md`.
- The validation profile must require standard `registers/requirements`, `registers/decisions`, `registers/graph`, and governed `body/requirements` and `body/decisions` locations.
- The validation profile must validate macro-requirement, ADR, requirement, graph, body-format, body, orphan-body, and controlled taxonomy structures using shared threat-forge rules where practical.
- The validation profile must preserve document-first and code-traceability readiness without requiring child-project application code to exist in the initial skeleton.
- The validation profile must reserve future pre-code threat-analysis validation without implementing Base Analysis, STRIDE, or STRIDE-AI execution.
- The validation profile must produce deterministic pass/fail output suitable for later Governance Console lifecycle status reporting.

## Acceptance Criteria

```gherkin
Scenario: Minimal child project skeleton is valid
  Given a child repository containing the standard Project Model skeleton
  When the skeleton validation profile runs
  Then required directories, registries, governed bodies, graph records, body-format declarations, and taxonomy controls are validated
  And no child-project-specific manifest is required
```

## Verification Expectation

A future validator must pass on a minimal standard Project Model skeleton and fail on skeletons missing required roots, required registries, governed body records, graph records, or controlled taxonomy structures.
