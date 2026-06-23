# MR-0000REQ-0022 — Minimal governed CI repository check workflow

## Intent

Threat-forge needs a remote verification backstop after the local stabilization gates have been consolidated. The CI entrypoint must reinforce the governed runner instead of becoming an independent list of checks.

## Requirement

The repository must provide a minimal GitHub Actions workflow that installs dependencies from the lockfile and executes the governed repository check.

## Scope

This requirement governs the first CI workflow for the root threat-forge repository. It covers push and pull-request verification for `master`. It does not govern deployment, release publication, tag creation, audit checks, license checks, secrets scanning, OpenAPI validation, matrix builds or child-project CI.

## Rules

- The workflow must run on pushes and pull requests targeting `master`.
- The workflow must use `npm ci` to install dependencies from `package-lock.json`.
- The workflow must run `npm run repo:check` as the canonical verification command.
- The workflow must not duplicate the individual internal gate commands already orchestrated by the governed runner.
- The workflow must not commit, push, tag, deploy, publish artifacts or mutate governed project-model files.
- The workflow file must be linked in the project graph before the requirement can be considered implemented.

## Acceptance Criteria

```gherkin
Scenario: CI uses the governed repository check
  Given a push or pull request targets master
  When the GitHub Actions workflow runs
  Then it installs dependencies with npm ci
  And it runs npm run repo:check
  And it does not duplicate the internal governed gate list
```

## Verification Expectation

Verification should include the workflow file itself, graph traceability from this requirement to the workflow artifact and the existing governed runner output as canonical evidence.
