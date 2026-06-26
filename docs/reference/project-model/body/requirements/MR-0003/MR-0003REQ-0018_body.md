# MR-0003REQ-0018 — Platform Child Project Registry Boundary

## Intent

The platform needs to manage child repositories, but that platform registry must not replace the internal Project Model used inside each child project.

## Requirement

The system must define a platform-side child-project registry boundary for identifying managed child repositories while preserving each child project's internal standard Project Model registries.

## Scope

This requirement applies to future platform child-project registration, listing, lifecycle status, and capability/RBAC integration.

It does not implement the platform registry, storage adapter, API, UI, RBAC runtime, or repository synchronization in this micropasso.

## Rules

- The platform child-project registry may identify repository location, default branch, project-model root, governance profile, lifecycle state, and future capability bindings.
- The platform registry must not duplicate or replace the child project's macro-requirement, ADR, requirement, graph, body-format, or taxonomy registries.
- Child-project UI navigation and lifecycle status must be derived from backend capabilities and registry/read-model data, not frontend hardcoding.
- Future RBAC policies must protect platform child-project management actions behind backend capability boundaries.

## Acceptance Criteria

```gherkin
Scenario: Platform registry identifies a child project
  Given threat-forge manages a child project repository
  When the platform lists managed child projects
  Then the platform registry identifies the repository and Project Model root
  And the child repository still owns its internal governed Project Model records
```

## Verification Expectation

A future platform child-project registry validator must fail records that try to replace child internal Project Model registries or omit the repository and project-model root information needed for governed loading.
