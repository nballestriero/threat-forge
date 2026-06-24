# MR-0002REQ-0050 — Project Documentation Explorer typed HTTP error mapping

## Intent

The Project Documentation Explorer HTTP boundary must map expected failures to HTTP status codes through governed typed errors rather than by inspecting arbitrary error-message text.

## Requirement

MR-0002 must provide typed Project Documentation Explorer HTTP error mapping for the read-only HTTP boundary.

## Scope

This requirement applies to the Project Documentation Explorer HTTP delivery boundary and its mapping of service/request/access failures to HTTP JSON responses. It does not replace the native HTTP server, introduce a router framework, add OpenAPI runtime validation, introduce dynamic RBAC, add mutation endpoints or implement Base Analysis runtime/storage.

## Rules

- The HTTP boundary must not determine response status codes by regular-expression matching over generic `Error.message` text.
- Expected Project Documentation Explorer failures must use typed errors or stable typed error codes.
- Access-denied failures must map to HTTP `403`.
- Entity-not-found failures must map to HTTP `404`.
- Invalid-request or invalid-query failures must map to HTTP `400`.
- Unexpected exceptions must map fail-closed to HTTP `500`.
- Public error responses must not leak stack traces or filesystem/internal implementation details.
- Public error responses may include stable machine-readable error codes and concise user-facing messages.
- The mapping implementation must remain read-only and must not introduce mutation endpoints.
- The first implementation must not introduce router, error-handling or OpenAPI runtime-validation dependencies.
- Runtime tests must verify typed expected errors and unexpected internal errors.

## Acceptance Criteria

```gherkin
Scenario: Access denial maps through a typed error
  Given the Project Documentation Explorer service reports a typed access-denied failure
  When the HTTP boundary handles the request
  Then the response status is 403
  And the status is not derived from regex matching over the error message

Scenario: Missing entity maps through a typed error
  Given the Project Documentation Explorer service reports a typed entity-not-found failure
  When the HTTP boundary handles the request
  Then the response status is 404
  And the public response contains a stable error code

Scenario: Invalid query maps through a typed error
  Given the Project Documentation Explorer request contains invalid query input
  When the HTTP boundary handles the request
  Then the response status is 400
  And the public response does not expose internal implementation details

Scenario: Unexpected error remains fail-closed
  Given an unexpected exception is raised while handling a request
  When the HTTP boundary maps the error
  Then the response status is 500
  And the public response does not expose stack traces
```

## Verification Expectation

Runtime tests must verify the typed HTTP error mapping behavior for access denied, not found, invalid request and unexpected internal failures. Future code-traceability checks must keep the implementation and tests linked to this requirement through the MR-0002 graph.
