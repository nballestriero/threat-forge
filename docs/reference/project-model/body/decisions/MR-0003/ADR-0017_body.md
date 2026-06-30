# ADR-0017 — Live documentation data-source status boundary

## Status

Accepted.

## Context

The Governance Console can now load platform documentation from generated snapshots or governed HTTP endpoints and can load selected child project documentation through the project-scoped Child Project Management API. That routing is correct, but reviewers still need an explicit UI indication of which source is actually serving the displayed documentation.

Without a visible source status, a user can mistake generated platform snapshots, live platform HTTP data, project-scoped child documentation data, fallback data or unavailable source states for one another. This is especially risky while child project support evolves from demo workspaces toward registered real projects.

## Decision

Project Documentation Explorer frontend clients shall expose a normalized data-source status record for collection, filter and detail reads. The status shall identify the selected source, effective source, fallback state, source scope, transport, endpoint template or endpoint, child project metadata when relevant, and whether the displayed data is live.

The Project Documentation Explorer page shall render this status as visible source information before and after loading and on explicit source errors. The status must distinguish at least generated platform snapshot, live platform HTTP, snapshot fallback, project-scoped child API and unavailable child documentation source states.

The UI shall keep the indicator compact and consistent with the existing design system. It shall not introduce write behavior, filesystem reads or browser-side source resolution.

## Scope

In scope:

- data-source status metadata returned by frontend client adapters;
- visible Project Documentation Explorer source status in loading, loaded and unavailable/error states;
- source details for project-scoped child documentation reads;
- frontend tests for normalized source status metadata.

Out of scope:

- changing backend documentation endpoint semantics;
- removing platform snapshot fallback for platform views;
- adding write APIs;
- dynamic RBAC administration;
- cloning remote child repositories;
- adding global observability dashboards.

## Consequences

### Positive consequences

- Reviewers can see whether documentation is live, snapshot-backed, fallback-backed or unavailable.
- Child project document views make the project-scoped API source visible instead of hiding it behind generic page text.
- Future real-project workflows can reuse the same status surface to explain source configuration and availability.

### Negative consequences

- The Project Documentation Explorer page shows one additional compact card.
- Frontend client data-source records become slightly richer and must stay stable for tests.

## Follow-up

1. Extend frontend client data-source status records with live/source metadata.
2. Render a compact live documentation source card in the Project Documentation Explorer page.
3. Keep unavailable source errors visible without replacing them with snapshot data.
