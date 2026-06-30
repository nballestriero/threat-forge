# MR-0003REQ-0071 — Local UI test child management API wiring

## Intent

Local UI review must exercise the same project-scoped child documentation path that real child projects will use.

## Requirement

The local UI test environment must start the Child Project Management API and configure the Vite frontend to use it in HTTP mode. The demo child project must be registered before the frontend opens project-scoped child documentation routes.

The local UI test wiring may keep the dedicated demo child Project Documentation Explorer service for compatibility with existing governed local-review requirements, but the primary frontend child document path must use the Child Project Management API base URL.

## Scope

This requirement applies to `npm run dev:ui-test:start`, generated UI test environment endpoint metadata and deterministic service wiring tests.

It does not require production process management, child project mutation outside demo registration, removal of the demo child documentation service, write APIs or remote repository checkout support.

## Rules

- The UI test runner must register the demo child project before starting long-running services.
- The UI test runner must start the Child Project Management API.
- The frontend service must receive `VITE_CHILD_PROJECT_MANAGEMENT_SOURCE=http`.
- The frontend service must receive `VITE_CHILD_PROJECT_MANAGEMENT_HTTP_BASE_URL` pointing at the Child Project Management API endpoint.
- The endpoint registry must record the Child Project Management API endpoint.

## Acceptance Criteria

```gherkin
Scenario: Local UI test environment starts project-scoped API source
  Given the developer runs npm run dev:ui-test:start
  When the UI test environment starts
  Then the demo child project is registered
  And the Child Project Management API is running
  And the frontend is configured to read project-scoped child documents through that API
```

## Verification Expectation

Runtime tests must verify the child project management service wiring and frontend environment variables. The governed repository check must continue to pass.
