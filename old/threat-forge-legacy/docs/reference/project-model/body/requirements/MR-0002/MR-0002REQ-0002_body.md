# MR-0002REQ-0002 — Frontend application shell and API boundary

## Intent

Frontend features need a reusable React architecture that can support threat-forge itself and future child-project workspaces.

This requirement defines the frontend boundary before concrete UI features are implemented.

## Requirement

The frontend application architecture must use React with a reusable application shell, route-level boundaries, controller or hook boundaries, view models, client ports, and API adapters that consume the OpenAPI HTTP contract.

React components must render view models and dispatch user intent through controllers, hooks, or client-port abstractions. Components must not read YAML, Markdown, graph files, Git state, filesystem paths, project-model registries, or generated artifacts directly.

## Scope

This requirement applies to future React modules, including Project Model Explorer, Documentation Governance UI, Graph Explorer, project-management screens, threat-analysis workspaces, and reporting dashboards.

It does not define visual design, component library selection, routing library selection, or the final implementation of any product page.

## Rules

- Frontend UI modules must be implemented with React unless a later ADR explicitly changes the platform.
- React components must consume view models or client/controller state, not raw project-model files.
- API access must go through client ports, generated API clients, or explicit API adapters.
- The OpenAPI boundary must be the source of truth for backend HTTP interaction.
- Frontend modules must not access filesystem, Git, YAML, Markdown, or graph registries directly.
- Shared layout, routing, loading, error, empty-state, and guard mechanics must live in reusable application-shell boundaries.

## Acceptance Criteria

```gherkin
Scenario: React component renders a view model
  Given a project-model explorer component
  When it renders graph or document data
  Then it receives a normalized view model
  And it does not parse project-model YAML, Markdown, graph files, or Git state directly

Scenario: Frontend accesses backend through API boundary
  Given a frontend module needs project data
  When it loads data
  Then it uses a client port or API adapter
  And the adapter follows the OpenAPI HTTP contract
```

## Verification Expectation

Future frontend architecture checks or code review gates must fail when React components read project-model source files directly or bypass the API/client-port boundary.
