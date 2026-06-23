# MR-0000REQ-0023 — OpenAPI contract structural validation gate

## Intent

The first governed OpenAPI contract must be protected before a real HTTP server is introduced. The initial protection should prevent accidental drift in endpoint shape, read-only semantics, required response schemas and graph traceability without introducing a new OpenAPI validation dependency prematurely.

## Requirement

The repository must provide a deterministic OpenAPI structural validation gate for the governed Project Documentation Explorer contract and include that gate in `npm run repo:check`.

## Scope

This requirement governs the structural validation of `docs/reference/api/openapi/threat-forge.openapi.yml`. It does not choose a third-party OpenAPI validator, generate code, implement HTTP routes, validate runtime responses or replace future strict OpenAPI validation.

## Rules

- The validator must fail if the governed OpenAPI contract file is missing.
- The validator must require the OpenAPI metadata and top-level sections needed by the current contract.
- The validator must require the approved Project Documentation Explorer read-only paths.
- The validator must reject non-`GET` methods under the governed read-only API surface.
- The validator must require stable operation identifiers, summaries, responses and response schemas for each approved endpoint.
- The validator must require the component schemas, component responses and component parameters used by the current view-model contract.
- The validator must check graph traceability for the OpenAPI contract artifact and for the validator tool.
- The governed runner must execute the validator as part of `npm run repo:check` and `npm run repo:commit-push`.
- The validator must not add third-party dependencies or perform full OpenAPI 3.1 schema validation.

## Acceptance Criteria

```gherkin
Scenario: Governed OpenAPI contract remains structurally valid
  Given the repository contains the Project Documentation Explorer OpenAPI contract
  When npm run repo:check executes
  Then the OpenAPI structural validation gate runs
  And it confirms the approved read-only endpoints and required schemas
  And it fails if the contract introduces a non-GET operation or loses a required endpoint
```

## Verification Expectation

Verification should include the validator output, the governed runner output, graph traceability from this requirement to the validator tool and a focused negative probe for a forbidden method or missing required endpoint.
