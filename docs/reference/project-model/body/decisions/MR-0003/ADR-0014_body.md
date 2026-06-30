# ADR-0014 — Child project documentation source resolver boundary

## Status

Accepted.

## Context

The Governance Console can now prevent child project document views from silently falling back to threat-forge platform documents. The local UI test environment also starts a dedicated demo child Project Documentation Explorer source so the demo can show child documents through a separate endpoint.

Those fixes are necessary but not sufficient for real child projects. A single frontend environment variable can only describe one demo child source and cannot scale to multiple registered child projects. The source for a real child project must be derived from the platform registration record: the child project id, repository location and Project Model profile determine where the child documentation lives.

The platform must therefore introduce a backend resolver that derives child documentation source metadata from registered child project records. Missing, invalid or unsupported source records must remain explicit states. They must never resolve to the platform Project Documentation Explorer snapshot or endpoint.

## Decision

MR-0003 shall own a backend child project documentation source resolver. The resolver derives a documentation source descriptor from a registered child project record and returns a stable status such as `available`, `unconfigured`, `unsupported` or `unavailable`.

For this first governed slice, local child project repositories can resolve to a filesystem-backed Project Model source when the registered local path and Project Model root point to an existing Project Model directory inside the child workspace. Git-only registrations remain explicit `unsupported` until a governed checkout/workspace resolver exists.

Child project management read models shall include the derived documentation source metadata so later UI and API slices can route child document requests through project-scoped backend logic rather than through a single frontend child URL.

The resolver must fail closed when the Project Model root is absolute, missing, unavailable or resolves outside the registered child workspace.

## Scope

In scope:

- deriving child documentation source metadata from registered child project records;
- adding a backend resolver under the child project management boundary;
- exposing derived source metadata in child project read models;
- distinguishing available, unconfigured, unsupported and unavailable states;
- rejecting Project Model roots that escape the registered child workspace.

Out of scope:

- adding a new child documentation HTTP proxy endpoint;
- replacing the existing demo child local UI test endpoint;
- cloning or checking out Git repositories;
- mutating child project files;
- serving governed Markdown content through this resolver directly;
- adding write APIs or child project registration UI.

## Consequences

### Positive consequences

- Real child projects can start to carry their own documentation-source state in backend read models.
- The platform no longer needs to infer child documentation sources from a global frontend variable.
- Invalid child source registrations become visible as explicit states.
- Later project-scoped document APIs can depend on a governed backend resolver.

### Negative consequences

- Child project management read models grow by one derived metadata field.
- Git-backed child projects remain unsupported until a governed checkout/workspace resolver is added.
- Local path resolution must stay careful to avoid exposing or using escaped Project Model roots.

## Follow-up

1. Add requirements for registered source resolution and unavailable-state semantics.
2. Implement the resolver and attach derived metadata to child project management read models.
3. Add runtime tests for available, unconfigured, unsupported and fail-closed source states.
4. In a later micropasso, add a project-scoped child documentation API that uses this resolver instead of a frontend child URL.
