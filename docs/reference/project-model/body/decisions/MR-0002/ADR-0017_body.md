# ADR-0017 — Project Documentation Explorer typed HTTP error boundary

## Status

Accepted.

## Context

The Project Documentation Explorer HTTP server currently exposes a deliberately small read-only API and is already consumed by the frontend through an explicit live HTTP data-source mode. The server must remain fail-closed and predictable as the HTTP surface grows.

A code review identified that mapping HTTP status codes by inspecting generic error-message text is fragile. Message-based matching can accidentally classify unrelated internal failures as expected client errors when an error message happens to contain terms such as `not found`, `denied` or `invalid`. That weakens API reliability, makes future refactoring risky and can hide real defects behind misleading HTTP responses.

The Project Documentation Explorer needs a governed error taxonomy before the HTTP boundary is expanded further. This decision must remain dependency-free and must not introduce a router framework, OpenAPI validation library, dynamic RBAC or any mutation behavior.

## Decision

MR-0002 shall define typed HTTP error mapping for the Project Documentation Explorer HTTP boundary.

The HTTP boundary must map expected domain, access and request failures to HTTP status codes through explicit typed errors or typed error codes, not by regular-expression matching over arbitrary error-message strings.

The first governed error categories are:

- access denied, mapped to `403`;
- entity not found, mapped to `404`;
- invalid request or invalid query input, mapped to `400`;
- internal error, mapped to `500`.

Unexpected exceptions must remain fail-closed and map to `500` without leaking stack traces or implementation details in the public JSON response. Expected typed errors may expose stable machine-readable codes and concise user-facing messages.

The mapping layer belongs at the HTTP delivery boundary. Domain/service code may throw or return typed Project Documentation Explorer errors, but the route handler is responsible for converting them into HTTP response envelopes. Generic JavaScript `Error.message` text must not be treated as an authority for status-code selection.

The first implementation should stay intentionally small: no third-party error library, no router replacement, no OpenAPI client generation and no dynamic RBAC.

## Scope

In scope:

- defining typed Project Documentation Explorer error categories;
- replacing message-regex HTTP status mapping with typed error/code mapping;
- preserving fail-closed behavior for unexpected exceptions;
- preserving read-only HTTP semantics;
- adding runtime tests for expected typed errors and unexpected internal errors.

Out of scope:

- replacing the native Node.js HTTP server or custom route matcher;
- introducing Hono, Fastify, find-my-way or another router dependency;
- introducing OpenAPI runtime validation;
- introducing dynamic RBAC or MR-0007 identity/session behavior;
- changing the frontend data-source semantics;
- adding mutation endpoints;
- implementing Base Analysis, STRIDE or STRIDE-AI runtime/storage.

## Consequences

### Positive consequences

* HTTP responses become deterministic and independent from incidental error-message wording.
* Unexpected internal failures remain fail-closed and are less likely to be misclassified as normal client errors.
* Future Project Documentation Explorer backend refactors can change messages without changing HTTP semantics.
* The first fix improves robustness without adding supply-chain dependencies.

### Negative consequences

* The server needs a small internal error taxonomy and tests for the mapping behavior.
* Existing code that throws generic errors for expected cases may need a narrow adaptation layer.
* The typed taxonomy may need extension when the API grows beyond the current read-only Explorer surface.

## Follow-up

1. Add typed Project Documentation Explorer HTTP error helpers or classes in the backend slice.
2. Replace status-code mapping based on regular expressions over error messages.
3. Add runtime tests for `403`, `404`, `400` and unexpected `500` mapping.
4. Keep the server read-only and dependency-free in the first implementation.
