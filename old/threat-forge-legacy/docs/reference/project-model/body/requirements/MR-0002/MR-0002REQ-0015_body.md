# MR-0002REQ-0015 — Project Model Explorer graph relation filtering endpoint

## Intent

The Project Model Explorer must support graph relation queries such as showing all requirements justified by a specific ADR or all ADR linked to a macro requirement.

This requirement prevents relation filtering from being implemented as ad-hoc frontend-only traversal over raw graph files.

## Requirement

A future Project Model Explorer API must expose a read-only graph relation filtering capability, such as `GET /api/project-model/relations`.

The relation filtering capability must allow users and frontend features to request governed relation subsets by criteria such as source entity, target entity, entity type, relation predicate, macro requirement, direction, and user-facing filter intent.

The backend must own the translation from role-neutral filter labels to governed graph predicates and traversal rules. The frontend may display filters such as "requirements defined by this ADR", "ADR for this macro requirement", "implementation artifacts for this requirement", or "verification evidence for this slice" without needing to know raw predicate mechanics.

## Scope

This requirement applies to future Project Model Explorer graph relation filtering.

It does not create the endpoint, query syntax, OpenAPI schema, Zod schema, graph traversal algorithm, predicate taxonomy, or UI filter controls.

## Rules

- Relation filtering must be read-only.
- Relation filtering must operate on governed project-model graph relationships.
- The backend must own graph predicate and traversal interpretation.
- The frontend must not parse graph registry files directly.
- Filters must be able to support both technical predicates and role-neutral labels.
- The relation filtering contract must support at least ADR-to-requirement and MR-to-ADR navigation use cases.
- The contract must be extensible for implementation, verification, diagnostics, and child-project relations.

## Acceptance Criteria

```gherkin
Scenario: User filters requirements for a specific ADR
  Given the relation filtering API is implemented
  When the user asks to see all requirements connected to a specific ADR
  Then the backend returns the governed relations and related requirement summaries
  And the frontend does not inspect raw graph files to derive the answer

Scenario: User applies a role-neutral graph filter
  Given the Explorer UI offers a filter named "requirements defined by this ADR"
  When the user applies the filter
  Then the backend translates the filter into governed graph semantics
  And the response remains stable even if internal predicate handling evolves under governance
```

## Verification Expectation

Future API, backend, and frontend gates must be able to verify that graph relation filtering is represented by a governed contract and is not implemented through direct React parsing of graph registries.
