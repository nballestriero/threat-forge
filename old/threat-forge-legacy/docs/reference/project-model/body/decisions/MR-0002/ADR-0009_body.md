# ADR-0009 — Project Documentation Explorer body-backed detail and static validation prototype

## Status

Accepted.

## Context

The first Project Documentation Explorer slice can list and filter governed project-model entities, but a useful read-only documentation interface must also allow a user to open one entity and read the governed Markdown body associated with its registry record.

The browser must not resolve `body_path` or read Markdown files directly. The frontend must receive a normalized detail view-model from the backend/API boundary. That detail view-model must show registry metadata first and the body content underneath when a governed body exists.

A small static prototype is useful before the React Governance Console page is implemented. The prototype must still use the backend module and view-models, not browser-side YAML, Markdown, Git, filesystem, registry or graph reads.

## Decision

MR-0002 must extend the Project Documentation Explorer detail view-model with a backend-resolved governed Markdown body section.

The detail flow must:

- select a governed entity by id;
- return registry-derived metadata and graph relations;
- resolve the entity `body_path` through the `ProjectModelSourcePort`;
- load Markdown body content through the replaceable source adapter;
- return body content as read-only Markdown text in the backend detail view-model;
- keep the frontend/browser unaware of source-file access mechanics.

MR-0002 may also include a disposable static validation prototype generated under `artifacts/` to test the first exploration layout before the long-term React shell exists. The prototype must keep filters at the top, use the list as the default view, and show a selected entity detail below the filters while hiding the list. In the detail view, registry data must appear before the Markdown body.

## Scope

In scope:

- detail view-model body section;
- source-port method for body content reads;
- filesystem source adapter implementation for governed body paths;
- service/controller/module traceability updates;
- local static prototype generation under `artifacts/project-documentation-explorer/index.html`;
- registered-user principal bootstrap for prototype generation.

Out of scope:

- React implementation;
- HTTP server adapter wiring;
- Markdown-to-HTML rendering or rich editor behavior;
- body editing, approval, mutation or writeback;
- dynamic RBAC configuration;
- Base Analysis runtime, storage, commands or APIs.

## Consequences

### Positive consequences

* Users can inspect a governed entity and read its body without leaving the explorer flow.
* The frontend remains API/view-model driven and does not gain direct source access.
* The detail model becomes useful enough to validate the future React page layout.
* Body loading remains replaceable behind the source port.

### Negative consequences

* Detail payloads can become larger because Markdown body content is included.
* The first body representation is plain Markdown text, not rendered rich Markdown.
* The static prototype is a validation artifact and must not be treated as the final UI architecture.

## Follow-up

1. Validate the static prototype interaction and adjust list/detail layout before implementing React.
2. Add the React Project Documentation Explorer page after the backend detail model is stable.
3. Later add HTTP server adapter and OpenAPI publication for the detail endpoint.
