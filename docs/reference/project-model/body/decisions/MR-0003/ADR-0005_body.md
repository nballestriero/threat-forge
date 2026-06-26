# ADR-0005 — Child Project Management Storage Port and SQLite Adapter Boundary

## Status

Accepted.

## Context

`MR-0003/ADR-0003` establishes that a child project's canonical documentation remains the standard Project Model: macro requirements, ADRs, requirements, governed Markdown bodies, graph records, body-format declarations and controlled taxonomies.

`MR-0003/ADR-0004` establishes that threat-forge validates child projects by applying reusable Project Model validators to an explicit child-project root.

The platform still needs operational state that is not itself Project Model documentation: the set of managed child projects, repository locations, local checkout paths, default branches, governance profiles, latest validation heads, check runs, gate results, violations and UI lifecycle summaries. These records change frequently and are better treated as platform application state than append-first documentation records.

A YAML registry is appropriate for docs-as-code governance records. It is not the right long-term mechanism for mutable platform management state. The first persistence implementation should be SQLite for simplicity, local development, deterministic tests and minimal deployment friction, but the code must not make SQLite part of the child-project management domain model.

This decision is document-only. It defines the storage boundary before adding SQLite schemas, adapters, APIs, UI, RBAC runtime, skeleton-generation actions, repository cloning or governed child-project commit/push operations.

## Decision

Child-project management state must be stored through a backend storage port. SQLite is accepted as the initial adapter, not as the domain contract.

The child-project management service must depend on a port that represents child-project persistence operations. The service must not depend directly on SQLite APIs, SQL strings, database file paths or SQLite-specific result shapes.

The initial SQLite adapter may persist platform-managed child-project records, check runs, gate results, violations and lifecycle read-model data. The adapter must translate between SQLite storage records and stable application-domain records.

The standard backend pattern remains mandatory:

```text
Controller -> Service -> Port -> Adapter
```

The canonical source for child-project ADRs, requirements, graph records, governed bodies, body-format declarations and controlled taxonomies remains the child repository's `docs/reference/project-model/` tree. SQLite may cache or summarize validation state, but it must not replace the child's Project Model records.

Future database replacement must be possible by adding a new adapter behind the same port. PostgreSQL, another embedded database, or a remote persistence service must not require changes to the service, UI, Project Model validators or child-project skeleton generator beyond composition/root wiring and adapter-specific tests.

RBAC and user protection must be applied at backend operation and capability boundaries. Storage records may support future ownership, visibility and audit metadata, but the SQLite adapter must not become the authorization boundary.

## Scope

In scope:

- defining the child-project management storage port boundary;
- selecting SQLite as the first persistence adapter;
- separating platform operational state from child-project Project Model documentation;
- defining stable domain/read-model records for child projects, validation runs, gate results and violations;
- preserving future database replacement through port/adapter composition;
- keeping future RBAC enforcement at service/capability boundaries.

Out of scope:

- implementing the storage port;
- adding SQLite dependencies or schema migrations;
- creating a database file;
- adding backend HTTP endpoints;
- adding Governance Console UI;
- generating child-project skeletons;
- cloning repositories;
- implementing governed child-project commit/push operations;
- implementing RBAC runtime persistence;
- implementing Base Analysis, STRIDE or STRIDE-AI execution.

## Consequences

### Positive consequences

- Platform child-project state can evolve without rewriting Project Model registries on every check.
- The UI can consume an application read model instead of parsing YAML files.
- SQLite provides a pragmatic first adapter while keeping the codebase prepared for a different database.
- Child-project documentation remains auditable docs-as-code in the child repository.
- Future RBAC can protect service operations independently from the storage implementation.

### Negative consequences

- The platform now needs a persistence boundary in addition to docs-as-code records.
- The first storage implementation will require adapter-specific tests and schema discipline.
- Operational state and canonical documentation must remain clearly separated to avoid accidental source-of-truth drift.

## Follow-up

1. Add the child-project management storage port and domain/read-model contracts.
2. Add an initial SQLite adapter behind the port without exposing SQLite to the service layer.
3. Add deterministic storage tests for child-project records, check runs, gate results and violations.
4. Add a read-only backend use case for listing managed child projects and latest lifecycle status.
5. Later, connect Governance Console Child Projects UI to the backend read model through RBAC-ready capabilities.
