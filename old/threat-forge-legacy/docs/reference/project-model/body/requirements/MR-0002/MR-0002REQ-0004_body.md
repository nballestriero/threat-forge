# MR-0002REQ-0004 — Cross-cutting HTTP middleware boundary

## Intent

Backend HTTP concerns that apply broadly across routes should be handled consistently without duplicating logic in every controller.

This requirement defines when middleware is appropriate and what it must not replace.

## Requirement

The backend architecture must support middleware for cross-cutting HTTP concerns such as request parsing, correlation IDs, request logging, OpenAPI request validation, authentication-context extraction, error handling, and future audit hook integration.

Middleware must not contain feature-specific business logic. Project management, documentation governance, graph queries, threat-analysis logic, reporting logic, and identity semantics must remain in their respective services and domain MR areas.

## Scope

This requirement applies to backend HTTP infrastructure and cross-cutting request/response behavior.

It does not define a specific web framework, final middleware list, authentication protocol, audit-event schema, or feature implementation.

## Rules

- Middleware may handle transport-wide and request-wide concerns.
- Middleware may establish correlation IDs, request context, parsed body, auth context, validation result, logging context, and standardized error handling.
- Middleware must not implement feature-specific use cases.
- Middleware must not parse project-model domain records unless doing so is part of a generic validation boundary explicitly governed by a later ADR.
- Controllers must remain responsible for route-specific delegation to services.
- Services must remain responsible for feature-specific application behavior.

## Acceptance Criteria

```gherkin
Scenario: Middleware handles cross-cutting request context
  Given an HTTP request reaches the backend
  When middleware runs before the controller
  Then it may attach correlation, validation, logging, or auth context
  And the controller can delegate the use case to a service

Scenario: Middleware does not implement feature behavior
  Given a route triggers project-management or threat-analysis behavior
  When the request is processed
  Then middleware does not execute the domain use case
  And the relevant service remains responsible for feature behavior
```

## Verification Expectation

Future backend architecture checks or code reviews must fail when middleware contains feature-specific business logic that belongs in services or domain modules.
