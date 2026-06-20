# MR-0002REQ-0014 — Project Model Explorer governed entity detail endpoint

## Intent

The Project Model Explorer must allow users to read the details of governed entities from the web interface.

This requirement supports non-technical browsing of macro requirements, ADR, requirements, and governed documents without requiring users to open repository files.

## Requirement

A future Project Model Explorer API must expose a read-only governed entity detail endpoint, such as `GET /api/project-model/entities/{entityId}`.

The endpoint must return a normalized entity detail representation for project-model entities such as macro requirements, ADR, requirements, governed documents, and later additional governed entity types. The representation must include identity, kind, title, status where applicable, body or structured sections where applicable, incoming and outgoing relationships, diagnostics, and source references for transparency.

The frontend must treat this response as the application contract for reading entity details. It must not parse repository files directly to display ADR, requirement, macro requirement, or document content.

## Scope

This requirement applies to future Project Model Explorer entity-detail reading.

It does not create the endpoint, OpenAPI schema, Zod schema, body renderer, authorization model, or UI detail page.

## Rules

- Entity detail reading must be read-only.
- The entity ID must be a governed project-model identity, not an arbitrary filesystem path.
- The response must be normalized and frontend-safe.
- The response must support at least MR, ADR, Requirement, and governed document detail in the future.
- The response may include source references for traceability, but React must not use them as direct file reads.
- Entity detail responses must expose relationships so users can navigate from one governed entity to connected entities.
- Role and permission semantics, when introduced, must be governed under `MR-0007`.

## Acceptance Criteria

```gherkin
Scenario: User reads an ADR from the web interface
  Given the Project Model Explorer entity detail API is implemented
  When a user opens a governed ADR entity
  Then the backend returns a normalized ADR detail response
  And the response includes title, status, body sections, relationships, diagnostics, and source reference
  And the frontend does not read the ADR Markdown file directly

Scenario: User navigates from an entity detail to related entities
  Given a requirement detail response contains relationships
  When the user inspects the related entities
  Then the UI can offer navigation to the linked ADR, macro requirement, documents, implementation artifacts, or verification evidence available in the project model
```

## Verification Expectation

Future OpenAPI, backend, frontend, and documentation gates must be able to verify that governed entity details are exposed through normalized API contracts rather than direct frontend access to source files.
