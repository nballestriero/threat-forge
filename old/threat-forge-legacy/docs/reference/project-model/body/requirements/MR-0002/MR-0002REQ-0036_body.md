# MR-0002REQ-0036 — Project Documentation Explorer filtered read-only collection

## Intent

Users need a simple read-only documentation view before Base Analysis runtime exists. The first collection should answer practical questions such as what belongs to a macro requirement, what is implemented, what remains to do, and what has been accepted or not accepted.

## Requirement

The Project Documentation Explorer must expose a filtered read-only collection view-model for governed documentation entities. The collection must support backend-side filtering by macro requirement, entity kind, status, requirement type, implementation state, acceptance state and optional text query.

## Scope

This requirement applies to the first Project Documentation Explorer backend service, controller and route descriptors. It does not implement frontend pages, write operations, Git mutations, generated page reuse, Base Analysis storage, STRIDE overlays or dynamic RBAC administration.

## Rules

- The collection must include governed macro requirements, requirements, ADR and taxonomy records where available.
- Collection items must use governed identifiers as application identities.
- Collection items must include enough metadata for filtering and navigation, including macro requirement, kind, title, status, source references and derived states where applicable.
- The endpoint or route descriptor must remain read-only and capability-gated.
- Source references are traceability metadata only; they must not instruct the frontend to read repository files directly.

## Acceptance Criteria

```gherkin
Scenario: Registered user filters governed documentation by macro requirement and implementation state
  Given an authenticated registered user has read-only documentation explorer capabilities
  When the user requests the documentation collection filtered by a macro requirement and implementation state
  Then the backend returns only matching governed documentation items
  And each item uses governed identifiers and normalized state fields
  And the request does not require the frontend to read YAML, Markdown, Git, filesystem, registry or graph files directly
```

## Verification Expectation

Future backend tests must verify query normalization, capability-gated read-only access, source adapter isolation, runtime contract validation and graph-derived implementation state for requirement collection items.
