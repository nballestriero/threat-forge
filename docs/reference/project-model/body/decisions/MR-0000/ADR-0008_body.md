# ADR-0008 — OpenAPI structural validation gate without additional dependencies

## Status

Accepted.

## Context

Threat-forge now has a governed OpenAPI contract for the Project Documentation Explorer read-only API surface. The contract is intentionally ahead of the HTTP server implementation so that API shape, view-model semantics and documentation traceability are governed before runtime code is introduced.

The repository does not yet have a governed decision selecting a full OpenAPI validation/linting dependency such as Spectral, Redocly or a JSON Schema based OpenAPI parser. Introducing such a dependency would affect `package.json`, `package-lock.json`, CI, lockfile integrity and future validation semantics. That choice should therefore remain a separate decision.

However, the new OpenAPI contract still needs an immediate fail-fast guard. Without a guard, the contract could drift by losing endpoints, mutating the read-only boundary, removing required response schemas or disconnecting from the project graph before a strict OpenAPI validator is selected.

## Decision

MR-0000 shall introduce a deterministic structural OpenAPI contract validation gate without adding new runtime or development dependencies.

The gate shall validate the current governed OpenAPI contract at `docs/reference/api/openapi/threat-forge.openapi.yml`. It shall check that the file exists, declares OpenAPI metadata, exposes only the approved read-only Project Documentation Explorer paths, uses only `GET` operations, retains required operation metadata, retains required responses and declares the component schemas used by the documented view-models.

The gate shall also check graph traceability for the OpenAPI contract artifact and for the validation tool itself.

The gate is intentionally structural. It shall not replace a future strict OpenAPI schema validator or linter, and it shall not select a third-party validation dependency.

## Scope

In scope:

- validating the presence and stable shape of the governed OpenAPI contract;
- protecting the read-only Project Documentation Explorer API boundary;
- checking operation identifiers, summaries, responses and response schemas for the current endpoints;
- checking required component schemas, responses and parameters for the current contract;
- checking graph traceability for the contract and validator;
- adding the structural validator to the governed repository runner.

Out of scope:

- selecting a third-party OpenAPI validation/linting dependency;
- performing full OpenAPI 3.1 JSON Schema validation;
- generating clients or server stubs;
- starting or testing a real HTTP server;
- validating route implementation against OpenAPI;
- adding audit, license, secrets or release checks.

## Consequences

### Positive consequences

* The OpenAPI contract becomes protected by the same governed runner used locally and in CI.
* The project gains immediate protection against accidental endpoint, method and schema drift.
* No new dependency is introduced before a governed dependency/tool decision exists.
* The future strict validator can be introduced later as an additive governed gate.

### Negative consequences

* The gate does not prove full OpenAPI 3.1 conformance.
* The gate is tailored to the current Project Documentation Explorer contract.
* A later strict validator may require contract refinements that this structural gate does not currently detect.

## Follow-up

1. Add a functional requirement for the structural OpenAPI contract validation gate.
2. Add a validator tool under MR-0000 and link it in the project graph.
3. Add the validator to the governed runner and repository operation anti-regression guard.
4. Introduce strict OpenAPI validation only after a separate governed tool/dependency decision.
