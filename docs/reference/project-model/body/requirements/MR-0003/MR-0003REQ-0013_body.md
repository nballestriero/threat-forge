# MR-0003REQ-0013 — Platform-Only Child Project Navigation

## Intent

The reusable console shell must not expose Child Projects navigation inside child project workspaces.

## Requirement

The system must make Child Projects navigation available only for the threat-forge platform workspace and omit it from governed child project workspaces.

## Scope

This requirement applies to future navigation capability modeling and console rendering.

It does not implement frontend navigation or backend capabilities in this micropasso.

## Rules

- Platform workspace navigation may include Child Projects when authorized.
- Child project workspace navigation must omit Child Projects.
- Navigation visibility must be driven by backend capabilities, not hardcoded frontend workspace checks.
- Nested child-project creation and management remain out of scope.
- The same reusable console shell may be used by platform and child workspaces with different capabilities.

## Acceptance Criteria

```gherkin
Scenario: Child project console omits child-project navigation
  Given the current workspace is a governed child project
  When the console navigation is rendered
  Then Child Projects navigation is unavailable
```

## Verification Expectation

Future capability and navigation tests must verify platform-only Child Projects navigation and child-project omission through backend capability responses.
