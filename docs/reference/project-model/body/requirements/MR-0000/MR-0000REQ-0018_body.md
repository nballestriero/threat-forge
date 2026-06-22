# MR-0000REQ-0018 — Minimal unit test gate for stable runtime logic

## Intent

Threat-forge has stable pure and service-level logic for Project Documentation Explorer filtering, query normalization and detail view-model generation. These behaviors should not rely only on manual smoke tests.

## Requirement

The repository must provide a minimal unit test gate for stable runtime logic, starting with the Project Documentation Explorer service and filtering behavior.

## Scope

This requirement governs the first lightweight unit test gate. It does not require broad test coverage, component testing, browser testing, Playwright, Vitest adoption or full CI integration in this micropasso.

## Rules

- Prefer Node.js built-in `node:test` for the first backend/runtime tests to avoid unnecessary dependencies.
- Start with stable logic that has already been exercised manually, such as query normalization and item filtering.
- The test command must be deterministic and callable from the governed runner once implemented.
- Tests must not read or mutate canonical project-model files unless explicitly designed as integration tests.
- Test files must declare implemented requirements through the governed code traceability pattern once the relevant source roots are covered.

## Acceptance Criteria

```gherkin
Scenario: Runtime query normalization regression fails tests
  Given the Project Documentation Explorer query normalizer no longer handles comma-separated MR values
  When the unit test gate runs
  Then the test command fails with a focused diagnostic
```

## Verification Expectation

The first implementation should add a small `node:test` file for Project Documentation Explorer logic and a canonical npm script that can later be added to `repo:check`.
