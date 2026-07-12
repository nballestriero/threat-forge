# MR-0007REQ-0003 — Role and permission matrix

## Intent

The Governance Console needs predictable access decisions for documentation, graph, gates, threat analysis, users, reports, audit, and settings.

This requirement establishes that roles and permissions must be governed explicitly rather than inferred ad hoc in frontend components or controllers.

## Requirement

The future identity/access model must define a controlled role and permission matrix for workspace-scoped capabilities.

Initial roles may include Owner, Maintainer, Security Reviewer, Contributor, Viewer, and Auditor, but the final controlled taxonomy must be introduced through governed records before runtime implementation.

Permissions must be able to express access to at least project viewing, documentation viewing or proposal, graph viewing, gate viewing/running, threat-analysis access, user/access management, reports, audit, and settings where applicable.

## Scope

This requirement applies to future role/permission taxonomy and access-decision contract design.

It does not create the final role registry, implement authorization checks, implement UI role editors, or decide persistence/storage technology.

## Rules

- Roles and permissions must be controlled, reviewable, and testable.
- Permission checks must be workspace-scoped.
- UI visibility must not be the only enforcement mechanism.
- Backend access decisions must enforce protected operations even when routes or menu entries are hidden.
- The final role/permission taxonomy must be introduced before runtime access-control implementation.

## Acceptance Criteria

```gherkin
Scenario: Permission matrix controls navigation
  Given a user has a role with documentation and graph view permissions
  And the user lacks user-management permissions
  When the Governance Console navigation is built
  Then Documentation and Graph may be visible
  And Users and Access is not available

Scenario: Backend enforces permissions beyond menu visibility
  Given a user lacks permission for an operation
  When the user attempts to access the operation directly
  Then the backend denies the operation even if the UI route was hidden
```

## Verification Expectation

Future authorization tests must verify that role/permission decisions are controlled, workspace-scoped, and enforced by backend boundaries rather than only by frontend menu visibility.
