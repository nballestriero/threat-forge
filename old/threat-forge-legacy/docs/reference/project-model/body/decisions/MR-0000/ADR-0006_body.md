# ADR-0006 — Stabilization gate expansion roadmap after independent review

## Status

Accepted.

## Context

Threat-forge has reached a first visible Governance Console and Project Documentation Explorer foundation. The project now has governed registries, ADRs, requirements, graph records, append-first controls, repository-operation governance, a backend Project Documentation Explorer module and an initial React/Vite frontend shell.

Two independent technical reviews of the project state at `HEAD 1dbed71` agreed that the architecture is coherent with the Doc-as-Code/security-first goal, but that the next risk is insufficient automatic verification around runtime code, frontend build behavior, dependency integrity, CI, tests and generated/derived data.

The reviews highlighted several concrete risks:

- `repo:check` does not yet run the frontend build;
- there are no unit tests for stable runtime logic;
- runtime source roots such as `backend/src` and `frontend/src` are not yet fully covered by source-code traceability gates;
- the lockfile can carry non-public or low-integrity registry metadata;
- CI is not yet a remote backstop for governed local gates;
- orphan body files and other document drift can still appear;
- OpenAPI and HTTP server alignment are not yet materialized;
- parser and generated-snapshot behavior need stronger checks as data grows.

Threat-forge must avoid responding to these risks by adding a large undifferentiated tooling stack. Each new gate must have an explicit requirement, a graph relation, a focused implementation artifact and a measurable command so that the governance model stays understandable and incremental.

## Decision

MR-0000 will own a stabilization gate expansion roadmap for cross-cutting repository, dependency, test, build and traceability controls.

The roadmap must be implemented in small, ordered micropassi. The first stabilization gates must focus on failures that are already plausible in the current codebase:

1. frontend build and generated-snapshot validation in the governed runner;
2. minimal unit test coverage for stable pure/runtime logic;
3. lockfile registry and dependency-integrity guard;
4. runtime source traceability coverage for `backend/src` and `frontend/src`;
5. orphan governed body detection.

Later gates may introduce OpenAPI validation, CI workflows, linting, type-checking, accessibility checks, license checks, secret scanning, parser replacement or HTTP route/contract alignment, but these must remain separate governed micropassi.

The working plan must be aligned with this roadmap so that the next development sequence is stabilization-first before large new product areas such as Base Analysis runtime, STRIDE overlays or complex RBAC.

## Scope

In scope:

- defining the ordered stabilization roadmap;
- deriving requirements for the first gate expansion items;
- aligning the working plan with the independent review findings;
- keeping implementation work deferred until each gate requirement is introduced.

Out of scope:

- implementing any new gate in this micropasso;
- replacing the YAML parser;
- creating a GitHub Actions workflow;
- introducing OpenAPI validation;
- adding a test framework beyond documented requirements;
- changing the frontend architecture or runtime behavior.

## Consequences

### Positive consequences

* The project reacts to review findings through governed requirements rather than ad hoc tooling.
* The next implementation work focuses on catching regressions immediately.
* The existing Doc-as-Code/security-first model gains practical stability gates for runtime code and frontend behavior.
* The working plan becomes aligned with the current project state after the first Governance Console slice.

### Negative consequences

* Product feature velocity slows briefly while stabilization gates are introduced.
* Some gate additions may require graph/source-traceability updates before they can pass.
* The project must manage gate ordering carefully to avoid adding too many dependencies or slow checks at once.

## Follow-up

1. Add the frontend build gate to the governed runner.
2. Add the first minimal unit test gate for stable Project Documentation Explorer logic.
3. Add a lockfile registry and integrity guard.
4. Extend code traceability to runtime source roots after graph nodes exist.
5. Add orphan body detection.
6. Re-evaluate parser replacement, OpenAPI, CI, linting and type-checking after the P0 gates are stable.
