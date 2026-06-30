# MR-0002REQ-0071 — Local UI Test Demo Child Documentation Service

## Intent

Provide a governed local child-project documentation source for manual UI review without using ThreatForge platform documents as a fallback.

The requirement lets the Demo Child Project document view show real child Project Model records during local UI test sessions.

## Requirement

ThreatForge MUST start a dedicated demo child-project Project Documentation Explorer HTTP service as part of `npm run dev:ui-test:start`.

The demo child documentation service MUST read from the generated demo child-project workspace and MUST listen on a port distinct from the platform Project Documentation Explorer service.

## Scope

In scope:

- local UI test environment startup;
- generated demo child-project workspace preparation;
- demo child Project Documentation Explorer HTTP service startup;
- endpoint metadata recorded in the UI test environment PID registry;
- deterministic tests for local service wiring.

Out of scope:

- production process management;
- resolving arbitrary child projects from persistent storage;
- writing child Project Model records;
- changing platform Project Documentation Explorer serving behavior;
- changing child-project governance gate planning.

## Rules

1. The demo child documentation service MUST use a different endpoint from the platform documentation service.
2. The demo child documentation service MUST be read-only.
3. Startup MUST prepare the generated demo child-project workspace before starting the service.
4. Process metadata MUST record the demo child documentation service name and endpoint.
5. The service MUST remain local developer convenience and MUST NOT replace `repo:check`.

## Acceptance Criteria

- `npm run dev:ui-test:start` includes a recorded `demo-child-project-documentation-explorer` service.
- The demo child Project Documentation Explorer service uses a dedicated local endpoint distinct from `http://127.0.0.1:4174`.
- `npm run dev:ui-test:status` reports the recorded demo child documentation process through the existing PID registry.
- Runtime tests verify that local UI test service wiring includes the separate demo child documentation source.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

Manual UI review may run `npm run dev:ui-test:start`, select Demo Child Project, open Documents and confirm the view reads child Project Model records instead of platform records.
