# ADR-0024 — Local UI Test Environment Runner Boundary

## Status

Accepted.

## Context

The Governance Console now has multiple read-only local HTTP surfaces that are useful during study and UI review: the Project Documentation Explorer backend, the Child Project Governance Plan backend and the Vite frontend configured to consume both live endpoints. Running and stopping these manually requires multiple terminals and can leave stale processes behind.

The project needs a governed developer-convenience boundary that starts the local UI test environment consistently without changing the existing verification model.

## Decision

ThreatForge provides a local UI test environment runner exposed through npm scripts:

- `npm run dev:ui-test:start`
- `npm run dev:ui-test:stop`
- `npm run dev:ui-test:status`

The runner may generate child-project governance plan artifacts by invoking the existing governed artifact-generation script, then spawn the existing read-only backend serve commands and the frontend dev server with explicit HTTP data-source environment variables.

The runner stores process metadata and logs under `.threat-forge/state/ui-test-environment/`, which is already ignored as generated platform operational state.

## Scope

In scope:

- starting the local Project Documentation Explorer backend through the existing serve command;
- starting the local Child Project Governance Plan backend through the existing serve command;
- generating child-project governance plan artifacts before starting the governance plan backend;
- starting the local Vite frontend with explicit HTTP data-source environment variables;
- writing PID and log metadata under `.threat-forge/state/ui-test-environment/`;
- reporting local process status;
- stopping only the recorded local processes.

Out of scope:

- production process management;
- replacing `repo:check`;
- mutating governed registries;
- mutating child-project state;
- executing final governance gates;
- persisting gate results;
- running Base Analysis, STRIDE or STRIDE-AI workflows.

## Consequences

### Positive consequences

- UI review becomes repeatable with one start command and one stop command.
- The live HTTP data-source configuration is encoded in a governed tool instead of repeated manually.
- PID and log metadata make stale local processes easier to diagnose.
- The runner remains separate from repository verification and commit/push governance.

### Negative consequences

- The runner must account for platform-specific process spawning behavior, especially npm `.cmd` execution on Windows.
- A failed or killed local process may require inspecting the generated logs under `.threat-forge/state/ui-test-environment/`.
- The tool adds developer convenience surface that must remain clearly non-production.

## Follow-up

1. Add a self-test mode for the runner so `repo:check` can validate command wiring and platform-specific spawn options without starting long-running services.
2. Keep local process metadata under generated ignored state.
3. Reuse the runner when testing future Governance Console live HTTP UI slices.
