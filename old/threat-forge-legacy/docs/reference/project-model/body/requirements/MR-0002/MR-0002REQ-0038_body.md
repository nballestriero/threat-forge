# MR-0002REQ-0038 — Project Documentation Explorer static validation prototype

## Intent

Before implementing the final React Governance Console page, the project needs a lightweight way to validate whether the read-only exploration flow, filters, list and detail body reading are useful.

## Requirement

The repository may provide a generated static Project Documentation Explorer prototype that uses the governed backend module to produce a local HTML artifact for UI validation.

## Scope

This requirement applies only to a generated validation artifact under `artifacts/project-documentation-explorer/`. It does not define the final React application shell, route guard implementation, session handling, dynamic RBAC, server-side rendering, production deployment or Base Analysis UI.

## Rules

- The prototype generator must call the Project Documentation Explorer backend module.
- The generated browser page must not read YAML, Markdown, Git, filesystem, registries or graph files.
- Filters must remain visible at the top of the page.
- The list must be the default view.
- Selecting an entity must hide the list and show the selected detail below the filters.
- Detail must show registry data first and governed Markdown body underneath when available.
- Generated artifacts must remain under `artifacts/` and not become governed source records.

## Acceptance Criteria

```gherkin
Scenario: Static prototype validates list-to-detail exploration
  Given the backend Project Documentation Explorer module can return collection and detail view-models
  When the prototype renderer runs
  Then it generates a local HTML artifact
  And the artifact lets a user filter records, select one record, and read registry data followed by the Markdown body
```

## Verification Expectation

The governed runner must continue to pass. Manual validation may open the generated artifact to confirm the first UI flow before implementing the React page.
