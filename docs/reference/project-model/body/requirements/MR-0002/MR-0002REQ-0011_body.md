# MR-0002REQ-0011 — Backend feature source layout and composition boundary

## Intent

The first runtime slice needs a predictable backend source layout before controller, service, port, adapter, or composition code is created.

This requirement preserves the reusable architecture defined by `MR-0002` and prevents controllers from directly owning infrastructure decisions.

## Requirement

Future backend source for the Project Model Explorer must be organized as a feature module that preserves Controller → Service → Port → Adapter layering and composition-root wiring.

The preferred future layout is:

```text
backend/src/modules/project-model-explorer/
  projectModelExplorer.controller.ts
  projectModelExplorer.service.ts
  contracts/
  ports/
  adapters/
  composition/
```

The exact filenames may evolve, but the dependency direction must not change: controllers delegate to services, services depend on ports and runtime contracts, concrete adapters implement ports, and factories or composition roots wire concrete dependencies.

## Scope

This requirement applies to the future Project Model Explorer backend module and establishes a reusable pattern for later backend feature modules.

It does not create backend source files, select a web framework, implement routes, or implement project-model reading behavior.

## Rules

- Backend feature code must live in an explicit module boundary.
- Controllers must not instantiate concrete filesystem, Git, generated-artifact, registry, child-workspace, report, identity, audit, or threat-analysis adapters directly.
- Services must depend on declared ports rather than concrete infrastructure.
- Adapters must implement ports and be wired by factories or composition roots.
- Contracts must be kept within the module boundary when they enforce runtime behavior for that module.
- Cross-cutting behavior must remain in middleware only when it is transport-wide or request-wide.
- Feature-specific behavior must remain in the feature service or domain-specific module, not in middleware.

## Acceptance Criteria

```gherkin
Scenario: Backend feature module preserves dependency direction
  Given the Project Model Explorer backend module is implemented
  When its source layout is inspected
  Then controller, service, contracts, ports, adapters, and composition responsibilities are separated
  And concrete adapters are wired outside controllers

Scenario: Service reads project-model data through a port
  Given the explorer service needs project-model data
  When the service is constructed
  Then it receives a port-shaped dependency
  And it does not import a concrete filesystem or Git adapter directly
```

## Verification Expectation

Future source-layout, architecture, and code-traceability gates must be able to verify module boundaries, JSDoc requirement references, and the absence of concrete adapter construction inside controllers.
