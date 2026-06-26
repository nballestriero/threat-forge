# MR-0003REQ-0012 — Child Project Management UI Boundary

## Intent

The platform needs a Governance Console boundary for managing child projects without placing nested management inside child projects.

## Requirement

The system must define a platform Governance Console boundary for listing, creating, inspecting, and managing child projects.

## Scope

This requirement applies to future platform UI and backend read-model design.

It does not implement UI components, routes, storage, endpoints, or commands in this micropasso.

## Rules

- The platform workspace must own child-project management capabilities.
- The management boundary must support listing child projects.
- The management boundary must support creating or preparing governed child-project skeletons in future implementation.
- The management boundary must support inspecting lifecycle and gate status.
- Child-project workspaces must not own nested child-project management.

## Acceptance Criteria

```gherkin
Scenario: Platform lists child projects
  Given the current workspace is the threat-forge platform
  When the user opens the future Child Projects area
  Then the console can present governed child-project records subject to backend capabilities
```

## Verification Expectation

Future UI boundary tests must verify that child-project management views are platform-owned and are not exposed as nested child-project management in child workspaces.
