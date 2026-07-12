# ADR-0005 — Base Analysis Logical Records and Storage Boundary

## Status

Accepted.

## Context

`MR-0004/ADR-0002` defines the security-analysis-ready project knowledge pipeline and `MR-0004/ADR-0003` defines versioned analysis lifecycle and stale detection. `MR-0004/ADR-0004` then defines domain-neutral Base Analysis taxonomies and extension mapping.

The next design concern is where Base Analysis state lives. The governed documentation model is suitable for stable decisions, requirements, taxonomies, registries, graph relations and contracts. It is not suitable as the primary persistence mechanism for dynamic analysis instances, candidate elements, review decisions, rebase state, finding state, DFD working state or CI/CD lifecycle status.

At the same time, choosing SQLite tables too early would couple the product model to one storage implementation. SQLite is a reasonable first implementation candidate for local development, single-user or lightweight workspace operation, but future deployments may need PostgreSQL, a document store, an event store, a cloud database or another persistence form.

This step is intentionally document-only. It defines the logical record and storage boundary. It does not implement SQLite, migrations, repository classes, service ports, adapters, OpenAPI, Zod schemas, runtime UI, import/export or CI/CD gates.

## Decision

Base Analysis dynamic state must be modeled first as logical persistent records and service-facing contracts, not as Markdown/YAML documents and not as a concrete SQLite schema.

The logical record model defines the durable analysis concepts that future application services must preserve: analysis case or version records, source snapshot bindings, candidate base elements, accepted base actors/components/resources/boundaries/flows, DFD derivation references, taxonomy classifications, source references, review records, lifecycle status and evidence links. These records are the domain/application persistence contract. Their names and relationships may later be mapped to database tables, documents, events or other storage structures by adapters.

Dynamic analysis data must be persisted behind an application storage port. Controllers, React components and analysis services must not depend on SQLite, filesystem layout or concrete storage adapters. A future implementation must follow the established controller/service/port/adapter and composition-root pattern: services depend on analysis storage ports, and the composition root selects the concrete adapter.

SQLite may be used as the first storage adapter because it is simple, local, portable and suitable for early product development. SQLite must not become the canonical domain contract. Future PostgreSQL, cloud, file-backed, document, event-store or hybrid adapters must be possible without rewriting controllers or changing governed logical records.

Governed documentation remains the canonical source for decisions, requirements, taxonomy definitions, graph rules, contracts and validation policy. Dynamic storage persists analysis instances and their lifecycle state. Reports or summaries may later export analysis results back into governed documentation or evidence artifacts, but the working state of an analysis must not be treated as ordinary static documentation.

## Scope

In scope:

- logical record boundary for Base Analysis dynamic state;
- separation between governed documentation contracts and dynamic application persistence;
- storage port boundary for future Base Analysis persistence;
- permission to use SQLite as a replaceable first adapter;
- source, taxonomy, review and evidence linkage required for reproducible analysis snapshots.

Out of scope:

- concrete SQLite schema;
- database migration tooling;
- implementation of storage ports or adapters;
- API contracts for analysis persistence;
- runtime UI for analysis editing;
- event sourcing or synchronization design;
- report export implementation.

## Consequences

### Positive consequences

- Base Analysis can manage dynamic state without abusing Markdown/YAML as a database.
- The product can start with SQLite while keeping the option to move to another database or storage form.
- Services, controllers and UI remain decoupled from concrete persistence.
- Versioned analysis snapshots can remain reproducible because source, taxonomy, review and evidence links are part of the logical model.
- Future CI/CD stale detection can reason over stable logical records rather than storage-specific rows.

### Negative consequences

- A later implementation step must still define storage contracts, schemas, migrations and adapters.
- The logical record model introduces another design layer before code can be written.
- Export/import and backup semantics must be designed carefully when dynamic records and governed documentation coexist.

## Follow-up

1. Define a service/API contract for Base Analysis commands and queries.
2. Define a storage-port interface for Base Analysis persistence.
3. Define a first SQLite adapter and migration strategy after storage requirements exist.
4. Define report/export boundaries from dynamic analysis records to governed evidence artifacts.
5. Define stale-detection queries over the logical record model.
