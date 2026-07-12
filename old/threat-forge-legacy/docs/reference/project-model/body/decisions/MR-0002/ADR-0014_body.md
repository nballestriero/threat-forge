# ADR-0014 — Project Documentation Explorer local serve composition root

## Status

Accepted.

## Context

The Project Documentation Explorer already has a governed OpenAPI read-only contract, a native Node.js HTTP server boundary, route descriptors, a controller, a service, a source port, a filesystem adapter and a feature-local module factory.

The current implementation can create an HTTP server for tests, but it does not yet provide a governed process-level composition root or local command that assembles the real module and starts the read-only API for manual verification.

The next step must make the HTTP boundary runnable without letting controllers or route handlers instantiate concrete adapters, without moving the frontend to live HTTP consumption, and without expanding into deployment, dynamic RBAC or threat-analysis runtime work.

## Decision

MR-0002 shall introduce a Project Documentation Explorer local serve composition root and root package command.

The serve entrypoint shall assemble the Project Documentation Explorer module through the existing feature factory, pass the composed controller and route descriptors into the native HTTP server boundary, and call `listen` only at the process-level CLI boundary.

The root package shall expose the command as `backend:project-documentation-explorer:serve`.

The command may support local host, port and repository-root configuration through CLI options or environment variables, but it must remain a local development and verification command rather than a deployment runtime contract.

The serve command shall keep the HTTP API read-only and shall expose only the governed Project Documentation Explorer GET operations already defined by the OpenAPI contract.

The initial local access model shall continue to use the bootstrap registered-user capability boundary. Dynamic user, role, permission and policy administration remain owned by MR-0007 and are not introduced by this command.

## Scope

In scope:

- process-level Project Documentation Explorer composition root;
- local serve command in the root package scripts;
- host, port and repository-root option normalization for local use;
- composition of module, controller, route descriptors and native HTTP server without direct adapter construction in controllers or route handlers;
- runtime smoke verification that the command can start a short-lived local read-only server.

Out of scope:

- deployment topology;
- production process management;
- mutation endpoints;
- document editing;
- registry writes;
- graph writes;
- repository commit, push or tag operations;
- dynamic RBAC management;
- frontend migration from snapshot consumption to live HTTP API consumption;
- Base Analysis, STRIDE or STRIDE-AI runtime/storage APIs;
- strict OpenAPI validation with external tooling.

## Consequences

### Positive consequences

* The read-only Project Documentation Explorer API can be started locally through a governed command.
* Manual and automated verification can exercise the real composition path instead of only constructing test-local servers.
* Controller, route and adapter ownership remains aligned with the Controller → Service → Port → Adapter boundary.
* The next frontend migration step can target a real backend endpoint when a separate governed decision allows it.

### Negative consequences

* The command is intentionally local and does not solve production deployment or process supervision.
* Bootstrap header-based access remains temporary until MR-0007 introduces richer runtime identity semantics.
* Package scripts now include another governed entrypoint that future repository-operation checks may need to account for if the command becomes mandatory.

## Follow-up

1. Add the local serve composition root and package command in a separate governed implementation micropasso.
2. Add smoke tests proving that the serve command can start a short-lived read-only server.
3. Later decide whether the frontend should consume the live HTTP API instead of the generated snapshot.
