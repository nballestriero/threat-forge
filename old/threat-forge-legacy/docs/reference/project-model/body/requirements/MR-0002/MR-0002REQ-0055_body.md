# MR-0002REQ-0055 — Project Documentation Explorer taxonomy explanation view-model

## Intent

The Project Documentation Explorer must expose taxonomy meanings through backend view-models so taxonomy ids shown in document pages and filters remain understandable without hardcoded frontend explanations.

## Requirement

MR-0002 must provide a read-only taxonomy explanation view-model for taxonomy documentation entities. The view-model must be derived from governed taxonomy registry data and must include the taxonomy group id, display title, source reference and normalized value explanations.

## Scope

This requirement applies to Project Documentation Explorer backend contracts, service normalization, snapshot export and HTTP detail payloads for taxonomy entities.

It does not apply to taxonomy editing, extension management, Base Analysis runtime/storage, methodology overlay findings, gate execution or RBAC configuration.

## Rules

- Taxonomy explanation data must be derived from governed taxonomy registry records.
- The backend must preserve raw taxonomy ids as traceability metadata.
- The backend must expose human-readable fields such as label/name, description and function when present.
- Optional UI metadata and security-analysis hints must remain data fields, not frontend hardcoded semantics.
- The frontend must not read taxonomy registry files directly.
- The API contract must describe the taxonomy explanation payload shape.
- Missing optional fields must not break taxonomy detail rendering.

## Acceptance Criteria

```gherkin
Scenario: Taxonomy entity detail includes value explanations
  Given a taxonomy entity exists in the Project Documentation Explorer collection
  When the entity detail is requested
  Then the response includes a taxonomy explanation payload
  And the payload includes normalized value explanations derived from the taxonomy registry

Scenario: Raw ids remain traceable but are not the only meaning
  Given a taxonomy value has a governed id and descriptive metadata
  When the backend builds its explanation
  Then the raw id is preserved
  And the label, description, function and optional analysis hints are exposed when available
```

## Verification Expectation

A later implementation micropasso must keep `npm run repo:check` passing, including OpenAPI contract validation, Project Documentation Explorer runtime tests, frontend build and code traceability checks.
