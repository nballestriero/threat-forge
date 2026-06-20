# MR-0002REQ-0026 — Read-only Project Model Explorer UI slice

## Intent

The first visible Governance Console feature should let registered users browse governed documentation and project-model records without editing them.

## Requirement

The first Project Model Explorer UI slice must be read-only. It must let an authorized registered user browse a project-model overview, macro-requirements, requirements, ADR/decisions, taxonomies, and governed entity details through normalized backend/API view models.

The frontend must not read YAML, Markdown, Git, filesystem, registries, graph files, or generated artifacts directly.

## Scope

This requirement applies to the future frontend Project Model Explorer UI slice. It does not implement React components, routes, API clients, or backend readers in this step.

## Rules

- The slice must be read-only.
- The slice must use the shared Governance Console template.
- The slice must consume normalized view models from backend/API boundaries.
- The slice must support project-model overview, macro-requirements, requirements, ADR/decisions, taxonomies, and entity detail browsing.
- The slice must render unavailable edit actions as absent or disabled rather than partially implemented.
- The slice must respect capability-driven menu and route visibility.

## Acceptance Criteria

```gherkin
Scenario: Registered user browses project-model records
  Given an authenticated registered user has the read-only project-model capability
  When the user opens the Project Model Explorer
  Then the user can browse overview, macro-requirements, requirements, ADR/decisions, taxonomies, and entity details
  And the UI does not expose editing controls

Scenario: Frontend does not read governed source files directly
  Given the Project Model Explorer needs project-model data
  When the frontend renders the page
  Then it consumes backend/API view models rather than reading Markdown, YAML, Git, filesystem, registries, graph files, or generated artifacts directly
```

## Verification Expectation

Future frontend and API integration tests must verify that the Project Model Explorer UI consumes normalized read-only API responses and does not rely on direct source-file access from React components.
