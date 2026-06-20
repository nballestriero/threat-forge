# MR-0007REQ-0001 — Authenticated user session boundary

## Intent

The Governance Console needs a governed authenticated session model before protected routes and user-aware navigation can be implemented.

This requirement defines the minimum session boundary without choosing or implementing a concrete identity provider.

## Requirement

The future identity/access model must expose an authenticated user session boundary to the application.

A session view must identify the authenticated user, session state, selected or available workspace context, and enough access metadata for the shell to decide whether protected application areas can be entered.

The session boundary must be independent from concrete provider token structures so the system can support local/development authentication and later external providers through governed adapters.

## Scope

This requirement applies to future session contracts and authentication boundary design.

It does not implement login, logout, token handling, password storage, OAuth, OIDC, middleware, databases, or React screens.

## Rules

- Session state must be explicit.
- The application must not treat provider-specific token payloads as the frontend contract.
- Session information must be normalized before it reaches React components.
- Backend controllers must not instantiate concrete identity provider adapters.
- Concrete provider integration must use a governed port/adapter boundary.

## Acceptance Criteria

```gherkin
Scenario: Application receives normalized session state
  Given a user is authenticated
  When the frontend requests session state
  Then the response identifies the user and current workspace context
  And the response does not expose provider-specific token structures as the application contract

Scenario: Authentication provider can change behind a port
  Given identity providers are implemented behind a port
  When the runtime provider changes from local development auth to an external provider
  Then controllers and React components do not instantiate or depend on the concrete provider adapter
```

## Verification Expectation

Future OpenAPI, backend, frontend, and code-traceability tests must verify that session state is normalized and provider details remain behind the identity provider port.
