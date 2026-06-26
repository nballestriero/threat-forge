# MR-0002REQ-0054 — Project Documentation Explorer JSDoc type-check coverage expansion

## Intent

The Project Documentation Explorer must expand its JSDoc static type-checking coverage before new product functionality depends on its reusable interface patterns.

## Requirement

MR-0002 must expand the existing Project Documentation Explorer `tsc --checkJs` pilot to additional selected Explorer source, frontend and test files while keeping the check scoped, deterministic and non-disruptive.

## Scope

This requirement applies only to the Project Documentation Explorer files explicitly selected by the focused check configuration and related negative fixtures.

It does not apply to repository-wide JavaScript, MR-0003 child-project management, MR-0004 Base Analysis runtime/storage, STRIDE overlays, deployment, RBAC, unrelated frontend areas or a TypeScript migration.

## Rules

- The expansion must remain scoped to Project Documentation Explorer files.
- The expansion must use existing JavaScript files with JSDoc type annotations and TypeScript `checkJs`.
- The expansion must not rename `.js`, `.jsx` or `.mjs` files to TypeScript extensions.
- The expansion must not add a build or runtime transpilation step.
- The expansion must not introduce new dependencies.
- The expansion must keep runtime validation at untrusted boundaries separate from static type checking.
- The focused type-check command must remain deterministic and suitable for `repo:check`.
- Selected files must not use broad `@ts-nocheck` suppressions.
- Any local suppression must be narrow, justified and treated as remediation debt.
- The expansion must keep or improve negative fixture coverage for representative static contract drift.
- Code implementation micropassi must update graph relations when additional implementation or verification artifacts become relevant.
- Expansion beyond Project Documentation Explorer requires a separate governed decision.

## Acceptance Criteria

```gherkin
Scenario: Expanded Explorer files are checked statically
  Given additional Project Documentation Explorer files are selected for the focused check
  When the JSDoc static type-check command runs
  Then the selected files are checked with tsc --checkJs
  And the command passes without static type errors

Scenario: The check remains scoped
  Given unrelated repository files exist outside the Explorer selection
  When the focused type-check command runs
  Then unrelated files are not checked by this command

Scenario: Broad suppression is rejected by review policy
  Given a selected file would only pass by adding a broad @ts-nocheck suppression
  When the implementation is reviewed
  Then the suppression is not accepted as the normal solution
  And the file contract is improved or the scope is narrowed instead

Scenario: Runtime boundary validation remains active
  Given data crosses HTTP, CLI/env, filesystem, YAML/JSON, generated snapshot or future child-project boundaries
  When the data is consumed
  Then runtime validation or deterministic boundary checks remain responsible for validating the untrusted input
  And JSDoc type-checking is not treated as a replacement
```

## Verification Expectation

A later implementation micropasso must update the focused configuration, JSDoc annotations and any graph relations needed for the selected expansion set. The governed repository check must continue to pass, including the Project Documentation Explorer JSDoc static type-check command and runtime unit tests.
