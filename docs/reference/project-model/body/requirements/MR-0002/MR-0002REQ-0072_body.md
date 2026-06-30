# MR-0002REQ-0072 — Local UI Test Frontend Child Documentation Configuration

## Intent

Ensure the local frontend receives an explicit child documentation source when the UI test environment starts.

The requirement prevents the local demo from relying on a missing child source or an accidental platform endpoint.

## Requirement

ThreatForge MUST configure the frontend process started by `npm run dev:ui-test:start` with a child Project Documentation Explorer HTTP base URL that points at the dedicated demo child documentation service.

The frontend configuration MUST keep the platform Project Documentation Explorer base URL separate from the child Project Documentation Explorer base URL.

## Scope

In scope:

- frontend environment variables supplied by the local UI test runner;
- explicit child Project Documentation Explorer HTTP source configuration;
- separation between platform and demo child documentation endpoints;
- generated PID registry endpoint metadata;
- runtime tests for frontend environment wiring.

Out of scope:

- browser-side endpoint discovery;
- production per-child source resolution;
- mutating child-project registration records;
- changing platform snapshot fallback policy;
- changing the child-project no-fallback rule when the child source is missing.

## Rules

1. The frontend process MUST receive `VITE_CHILD_PROJECT_DOCUMENTATION_EXPLORER_HTTP_BASE_URL` during local UI test startup.
2. The child documentation base URL MUST NOT equal the platform Project Documentation Explorer base URL.
3. The platform Project Documentation Explorer base URL MUST remain configured for platform document views.
4. The child documentation source MUST remain explicit; no browser code may infer it from the platform source.
5. The local UI test runner MUST expose the configured child endpoint in generated status metadata.

## Acceptance Criteria

- The frontend service definition includes a child documentation HTTP base URL.
- The child documentation HTTP base URL points at the demo child documentation service endpoint.
- Platform and child documentation endpoints remain distinct in service wiring and PID metadata.
- Runtime tests verify the frontend environment variables for platform documentation, child documentation and governance plan sources.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

Manual UI review should start the local UI test environment, open Demo Child Project documents and confirm the no-fallback error is replaced by child-project records only when the dedicated child documentation service is running.
