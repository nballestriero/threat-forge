# MR-0000REQ-0017 — Frontend build gate in governed repository checks

## Intent

The repository already contains a React/Vite Governance Console slice. A commit that breaks Vite build, JSX imports, the frontend snapshot exporter or generated frontend assets must fail before it reaches `origin/master`.

## Requirement

The governed repository check runner must include a frontend build gate that executes the canonical frontend build command.

## Scope

This requirement governs local `repo:check` and `repo:commit-push` behavior. It does not define CI, frontend test coverage, linting or production deployment.

## Rules

- The gate must run the canonical frontend build command from `package.json`.
- The gate must fail the governed runner when the build command exits non-zero.
- The build must include any required Project Documentation Explorer snapshot generation step.
- The gate must be listed in the governed runner output so failures are immediately visible.
- The gate must remain small enough to run routinely before commits.

## Acceptance Criteria

```gherkin
Scenario: Frontend build regression fails the governed runner
  Given a repository change breaks the Governance Console frontend build
  When a user runs npm run repo:check
  Then the frontend build gate fails
  And the repository check does not report success
```

## Verification Expectation

The implementation must add the frontend build command to the governed runner and verify that `npm run repo:check` fails if the build fails.
