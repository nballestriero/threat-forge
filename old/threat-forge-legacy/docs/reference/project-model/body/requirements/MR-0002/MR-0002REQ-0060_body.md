# MR-0002REQ-0060 — Local UI Test Environment Stop and Status Commands

## Intent

Provide governed local commands that report and stop the UI test environment started by the local runner.

The commands are intended to make local UI testing safe by showing which recorded processes are alive and by terminating only the processes that the runner started.

## Requirement

ThreatForge MUST expose `npm run dev:ui-test:status` and `npm run dev:ui-test:stop` as the canonical local commands for inspecting and stopping the UI test environment.

The commands MUST use the runner PID registry as their source of authority and MUST avoid terminating unrelated user processes.

## Scope

In scope:

- exposing the status command as `npm run dev:ui-test:status`;
- exposing the stop command as `npm run dev:ui-test:stop`;
- reporting recorded process identifiers, log paths and liveness state;
- terminating only recorded spawned processes;
- removing the PID registry file after stop;
- safely handling the case where no PID registry file exists.

Out of scope:

- terminating unrelated user processes;
- replacing manual operating-system process tools for processes not started by the runner;
- replacing `repo:check`;
- mutating governed registries;
- mutating child-project state;
- executing final governance gates;
- persisting gate results;
- committing or pushing repository changes.

## Rules

1. The status command MUST read the runner PID registry and report whether each recorded process appears alive.
2. The stop command MUST use the recorded PID registry as its source of authority.
3. The stop command MUST request termination in reverse startup order so the frontend is stopped before backend services.
4. The stop command MUST be safe when the PID registry file is absent.
5. Windows termination MUST use the operating-system process tree termination mechanism for recorded PIDs.
6. Non-Windows termination MUST target the detached process group when available and fall back to the recorded PID.

## Acceptance Criteria

- Running `npm run dev:ui-test:status` without a PID registry reports that no environment is registered as running.
- Running `npm run dev:ui-test:status` with a PID registry reports each recorded process name, PID, liveness state and log path.
- Running `npm run dev:ui-test:stop` terminates only recorded processes.
- Running `npm run dev:ui-test:stop` removes the PID registry file.
- Running `npm run dev:ui-test:stop` is safe when no PID registry file exists.

## Verification Expectation

Run `npm run repo:check`.

The repository checks must include graph format validation, code traceability validation, frontend build and runtime tests. Manual smoke testing may also run `npm run dev:ui-test:status`, `npm run dev:ui-test:start`, `npm run dev:ui-test:status`, and `npm run dev:ui-test:stop`.
