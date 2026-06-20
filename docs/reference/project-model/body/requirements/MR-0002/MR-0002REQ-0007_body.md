# MR-0002REQ-0007 — Project Model Explorer source access isolation

## Intent

The Project Model Explorer must not weaken Doc-as-Code governance by letting UI modules bypass governed backend boundaries.

This requirement isolates project-model source access behind backend ports and adapters.

## Requirement

Project Model Explorer frontend modules must not read project-model YAML, Markdown, graph files, generated pages, Git state, filesystem paths, or artifact directories directly.

Source access must be performed behind backend project-model reader or query ports. Concrete adapters may read registries, body files, generated artifacts, Git metadata, or future child-project workspaces only when wired through the backend composition root or equivalent factory boundary.

## Scope

This requirement applies to source access for the Project Model Explorer. It governs dependency direction and isolation, not final storage technology or parser implementation.

## Rules

- React components must not import or parse project-model source files.
- Frontend client code must use the explorer API/client boundary.
- Backend services must depend on ports for project-model reads.
- Concrete source adapters must not be instantiated in controllers.
- Concrete source adapters must not be imported by React components.
- Child-project workspace source access must later follow the same isolation boundary.

## Acceptance Criteria

```gherkin
Scenario: Frontend cannot bypass explorer API boundary
  Given a React component needs project-model data
  When it is implemented
  Then it consumes the explorer view model through a client or controller boundary
  And it does not read YAML, Markdown, graph files, Git state, filesystem paths, or generated artifacts directly

Scenario: Backend source adapter is isolated
  Given explorer data is assembled from governed project-model sources
  When the backend service needs source data
  Then it calls a project-model reader or query port
  And the concrete adapter is wired outside the controller
```

## Verification Expectation

Future architecture checks, import-boundary checks, or code reviews must fail when explorer frontend code reads project-model source artifacts directly or when controllers instantiate concrete source adapters.
