# ADR-0021 — Project Documentation Explorer JSDoc type-check coverage expansion boundary

## Status

Accepted.

## Context

The Project Documentation Explorer now has a governed JSDoc static type-checking pilot under `MR-0002/ADR-0020` and `MR-0002REQ-0053`. The first implementation added a focused `tsc --checkJs` gate, a dedicated TypeScript configuration, selected positive files, and a negative fixture that proves representative field-name drift is rejected.

The pilot is useful but intentionally narrow. Before adding new product functionality, the selected Project Documentation Explorer coverage should grow enough to protect the module boundaries that will be reused by future child-project and Base Analysis work. Those boundaries include service, controller, HTTP delivery, composition, source-port adapters, typed errors, cache decorators, frontend data clients and their nearby tests.

The expansion must remain governed and incremental. A broad repository-wide check, a TypeScript migration, or opportunistic inclusion of unrelated modules would create noise and weaken the small-step workflow. This decision therefore authorizes only a Project Documentation Explorer coverage expansion, not a general type-checking program for the whole repository.

This work also precedes future Base Analysis work. Base Analysis will depend on analyzable child-project documents. That child-project document-source and skeleton/scaffolding model belongs to `MR-0003` and must be decided separately before Base Analysis runtime/storage implementation starts.

## Decision

MR-0002 shall expand the existing Project Documentation Explorer JSDoc static type-checking pilot from its first selected files to a broader, still bounded Explorer file set.

The expansion must remain scoped to Project Documentation Explorer source, frontend client/UI files, local serve/composition files and directly related tests or fixtures. It must continue to use JavaScript files with JSDoc and TypeScript `checkJs`; it must not rename source files to TypeScript, add transpilation, change runtime behavior, or replace runtime boundary validation.

Expansion must be incremental and deterministic. Each implementation micropasso may add a small set of files to the focused configuration, add only the JSDoc typedefs and annotations needed for those files, and keep the existing negative fixture coverage meaningful. The resulting command must remain part of the governed `repo:check` path only while it stays deterministic and low-noise.

The preferred expansion order is:

1. backend Explorer source-port, service, controller, typed error, HTTP server, local serve and module/composition files;
2. filesystem source adapter and cache decorator files;
3. frontend Explorer data client, page, state helpers and snapshot exporter;
4. nearby tests or fixtures that define important contract shapes.

The expansion must not introduce `@ts-nocheck` or broad suppressions in selected files. Any unavoidable local suppression must be narrow, justified in a comment, and should trigger follow-up remediation rather than becoming a permanent escape hatch.

Runtime validation remains separate. Zod, OpenAPI, JSON Schema, deterministic validators, filesystem canonicalization and typed error mapping continue to guard untrusted HTTP, CLI/env, filesystem, YAML/JSON, generated snapshot and child-project inputs.

## Scope

In scope:

- expanding `tsconfig.project-documentation-explorer.checkjs.json` to additional Project Documentation Explorer files;
- adding JSDoc typedefs, imports and function annotations needed for those selected files;
- improving static coverage for source-port/service/controller/HTTP/composition/adapter/frontend data-client boundaries;
- keeping the existing negative fixture and adding more negative fixtures only when they prove a new representative drift class;
- updating graph relations for implementation and verification artifacts when code changes occur.

Out of scope:

- repository-wide `checkJs`;
- TypeScript source migration or `.js`/`.jsx` renames;
- build or runtime transpilation;
- replacing Zod, OpenAPI, JSON Schema or deterministic validators;
- expanding to MR-0003 child-project management or MR-0004 Base Analysis files;
- changing Project Documentation Explorer HTTP/API/frontend behavior;
- adding new dependencies.

## Consequences

### Positive consequences

* The Explorer module becomes a stronger reusable reference slice for future threat-forge features.
* Static checks catch more contract drift before runtime tests or browser usage.
* Future child-project and Base Analysis work can reuse a better-typed service/port/composition pattern.
* The project gains confidence in JSDoc typing without a disruptive TypeScript migration.

### Negative consequences

* Additional files may need more explicit JSDoc annotations before they can be selected.
* The check can become noisy if the selected scope grows too quickly.
* Developers and LLM-assisted sessions must avoid suppressing errors instead of improving contracts.
* Runtime validation remains necessary, so some concepts may be represented both as runtime schemas and JSDoc type contracts.

## Follow-up

1. Declare the focused requirement for Project Documentation Explorer JSDoc type-check coverage expansion.
2. In a later implementation micropasso, add a small first expansion set to the focused check configuration.
3. Keep `repo:check` passing after each expansion.
4. Preserve the current negative fixture and add new fixtures only for representative new drift classes.
5. Before Base Analysis runtime/storage starts, create separate `MR-0003` decisions for child-project skeleton generation and child-project document-source controls.
