# MR-0002REQ-0053 — Project Documentation Explorer JSDoc static type-checking pilot

## Intent

The Project Documentation Explorer must gain a narrow static safety net for JavaScript contracts without forcing a repository-wide TypeScript migration or weakening runtime validation at external boundaries.

## Requirement

MR-0002 must provide a governed pilot for checking selected Project Documentation Explorer JavaScript files with JSDoc-driven TypeScript `checkJs`.

## Scope

This requirement applies to the Project Documentation Explorer source and test files selected by the pilot configuration.

It does not apply to unrelated repository areas, Base Analysis runtime/storage, STRIDE/STRIDE-AI overlays, deployment, RBAC, child-project scaffolding, frontend build migration to TypeScript, or repository-wide JavaScript type-checking.

## Rules

- The pilot must be scoped to Project Documentation Explorer files.
- The pilot must use JavaScript files with JSDoc type annotations; it must not require renaming files to TypeScript.
- The pilot must use the existing TypeScript development dependency and must not introduce a new dependency.
- The first implementation must use a focused configuration or script rather than a repository-wide type-check.
- The selected command must fail when scoped files contain static type errors detectable by `tsc --checkJs`.
- The pilot must not replace runtime validation for HTTP, CLI/env, filesystem, YAML/JSON, generated snapshot or OpenAPI boundaries.
- JSDoc governance tags must remain aligned with governed requirements, decisions and graph relations.
- JSDoc type tags must be kept aligned with the implementation signatures they describe.
- The pilot must avoid duplicating ADR or Requirement body text inside source comments; comments should cite governed IDs and describe local technical contracts only.
- Any future expansion beyond the initial selected file set requires an explicit governed decision or requirement update.

## Acceptance Criteria

```gherkin
Scenario: Scoped static check passes for the Project Documentation Explorer pilot
  Given the Project Documentation Explorer JSDoc static-check pilot is configured
  When the pilot type-check command runs
  Then only the selected pilot files are checked
  And the command passes with no static type errors

Scenario: Wrong internal field names are rejected
  Given a selected pilot file references a property not declared by the relevant JSDoc type
  When the pilot type-check command runs
  Then the command fails

Scenario: Source-port shape drift is rejected
  Given a selected source-port decorator or test fixture omits a required source-port method
  When the pilot type-check command runs
  Then the command fails

Scenario: Runtime boundary validation remains separate
  Given data is received from HTTP, CLI/env, filesystem, YAML/JSON or generated snapshots
  When the data crosses the runtime boundary
  Then existing runtime validation or deterministic checks remain responsible for validating the untrusted data
  And JSDoc type-checking is not treated as a replacement for runtime validation
```

## Verification Expectation

A later implementation micropasso must add a deterministic pilot command, focused configuration and graph relations for the implementation and verification artifacts. The governed repository check may include the pilot only after the focused command passes deterministically on the selected files. Runtime tests and existing OpenAPI/Zod/deterministic validation gates must continue to pass.
