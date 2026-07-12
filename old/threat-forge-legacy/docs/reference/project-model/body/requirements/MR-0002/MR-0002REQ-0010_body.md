# MR-0002REQ-0010 — Backend Zod runtime contract ownership

## Intent

Backend runtime validation needs a clear ownership rule before Zod schemas are introduced.

This requirement separates the canonical HTTP contract from backend runtime enforcement.

## Requirement

Zod runtime contracts must belong to the backend module that enforces them.

For the first Project Model Explorer slice, future Zod contracts must be placed under a backend module boundary such as `backend/src/modules/project-model-explorer/contracts/`. They must validate runtime data at appropriate boundaries, including request parsing, response shaping, service commands, adapter outputs, and parsed project-model records where required.

Zod contracts must remain aligned with the governed OpenAPI HTTP contract. Zod is the backend runtime enforcement mechanism; OpenAPI remains the canonical HTTP contract unless a later ADR defines a generation or synchronization model.

## Scope

This requirement applies to backend runtime contracts for future `MR-0002` application slices and the first Project Model Explorer slice.

It does not create Zod schemas, OpenAPI/Zod synchronization tooling, route validation middleware, or runtime implementation.

## Rules

- Zod contracts must live inside the backend module that enforces them.
- Zod contracts must be close to the service/controller/adapter boundary they validate.
- Zod contracts must not replace the governed OpenAPI HTTP contract.
- Zod contracts must be traceable to the requirement they implement when code is introduced.
- Zod contracts must be documented with JSDoc including implemented requirement ID and applicable ADR/MR when introduced.
- Any mismatch between OpenAPI and Zod must be resolved through an explicit future decision or gate.

## Acceptance Criteria

```gherkin
Scenario: Zod validates backend runtime data
  Given a backend module receives or emits Project Model Explorer data
  When runtime validation is introduced
  Then Zod schemas are defined inside the backend module boundary
  And the schemas validate the data shape at the appropriate runtime boundary

Scenario: Zod does not become the hidden HTTP source of truth
  Given a Zod schema and an OpenAPI operation both describe an HTTP response
  When the contract is reviewed
  Then the governed OpenAPI artifact remains the canonical HTTP contract
  And the Zod schema is treated as backend runtime enforcement aligned with that contract
```

## Verification Expectation

Future code-traceability and API-contract checks must be able to verify that Zod runtime contracts are colocated with backend modules, documented with JSDoc, and aligned with governed OpenAPI contracts.
