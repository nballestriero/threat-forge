# MR-0002REQ-0012 — Frontend feature source layout and API client boundary

## Intent

The first frontend slice needs a predictable source layout and API boundary before React pages or components are implemented.

This requirement prevents React components from becoming direct readers of project-model source artifacts.

## Requirement

Future frontend source for the Project Model Explorer must be organized as a feature boundary that consumes API/client ports and normalized view models.

The preferred future layout is:

```text
frontend/src/features/project-model-explorer/
  api/
  ports/
  view-model/
  pages/
  components/
```

React pages and components must render normalized Project Model Explorer view models and dispatch user intent through hooks, controllers, API clients, or client ports. They must not read or parse YAML, Markdown, graph registries, OpenAPI files, Git state, filesystem paths, generated project-model pages, or local artifact directories directly.

## Scope

This requirement applies to the future Project Model Explorer frontend feature and establishes a reusable pattern for later frontend feature modules.

It does not create frontend source files, generated clients, React pages, route definitions, components, or state-management code.

## Rules

- Frontend feature code must live in an explicit feature boundary.
- API access must go through a client adapter, generated client, or explicit client port.
- View model shaping for React rendering must be explicit and testable.
- React components must not parse project-model source files directly.
- React components must not read Git, filesystem, generated pages, local artifacts, YAML registries, Markdown bodies, or graph files directly.
- Frontend route/page guards may enforce application-shell access mechanics, but identity/session/role semantics belong to `MR-0007`.
- Reporting dashboard behavior belongs to `MR-0009`, not to the Project Model Explorer component boundary.

## Acceptance Criteria

```gherkin
Scenario: React renders a normalized explorer view model
  Given the Project Model Explorer page is implemented
  When its React components render project-model information
  Then they receive normalized view-model data through a client or hook boundary
  And they do not parse YAML, Markdown, graph files, Git state, filesystem paths, or generated pages directly

Scenario: Frontend API access is isolated
  Given the frontend needs Project Model Explorer data
  When it calls the backend
  Then the call is made through an API client, generated client, or explicit client port
  And component code does not construct ad-hoc HTTP calls scattered across the UI tree
```

## Verification Expectation

Future frontend source-layout, test, and code-traceability gates must be able to verify that Project Model Explorer components consume API/client boundaries and view models rather than source artifacts directly.
