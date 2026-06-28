# MR-0002REQ-0059 — Local UI Test Environment Start Command

## Intent

Provide a governed local command that starts the read-only UI test environment used to review the Governance Console with live HTTP data sources.

The command is intended for local developer and study workflows where Project Documentation Explorer, Child Project Governance Plan data and the frontend must run together without manually coordinating multiple terminals.

## Requirement

ThreatForge MUST expose `npm run dev:ui-test:start` as the canonical local command for starting the UI test environment.

The command MUST generate child-project governance plan artifacts, start the Project Documentation Explorer backend, start the Child Project Governance Plan backend and start the frontend dev server with explicit HTTP live data-source environment variables.

## Scope

In scope:

- exposing the command as `npm run dev:ui-test:start`;
- generating child-project governance plan artifacts through the existing artifact-generation npm script before starting the governance plan backend;
- starting the Project Documentation Explorer backend through the existing serve script;
- starting the Child Project Governance Plan backend through the existing serve script;
- starting the frontend dev server with explicit HTTP live data-source environment variables for both backends;
- writing PID and log metadata under `.threat-forge/state/ui-test-environment/`;
- failing closed when a previous recorded UI test environment still appears to be running.

Out of scope:

- replacing `repo:check`;
- running production process management;
- mutating governed registries;
- mutating child-project state;
- executing final governance gates;
- persisting gate results;
- committing or pushing repository changes.

## Rules

1. The start command MUST invoke existing governed npm scripts instead of duplicating backend or artifact-generation logic.
2. The frontend process MUST receive HTTP live data-source environment variables for both the Project Documentation Explorer and Child Project Governance Plan backends.
3. Process metadata and logs MUST be written only under generated operational state.
4. The command MUST NOT start a second environment when the PID registry indicates that a previous environment is still running.
5. Windows npm `.cmd` invocation MUST be handled through shell execution so setup commands and long-running services start reliably.
6. Non-Windows process spawning behavior MUST remain compatible with detached local service processes.

## Acceptance Criteria

- Running `npm run dev:ui-test:start` generates governance gate plan artifacts before starting the governance plan backend.
- The command records started process identifiers and log paths under `.threat-forge/state/ui-test-environment/`.
- The frontend is started with live HTTP configuration for both local backend services.
- A second start attempt fails when recorded processes are still alive.
- The command remains a local developer-convenience tool and does not commit, push or mutate governed registries.

## Verification Expectation

Run `npm run repo:check`.

The repository checks must include graph format validation, code traceability validation, frontend build and runtime tests. Manual smoke testing may also run `npm run dev:ui-test:start`, confirm the expected processes are recorded, and then run `npm run dev:ui-test:stop`.
