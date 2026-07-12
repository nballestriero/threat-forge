# ADR-0020 — Project Documentation Explorer JSDoc static type-checking pilot

## Status

Accepted.

## Context

The Project Documentation Explorer backend and frontend slices now include a representative set of reusable threat-forge application patterns: OpenAPI-backed read-only HTTP delivery, controller/service/port/adapter composition, typed error mapping, canonical filesystem source reads, explicit frontend data-source selection and a source-port snapshot cache decorator.

Runtime tests and governance checks already verify behavior, traceability and project-model consistency. However, JavaScript source files can still drift internally when a function signature, object field or source-port shape changes but the affected code path is not covered by a runtime test. The project already uses JSDoc for requirement traceability, and TypeScript is already available as a development dependency. This makes a small `tsc --checkJs` pilot possible without converting the repository to TypeScript and without adding a new dependency.

The pilot must be narrow. A repository-wide JavaScript type-check could create noisy legacy errors and distract from the current MR-0002 Explorer boundary. This decision therefore defines a scoped static-checking pilot before any TypeScript configuration, package script or gate is introduced.

## Decision

MR-0002 shall introduce a scoped JSDoc static type-checking pilot for the Project Documentation Explorer slice using TypeScript `checkJs` over selected JavaScript source and test files.

The pilot must use JSDoc as a technical contract layer for internal JavaScript shapes and signatures. It must not replace runtime validation at untrusted boundaries. Runtime validation with Zod, JSON Schema, OpenAPI checks or dedicated deterministic validators remains required where data crosses HTTP, CLI/env, filesystem/YAML/JSON, generated snapshot or other external trust boundaries.

The initial pilot scope is the Project Documentation Explorer module and its direct tests. The first implementation may introduce a focused TypeScript configuration and npm script for that scope. It must not attempt a repository-wide conversion to TypeScript, rename `.js` files to `.ts`, add a build transpilation step, or require type-checking for unrelated legacy areas.

The pilot may become a blocking governed check only after the scoped command passes deterministically on the selected files and is represented by graph relations. Any future expansion beyond the pilot scope requires a focused decision or requirement update that records the new files, strictness level and expected remediation strategy.

JSDoc governance tags and JSDoc type tags must remain conceptually separate but compatible:

```text
@implementsRequirement / @implementsDecision
→ trace code to governed project-model records

@param / @returns / @typedef / @property
→ let tsc --checkJs verify internal JavaScript contracts
```

JSDoc comments must reference governed requirements and decisions by ID, but they must not duplicate the full requirement or ADR text. The canonical behavioral detail remains in ADR and Requirement bodies.

## Scope

In scope:

- defining a Project Documentation Explorer-only `tsc --checkJs` pilot;
- typing source-port, service, controller, HTTP, frontend data-source and snapshot cache shapes where useful;
- allowing a focused TypeScript configuration or script for the pilot scope;
- detecting wrong field names, missing source-port methods, wrong argument types and inconsistent return shapes before runtime;
- preserving existing runtime validation and behavior tests.

Out of scope:

- repository-wide TypeScript migration;
- renaming `.js`/`.jsx` files to `.ts`/`.tsx`;
- adding a transpilation build step;
- replacing Zod, OpenAPI, JSON Schema or deterministic runtime validators;
- converting all existing JSDoc comments in unrelated modules;
- introducing new dependencies;
- changing the Project Documentation Explorer HTTP API, frontend behavior, cache policy, RBAC model or Base Analysis runtime.

## Consequences

### Positive consequences

* Function signatures and object shapes in the Explorer slice become easier to maintain as the module grows.
* The source-port/decorator/service/controller boundary gains a static safety net in addition to runtime tests.
* JSDoc becomes more valuable without forcing an immediate TypeScript migration.
* The pilot creates a reusable pattern for future MR-0003/MR-0004 workstreams if the approach proves low-noise and useful.

### Negative consequences

* Some existing JavaScript patterns may need more explicit JSDoc annotations.
* Type-checking can produce noisy errors if the selected scope is too broad.
* JSDoc type comments can drift if they are not updated with implementation changes.
* Developers and LLMs must understand that JSDoc type tags do not replace runtime validation at untrusted boundaries.

## Follow-up

1. Define the focused pilot requirement for Project Documentation Explorer JSDoc static type-checking.
2. In a later implementation micropasso, add the smallest TypeScript configuration and npm script needed to run `tsc --checkJs` over the pilot scope.
3. Add JSDoc typedefs and annotations only where they are needed to make the pilot useful and deterministic.
4. Add or update graph relations for the pilot implementation artifacts and verification artifact.
5. Keep runtime Zod/OpenAPI/deterministic validators at external boundaries.
6. Do not expand to repository-wide type-checking until the pilot has passed and a separate expansion decision exists.
