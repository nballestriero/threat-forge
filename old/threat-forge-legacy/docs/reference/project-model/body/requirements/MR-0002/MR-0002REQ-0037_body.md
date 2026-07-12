# MR-0002REQ-0037 — Project Documentation Explorer body-backed detail view-model

## Intent

A user opening a governed documentation entity must be able to read both its registry metadata and its governed Markdown body in one read-only detail view.

## Requirement

The Project Documentation Explorer detail operation must return a backend-resolved body section when the selected entity has a governed `body_path` reference.

## Scope

This requirement applies to the backend detail view-model, source port, initial filesystem source adapter, read service and controller boundary. It does not implement body editing, React rendering, dynamic RBAC, Markdown-to-HTML conversion, HTTP server wiring or Base Analysis runtime.

## Rules

- The detail view-model must preserve registry metadata and graph relations.
- Registry metadata must be returned separately from Markdown body content.
- Body content must be resolved by the backend through `ProjectModelSourcePort`.
- The browser/frontend must not read `body_path`, YAML, Markdown, Git, filesystem, registries or graph files directly.
- Missing body files must be represented as unavailable body data, not as silent frontend source reads.
- The first body format must be plain Markdown text.

## Acceptance Criteria

```gherkin
Scenario: Documentation explorer detail includes governed body content
  Given a governed requirement has a registry record with a body_path
  When a registered user opens that requirement detail
  Then the backend returns registry metadata
  And the backend returns the governed Markdown body content below the metadata
  And the frontend does not read the Markdown file directly
```

## Verification Expectation

Future backend tests must verify that detail view-models include body content for entities with a valid body path and that missing bodies are represented explicitly without bypassing the source port.
