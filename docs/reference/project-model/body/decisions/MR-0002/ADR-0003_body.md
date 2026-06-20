# ADR-0003 — Source layout and contract ownership for reusable application slices

## Status

Accepted.

## Context

`MR-0002` now defines a reusable application architecture and the first Project Model Explorer view-model/API boundary. The next decision is where contract artifacts and future source files must live before runtime code is introduced.

Threat-forge must avoid treating OpenAPI, Zod schemas, backend modules, and frontend API clients as ad-hoc implementation details. The project is Doc-as-Code and security-first: HTTP contracts must be governed artifacts, runtime validation must be explicit, controllers must remain thin, and React must consume API/view-model boundaries instead of reading project-model sources directly.

The Project Model Explorer is the first concrete slice that will exercise this pattern. It must remain under `MR-0002` for application-boundary concerns while the semantic content it displays remains owned by `MR-0001` and future domain macro requirements.

This step is intentionally document-only. It does not create OpenAPI files, Zod schemas, backend source modules, frontend source modules, validators, routes, generated clients, React pages, or runtime adapters.

## Decision

OpenAPI HTTP contracts for threat-forge must be governed documentation artifacts under `docs/reference/api/openapi/`. The first implementation slice should add the Project Model Explorer operation to a product-level OpenAPI contract such as `docs/reference/api/openapi/threat-forge.openapi.yml`, unless a later ADR decides to split contracts by bounded context.

OpenAPI is the canonical HTTP contract for product API behavior. Backend modules implement this contract, frontend clients consume it, and future gates may validate that implemented routes and generated clients remain aligned with it. OpenAPI must not be treated as a backend-private file hidden inside a controller or route directory.

Zod runtime contracts belong to the backend module that enforces them. For the Project Model Explorer slice, future Zod contracts should live inside a backend module boundary such as `backend/src/modules/project-model-explorer/contracts/`. Zod validates runtime inputs, parsed records, service outputs, adapter outputs, and HTTP boundary data where required. Zod must remain aligned with OpenAPI, but it is not the canonical HTTP documentation contract unless a later ADR introduces a generation or synchronization model.

Backend feature source should use a module layout that preserves Controller → Service → Port → Adapter layering and composition-root wiring. For the Project Model Explorer slice, the future layout should follow this shape:

```text
backend/src/modules/project-model-explorer/
  projectModelExplorer.controller.ts
  projectModelExplorer.service.ts
  contracts/
  ports/
  adapters/
  composition/
```

The exact filenames may evolve, but the dependency direction must not: controllers delegate to services, services depend on ports and contracts, concrete adapters are wired outside controllers through a factory or composition root.

Frontend feature source should use an API/client and view-model boundary. For the Project Model Explorer slice, the future layout should follow this shape:

```text
frontend/src/features/project-model-explorer/
  api/
  ports/
  view-model/
  pages/
  components/
```

React components must consume client ports, generated clients, hooks/controllers, and normalized view models. React components must not parse OpenAPI, YAML, Markdown, graph registries, Git state, filesystem paths, or generated project-model pages directly.

## Scope

In scope:

- canonical location for governed OpenAPI contracts;
- backend ownership of Zod runtime contracts;
- source layout expectations for the first reusable backend feature slice;
- source layout expectations for the first reusable frontend feature slice;
- explicit separation between OpenAPI, Zod, backend module code, frontend API clients, and React components.

Out of scope:

- creating the OpenAPI artifact;
- creating Zod schemas;
- generating clients or validators;
- selecting a web framework;
- implementing backend routes, services, ports, adapters, or composition roots;
- implementing frontend pages, hooks, components, or API clients;
- defining child-project runtime behavior;
- defining reporting dashboards or threat-analysis behavior.

## Consequences

### Positive consequences

* OpenAPI becomes a governed product contract rather than a backend-private artifact.
* Backend runtime validation remains close to the module that enforces it.
* Future alignment gates can compare OpenAPI, Zod, route handlers, and frontend clients.
* The Project Model Explorer can be implemented without React coupling to source files or generated pages.
* The same layout pattern can be reused by child-project, analysis, identity, audit, and reporting features.

### Negative consequences

* Implementing the first runtime slice requires contract artifacts before route and component work.
* The project must later decide whether OpenAPI and Zod are synchronized manually, generated one from the other, or checked by a dedicated gate.
* More source directories must exist than in an ad-hoc implementation.
* Future validators will be needed to enforce the layout and contract-alignment decisions.

## Follow-up

1. Define the first OpenAPI contract artifact under `docs/reference/api/openapi/`.
2. Define the first Project Model Explorer Zod runtime contract under the backend module boundary.
3. Define the backend service, port, adapter, and composition-root contracts before route implementation.
4. Define the frontend API client port and view-model types before React page implementation.
5. Later introduce gates that validate OpenAPI/Zod/source-layout alignment.
