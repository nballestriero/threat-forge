# MR-0002REQ-0001 — Backend application module architecture

## Intent

Backend features need a uniform implementation architecture before product services are introduced.

This requirement defines the reusable backend module shape that future MR-specific services must follow.

## Requirement

The backend application architecture must use Node.js with explicit Zod runtime contracts, OpenAPI HTTP contracts, factory/composition-root assembly, and Controller → Service → Port → Adapter layering.

Controllers must receive already-composed services or controller factories from a composition root. Controllers must not instantiate filesystem, Git, project-model, child-project, database, report, identity, audit, or threat-analysis adapters directly.

Services must implement application use cases and depend on ports. Ports must define logical capabilities needed by the service. Adapters must implement ports for concrete infrastructure, repositories, generated artifacts, filesystems, HTTP clients, or future persistence mechanisms.

## Scope

This requirement applies to future backend modules across all product MR areas.

It covers module boundaries and dependency direction. It does not define concrete source directories, a specific web framework, database choice, or runtime implementation.

## Rules

- Backend runtime code must be implemented in Node.js unless a later ADR explicitly changes the platform.
- Service commands, parsed records, adapter outputs, and other runtime boundaries must use Zod where validation is required.
- HTTP request and response contracts must be represented through OpenAPI.
- Controllers must delegate application behavior to services.
- Controllers must not instantiate concrete adapters directly.
- Services must depend on ports, not concrete adapters.
- Concrete adapters must be wired in a factory or composition root.
- Feature-specific backend modules must belong to their domain MR while preserving the architecture defined by `MR-0002`.

## Acceptance Criteria

```gherkin
Scenario: Backend controller uses composed service
  Given a backend feature exposes an HTTP route
  When its controller handles a request
  Then the controller delegates to an application service
  And the controller does not instantiate concrete adapters directly

Scenario: Service depends on ports
  Given a backend service needs project-model data
  When the service is constructed
  Then it receives a port interface or port-shaped dependency
  And the concrete adapter is selected by a factory or composition root
```

## Verification Expectation

Future runtime architecture checks or code-review gates must fail when controllers instantiate concrete adapters directly or when services bypass declared ports for infrastructure access.
