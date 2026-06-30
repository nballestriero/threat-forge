# MR-0003REQ-0070 — Frontend project-scoped child documentation loading

## Intent

The Governance Console must show documents for the selected child project through the project-scoped backend API instead of using a single global child documentation URL.

## Requirement

When a user opens Documents from a selected child project, the frontend must call the Child Project Management project-scoped documentation API for that selected child project id. It must render the returned Project Documentation Explorer collection and detail view-models through the existing documentation page.

If the project-scoped API source is not configured, the child document view must render an explicit unavailable state and must not fall back to platform documentation snapshots or platform Project Documentation Explorer endpoints.

## Scope

This requirement applies to the Governance Console frontend composition, the Project Documentation Explorer frontend client boundary and the Child Projects page launch action.

It does not require backend endpoint changes, child project writes, Git cloning, dynamic RBAC administration or removal of the platform documentation snapshot fallback used for platform views.

## Rules

- The selected child project id must be part of the documentation context used by the frontend.
- Child project document collection reads must call `/api/child-projects/{childProjectId}/documentation`.
- Child project document detail reads must call `/api/child-projects/{childProjectId}/documentation/entities/{entityId}`.
- The child project document client must not use the platform snapshot fallback.
- The child project document client must surface project-scoped API errors explicitly.

## Acceptance Criteria

```gherkin
Scenario: Child project documents use project-scoped API
  Given the Child Project Management API is configured for the frontend
  When the user opens Documents for Demo Child Project
  Then the frontend requests the project-scoped child documentation collection
  And detail reads use the selected child project id
  And no platform Project Documentation Explorer source is used for child documents

Scenario: Missing project-scoped API remains explicit
  Given the Child Project Management API is not configured in HTTP mode
  When the user opens Documents for a child project
  Then the UI shows an explicit unavailable state
  And no platform snapshot is loaded for the child project
```

## Verification Expectation

Runtime frontend-client tests must verify project-scoped child documentation URLs, data-source state and unavailable-source behavior. The governed repository check must continue to pass.
