# LLM Governed Development Guide

This how-to explains how an LLM-assisted session should work on threat-forge and future child projects governed by threat-forge.

The goal is to prevent implementation-first changes and keep every meaningful change anchored in the project model.

## Read authoritative sources first

Before proposing a change, inspect the relevant canonical sources:

- macro-requirement registry and body;
- decision registry and ADR body;
- requirement registry and Requirement body;
- graph file for the owning macro-requirement;
- relevant source modules and validators;
- working plan only as dynamic operational context, not canonical truth.

Do not rely on memory alone when the repository content is available.

## Choose the correct macro-requirement

Classify the change before editing:

- documentation method, registries, body formats, graph governance, traceability → `MR-0001`;
- reusable UI/API/interface framework → `MR-0002`;
- child-project creation, profiles, scaffolding, and governed project management → `MR-0003`;
- base assets, components, boundaries, data flows, and entry points → `MR-0004`;
- STRIDE overlay → `MR-0005`;
- STRIDE-AI overlay → `MR-0006`;
- users, roles, access and identity → `MR-0007`;
- logging, audit and evidence trail → `MR-0008`;
- repository runner, gates and system-state controls → `MR-0000`.

Ask whether a new area is needed only when the existing macro-requirements do not own the behavior.

## Use one governed micropasso

For each micropasso:

1. State the intended semantic change.
2. Add or update an ADR if a decision is needed.
3. Add a small requirement derived from the ADR.
4. Update the graph.
5. Only then add implementation, guide, or validator artifacts.
6. Add source traceability when source code is created or modified.
7. Run or request the governed gates.
8. Provide commit/push commands using the governed runner.

Do not bundle unrelated implementation areas.

## Keep Diátaxis categories clean

Use the documentation categories precisely:

- `docs/tutorials/` for guided learning paths;
- `docs/how-to/` for operational instructions;
- `docs/reference/` for registries, schemas, contracts, and stable reference material;
- `docs/explanation/` for background, theory, and rationale that is not itself a binding decision.

Do not put guide content inside ADR bodies or Requirement bodies. ADRs decide. Requirements constrain. How-to documents instruct.

## Preserve implementation architecture

When backend code is introduced, preserve Node.js, Zod contracts, OpenAPI HTTP contracts, factory/composition root, Controller → Service → Port → Adapter layering, and focused middleware boundaries.

When frontend code is introduced, preserve React component reuse, view models, client ports, and API/OpenAPI adapters. Components must not directly read project-model files or repository infrastructure.

## Preserve the Project Documentation Explorer live HTTP pattern

When assisting with Project Documentation Explorer or a similar read-only feature slice, check whether the existing pattern already covers the change before proposing new architecture:

- `MR-0002/ADR-0012` and `MR-0002REQ-0045` own the read-only OpenAPI contract;
- `MR-0002/ADR-0013` and `MR-0002REQ-0046` own the native read-only HTTP server boundary;
- `MR-0002/ADR-0014` and `MR-0002REQ-0047` own the local serve composition command;
- `MR-0002/ADR-0015` and `MR-0002REQ-0048` own the frontend HTTP data-source boundary;
- `MR-0002/ADR-0016` and `MR-0002REQ-0049` own live HTTP opt-in and visible selected-source failure behavior;
- `MR-0002/ADR-0017` and `MR-0002REQ-0050` own typed HTTP error mapping;
- `MR-0002/ADR-0018` and `MR-0002REQ-0051` own canonical filesystem source containment;
- `MR-0002/ADR-0019` and `MR-0002REQ-0052` own optional TTL-based snapshot caching.

Do not propose direct browser reads of YAML, Markdown, graph files, registries, Git state or filesystem paths. Do not propose direct adapter construction in controllers, message-regex HTTP status mapping, stale-on-error cache behavior, filesystem watchers, query/cache libraries, generated OpenAPI clients or mutation endpoints unless the user explicitly selects that workstream and the required governance records are added first.

## Preserve child-project security-first behavior

Child projects must be analyzable from documentation creation onward.

Do not propose child-project scaffolding or management behavior that allows routine development without Doc-as-Code structure, governed registries, graph traceability, and commit/push gates.

Threat-forge itself must remain analyzable through the same future threat-analysis model it applies to child projects.

## Handoff discipline

At handoff, report only facts that are backed by command output or user-provided logs. Include:

```text
git status --short --branch
git log --oneline -5
npm run repo:check
```

Prefer partial completion over inventing unverified state.

If a direct Git exception was used, state why the governed runner could not be used.
