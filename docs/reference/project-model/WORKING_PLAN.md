# Working Plan

## Purpose

This working plan is the lightweight operational state document for threat-forge project-model work.

It supports handoff between sessions by summarizing the semantic project state, the active objective, pending work, and the next safe micropasso.

It is not the canonical source for Git state, ADRs, requirements, graph relations, tool behavior, or validation results. Canonical truth remains in Git, governed registries, ADR bodies, Requirement bodies, graph records, source code, and deterministic gate outputs.

## Coherence Rules

- Keep this file aligned with governed project-model records.
- Do not record decisions here unless they also exist in ADR registries and ADR bodies.
- Do not record requirements here unless they also exist in Requirement registries and Requirement bodies.
- Do not record implementation or validation coverage here unless it is represented in the knowledge graph.
- Do not treat dynamic Git facts in this file as authoritative; verify branch, HEAD, tag, remote, and working tree at handoff time.
- Update this file when the active objective, current workstream, pending decisions, pending requirements, or next suggested step changes materially.

## Current Semantic Baseline

The project has established:

- `MR-0000` as the common system-state and consistency-control area.
- `MR-0001` as the governed documentation and traceability area.
- `MR-0002` through `MR-0009` as distinct product macro-areas for reusable interfaces, project management, base threat analysis, STRIDE, STRIDE-AI, users/access, logging/audit, and general reporting.
- `MR-0003` as the child-project management area responsible for making child projects analyzable Doc-as-Code workspaces rather than unconstrained repositories.
- `MR-0001/ADR-0011` as the decision that governed development guides belong in the Diátaxis `docs/how-to/` space, while ADRs and Requirements remain reference/project-model governance artifacts.
- top-down project-model graph traversal using `MR -> has_decision -> ADR`.
- graph relations for `ADR -> justifies -> REQ`, `REQ -> implemented_by -> TOOL`, and `TOOL -> verifies -> REQ`.
- dedicated MR-0000 placement for graph format validation tooling and its technical contracts.
- initial ADR registry field governance.
- governed body-format profiles for stable ADR and Requirement bodies.
- append-first protection for canonical project-model registries and graph records.
- self-contained append-first confirmation manifests for explicitly reviewed protected modifications and deletions.
- governed Requirement status, type, and specialized family taxonomies as the source for Requirement registry field validation.
- deterministic Requirement registry field validation for controlled status, type, specialized suffix family, parent functional consistency, and body path/ADR references.
- deterministic bidirectional graph/source-code traceability validation for governed code artifacts that declare implemented requirements.
- negative fixture coverage for representative invalid graph/source-code traceability states.
- negative fixture coverage for representative invalid Requirement registry field states.
- an anti-regression guard for the canonical governed repository operation commands and runner path.
- negative fixture coverage for representative invalid repository operation governance states.

The current strategic direction is to build a governance substrate for future security and threat-modeling analyses over GitHub projects created through threat-forge. The product macro-area roadmap now separates reusable interfaces, child project management, base threat analysis, STRIDE overlay analysis, STRIDE-AI overlay analysis, identity/access management, logging/audit, and general reporting so that each domain can receive its own ADRs, requirements, graph, implementation artifacts, and validators.

Child projects must produce analyzable documentation, not only human-readable documentation. Threat-forge must provide the Doc-as-Code structure, reuse the same governance models and tool patterns it uses to control itself, and impose governed gates before routine child-project commit/push operations so projects are built documentation-first and security-first. Threat-forge itself must also be analyzable through its own future threat-analysis model.

## Active Objective

The first Governance Console and Project Documentation Explorer foundation has been stabilized through the P0 gate sequence introduced by `MR-0000/ADR-0006` and milestone-tagged as `project-model-stabilization-gates-complete`.

The current semantic state includes:

- backend Project Documentation Explorer read-only filters and body-detail view-model support;
- prototype validation for top filters, list/detail switching and body rendering;
- React/Vite Governance Console shell and Project Documentation Explorer slice;
- shared MR-0002 design system and semantic icon layer;
- pragmatic frontend state/data-access boundary;
- governed runner coverage for frontend build, minimal runtime unit tests, lockfile registry/integrity, expanded runtime source traceability and orphan governed body detection;
- a minimal GitHub Actions workflow that installs from the lockfile and executes the governed `npm run repo:check` path on pushes and pull requests to `master`.

The Project Documentation Explorer now has a governed read-only OpenAPI contract under `MR-0002/ADR-0012` and `MR-0002REQ-0045`, a dependency-free structural validation gate under `MR-0000/ADR-0008` and `MR-0000REQ-0023`, a minimal native Node.js read-only HTTP boundary under `MR-0002/ADR-0013` and `MR-0002REQ-0046`, a local serve composition command under `MR-0002/ADR-0014` and `MR-0002REQ-0047`, a frontend HTTP data-source boundary under `MR-0002/ADR-0015` and `MR-0002REQ-0048`, live HTTP UI activation under `MR-0002/ADR-0016` and `MR-0002REQ-0049`, typed HTTP errors under `MR-0002/ADR-0017` and `MR-0002REQ-0050`, filesystem source canonicalization under `MR-0002/ADR-0018` and `MR-0002REQ-0051`, and optional snapshot caching under `MR-0002/ADR-0019` and `MR-0002REQ-0052`.

The active Project Documentation Explorer workstream has closed the live HTTP and snapshot-caching hardening slice. The current implementation preserves generated snapshot consumption as the deterministic default, supports explicit live HTTP consumption, keeps the backend authoritative for project-model normalization and body-path resolution, maps expected HTTP failures through typed errors, rejects filesystem source escape attempts through canonical path containment, and supports an optional TTL-based source-port snapshot cache with `TTL=0` as the safe default.

The Base Analysis runtime/storage/API direction remains parked. It should resume only after the next workstream is explicitly selected and its ADR/requirements/graph are prepared.

The MR-0002 JSDoc static type-checking pilot for the Project Documentation Explorer has been defined, implemented, closed and milestone-tagged. It is represented by `MR-0002/ADR-0020` and `MR-0002REQ-0053`, implemented by a focused `tsc --checkJs` pilot gate and negative fixture coverage. The pilot improves internal JavaScript contract checking without replacing Zod/OpenAPI/JSON Schema/runtime validation at untrusted boundaries and without converting the repository to TypeScript. The next selected workstream is a governed expansion of that pilot within the Project Documentation Explorer before new product functionality is introduced.

The immediate governance themes are now:

1. keep `repo:check` healthy as the local and CI safety baseline before routine commit/push operations;
2. preserve the OpenAPI contract as the canonical HTTP boundary for the Project Documentation Explorer server;
3. keep the HTTP server read-only, dependency-light and composed through controller/service/port/adapter boundaries;
4. avoid adding audit, license, secrets, deployment, strict OpenAPI validation dependencies or runtime stacks without focused requirements and graph relations;
5. preserve document-first order: ADR/Requirement/Graph before each new tool, API, UI or runtime implementation;
6. keep the frontend pragmatic: colocated features, custom hooks, lightweight data clients and context only where lifecycle requires it;
7. expand the JSDoc static type-checking pilot only through focused MR-0002 decisions and requirements;
8. before Base Analysis runtime/storage, define how threat-forge creates, validates and reads governed child-project skeletons and document sources under MR-0003.


## Current Micropasso

Define the Project Documentation Explorer JSDoc type-check coverage expansion boundary and update the working plan before implementation.

This micropasso is document-only. It adds a focused MR-0002 decision and requirement for expanding the existing JSDoc/static type-check pilot beyond its first selected files while preserving the same constraints:

```text
Project Documentation Explorer only
→ selected files
→ JSDoc + tsc --checkJs
→ no TypeScript migration
→ no build/transpile step
→ no runtime validation replacement
```

The intended next implementation micropasso will expand the focused check configuration to a small additional Explorer file set, likely backend source-port/service/controller/HTTP/composition files first, while keeping `repo:check` deterministic.

The child-project and Base Analysis dependency is also recorded as planning context: before Base Analysis runtime/storage starts, MR-0003 must define how threat-forge creates governed child-project skeletons and how it validates child-project document sources. This JSDoc expansion micropasso does not implement that child-project skeleton, but it records it as the next architectural decision area after the Explorer typing expansion.

No source behavior, HTTP API, frontend behavior, child-project scaffolder, Base Analysis runtime/storage, STRIDE overlay, RBAC model, dependency, package-lock update, TypeScript migration or repository-wide type-check expansion is introduced by this document step.

## Completed Milestones

- Bootstrap of `MR-0000` common governance.
- System-state control requirements for `MR-0000`.
- Migration of graph decision traversal to `MR -> has_decision -> ADR` for `GRAPH-0000` and `GRAPH-0001`.
- Introduction of graph format checker under `backend/tools/MR-0000/`.
- Introduction of ADR registry field checker.
- Project-model graph HTML layout improvement.
- Tag expected for completed top-down graph alignment: `project-model-top-down-graph-alignment-complete`.
- Declaration of foundational decisions for workflow, identity, canonical document formats, graph views, LLM navigation, and code RTM.
- Declaration of requirement-model and common body-format validator architecture decisions.
- Derivation of atomic requirement-model and common body-format requirements.
- Introduction of the governed body-format registry and milestone tag `project-model-body-format-registry-complete`.
- Derivation of foundational governance requirements for working plan coherence, canonical identity, graph views, LLM navigation, code RTM, and bidirectional graph/code traceability.
- Declaration of append-first governance for protected project-model registries and graph records.
- Schema-backed validation of the governed body-format registry with an AJV-backed checker.
- Dedicated requirement for the shared Markdown body parser utility.
- Implementation of the shared Markdown body parser utility and its focused self-check.
- Dedicated requirement for the ADR body format validator.
- Implementation of the ADR body format validator and alignment of existing MR-0001 ADR bodies with the canonical ADR body sections.
- Implementation of the Requirement body format validator and alignment of existing Requirement bodies with the canonical Requirement body sections.
- Dedicated specialized requirement for the append-first protected record guard.
- Implementation of the append-first protected record guard as a fail-closed semantic diff for protected records.
- Dedicated specialized requirement for append-first protected change confirmation manifests.
- Confirmation-manifest schema contract for the self-contained YAML manifest format.
- Clarification that confirmation manifests are self-contained YAML operational records without a separate registry or body Markdown document.
- Implementation of append-first confirmation-manifest discovery, schema validation, and matching for protected `modify` and `delete` changes.
- Completion tag on `addeb37`: `project-model-document-format-and-append-first-controls-complete`.
- Working-plan alignment after append-first milestone, pushed as `591bf1d`.
- Focused MR-0000 gate runner requirement, pushed as `968c1b9`.
- Governed commit-push repository operation runner, pushed as `fb8de83`.
- Requirement governance taxonomy baseline, pushed as `22702bc`.
- Requirement registry field validator, pushed as `e1a4c7b`.
- Bidirectional code traceability validator, pushed as `d540e9c`.
- Code traceability negative fixtures, pushed as `4b3cb73`.
- Requirement registry field negative fixtures, pushed as `355b68f`.
- Repository operation governance guard, pushed as `8e15f5e`.
- Repository operation governance negative fixtures, pushed as `4106c52`.
- Direct Git exception policy requirement, pushed as `fcf25b3`.
- Milestone tag `project-model-governed-operations-and-traceability-complete` created on `fcf25b3` and pushed.
- Product macro-area roadmap opened for reusable interfaces, child project management, base threat analysis, STRIDE, STRIDE-AI, identity/access management, and logging/audit, pushed as `1f5c3e6`.
- Child-project analyzable documentation contract, pushed as `372051b`.
- Diátaxis governed development guides, pushed as `8741a75`.
- Workspace-aware Governance Console, pushed as `d1ca9dd`.
- Security-analysis-ready project knowledge pipeline, pushed as `b5c7bc4`.
- Versioned threat-analysis lifecycle and CI/CD integration, pushed as `457b94a`.
- Controlled taxonomy value metadata model, pushed as `c785535`.
- Domain-neutral Base Analysis taxonomies and governed extension model, pushed as `565d05e`.
- Base Analysis logical records and storage boundary, pushed as `3e1de42`.
- Working-plan alignment before Project Model Explorer UI, pushed as `8411ec5`.
- Initial registered-user access policy boundary, pushed as `5c9ebfc`.
- Governance Console UI template and read-only Explorer slice, pushed as `91ced91`.
- Project Model Explorer read-only API/view-model contract, pushed as `0f8bf93`.
- Project Documentation Explorer read-only filters, pushed as `29ce099`.
- Project Documentation Explorer body detail, pushed as `9e9d618`.
- Project Documentation Explorer prototype filter fix, pushed as `65e9190`.
- Shared frontend design system and semantic icon registry, pushed as `2ad4904`.
- Governance Console shell and Project Documentation Explorer React slice, pushed as `be3acf0`.
- Pragmatic frontend state and data access pattern, pushed as `1dbed71`.

- Frontend build gate added to the governed runner, implementing `MR-0000REQ-0017`, pushed as `ca0a682`.
- Minimal runtime unit test gate for Project Documentation Explorer service logic, implementing `MR-0000REQ-0018`, pushed as `02bd036`.
- Lockfile registry and dependency integrity guard, implementing `MR-0000REQ-0019`, pushed as `77feeaa`.
- Runtime source traceability coverage expansion to `backend/src` and `frontend/src`, implementing `MR-0000REQ-0020`, pushed as `4cabd04`.
- Orphan governed body file detection, implementing `MR-0000REQ-0021`, pushed as `b5a9085`.
- P0 stabilization gate sequence completed and milestone-tagged as `project-model-stabilization-gates-complete`, pushed as `ac543c1`.
- Governed CI execution boundary decision and minimal CI requirement, pushed as `c153f5c`.
- GitHub Actions governed repository check workflow, running `npm ci` and `npm run repo:check`, pushed as `21ca294` and verified operational on GitHub Actions.
- Governed CI workflow setup closed in the working plan, pushed as `cb28de2`.
- Project Documentation Explorer OpenAPI read-only contract, pushed as `c2d09be`.
- OpenAPI structural validation gate, implementing `MR-0000REQ-0023`, pushed as `70ed776`.
- Project Documentation Explorer HTTP read-only server boundary decision, pushed as `1a2969a`.
- Native Node.js Project Documentation Explorer HTTP read-only server implementation, pushed as `df2ed36`.
- Project Documentation Explorer local serve composition command, pushed as `18f2bed`.
- Project Documentation Explorer frontend HTTP data-source boundary, pushed as `4bbef50`.
- Project Documentation Explorer frontend data-source adapter boundary implementation, pushed as `031adb6`.
- Project Documentation Explorer live HTTP UI activation decision and implementation, pushed as `a0f0114` and `f69dbac`.
- Project Documentation Explorer typed HTTP error boundary decision and implementation, pushed as `d1c4589` and `1f530b0`.
- Project Documentation Explorer filesystem source path canonicalization decision and implementation, pushed as `a2c5a56` and `609fc3f`.
- Project Documentation Explorer live HTTP hardening milestone tag `project-documentation-explorer-live-http-hardening-complete`, pointing at `609fc3f`.
- Threat modeling manual chapter 1, pushed as `6c9ede4`.
- Project Documentation Explorer snapshot caching boundary decision and implementation, pushed as `55ad5a1` and `48e9e78`.
- Project Documentation Explorer live HTTP caching workstream closure, pushed as `900c12f` and milestone-tagged as `project-documentation-explorer-live-http-caching-complete`.
- Project Documentation Explorer JSDoc static type-checking pilot decision, implementation and closure, pushed as `7e65ff5`, `1720e09` and `4dfad16`, and milestone-tagged as `project-documentation-explorer-jsdoc-typecheck-pilot-complete`.

## Pending Decisions

The requirement-model and common body-format architecture decisions are now represented by ADRs.

Any new decision must be added to the relevant decision registry and graph before derived requirements or implementation work starts.

Before implementing the first Governance Console interfaces and APIs, keep the initial MR-0007 registered-user policy behind the documented capability/access-policy boundary. Future dynamic RBAC remains deferred, but React pages must not hardcode permanent role checks.

The MR-0002 Project Documentation Explorer live HTTP/caching slice is represented by focused decisions and requirements through `MR-0002/ADR-0019` and `MR-0002REQ-0052`. Future changes must conform to the existing OpenAPI contract, controller/service/port/adapter boundaries, typed error mapping, canonical filesystem containment and source-port cache-decorator model rather than introducing ad-hoc routes, browser-side source-file access, message-regex error mapping, direct adapter instantiation in delivery code, filesystem watchers, stale-on-error behavior or third-party cache/query libraries without new decisions.

The MR-0002 JSDoc static type-checking pilot is represented by `MR-0002/ADR-0020` and `MR-0002REQ-0053`. The focused expansion boundary is represented by `MR-0002/ADR-0021` and `MR-0002REQ-0054`. Future implementation must remain scoped to selected Project Documentation Explorer JavaScript source/test/frontend files, must use `tsc --checkJs` with JSDoc types, must not replace runtime validation at untrusted boundaries, and must not expand to repository-wide type-checking without a new focused decision.

Before MR-0004 Base Analysis runtime/storage begins, MR-0003 must receive separate decisions for child-project governed skeleton generation and child-project standard Project Model source controls. The intended direction is that threat-forge should create child projects from a governed skeleton rather than expecting ad-hoc repositories to become analyzable later. That skeleton should include documentation-first gates, governed guides for programmers and LLMs, the same canonical Project Model structure used by threat-forge, repo operation controls, controlled taxonomy declarations, and standard Project Model source validation.

The deferred Base Analysis track should later receive a dedicated command/query contract decision before SQLite schemas, storage adapters, OpenAPI endpoints, or analysis runtime UI are implemented.

## Pending Requirements

Append-first governance requirements have been declared. The schema-backed body-format registry validator has been implemented. The shared Markdown parser requirement has been declared and implemented.

The ADR body format validator requirement has been declared and implemented.

The Requirement body format validator requirement has been declared and implemented.

The focused append-first protected record guard requirement has been declared and implemented as a small semantic diff tool.

The focused confirmation-manifest requirement has been declared and implemented. A schema contract for the confirmation manifest format has been introduced. The confirmation-manifest storage model has been clarified as self-contained YAML records. The append-first guard now discovers, validates, and matches confirmation manifests against protected `modify` or `delete` changes.

The broad MR-0000 gate runner requirement already exists as `MR-0000REQ-0007`. The focused specialized gate-runner requirement exists as `MR-0000REQ-0007GOV-0001`. The governed commit-push execution requirement exists as `MR-0000REQ-0007GOV-0002`, and the repository operation runner implementation cites both specialized requirements. The governed repository operation command anti-regression guard requirement exists as `MR-0000REQ-0007GOV-0003`. The focused negative-fixture coverage requirement for the repository operation governance guard exists as `MR-0000REQ-0007GOV-0004`. The direct Git operation exception policy exists as `MR-0000REQ-0007GOV-0005`: routine commits and pushes must use the governed runner, while direct Git is reserved for bootstrap, recovery, or emergency maintenance. The minimal governed CI repository check requirement exists as `MR-0000REQ-0022` and is implemented by `.github/workflows/governed-repository-check.yml`, which runs `npm ci` and `npm run repo:check` rather than duplicating the runner's internal gate list. The OpenAPI contract structural validation requirement exists as `MR-0000REQ-0023` and is implemented by `backend/tools/MR-0000/check-openapi-contract.mjs` through `npm run docs:openapi-contract`.

The Requirement governance registry requirement now exists as `MR-0001REQ-0025`. Its focused specialized validation requirement exists as `MR-0001REQ-0025GOV-0001`. The Requirement governance registry provides controlled Requirement status values, Requirement type values, specialized Requirement suffix families, and specialized parent rules. The corresponding validator has been implemented as `backend/tools/MR-0000/check-requirement-registry-fields.mjs`.

The code traceability declaration requirement already exists as `MR-0001REQ-0020`, and the bidirectional graph/code traceability requirement already exists as `MR-0001REQ-0021`. The focused specialized negative-fixture coverage requirement exists as `MR-0001REQ-0021GOV-0001`.

The Requirement governance registry requirement exists as `MR-0001REQ-0025`. The focused specialized Requirement registry field validation requirement exists as `MR-0001REQ-0025GOV-0001`. The focused specialized negative-fixture coverage requirement for Requirement registry field validation exists as `MR-0001REQ-0025GOV-0002`.

The product macro-area roadmap is now split across distinct macro requirements:

- `MR-0002` — Reusable Interface Framework;
- `MR-0003` — Project and Child Project Management;
- `MR-0004` — Base Threat Analysis Model;
- `MR-0005` — STRIDE Threat Analysis Overlay;
- `MR-0006` — STRIDE-AI Threat Analysis Overlay;
- `MR-0007` — Identity, User and Access Management;
- `MR-0008` — Logging, Audit and Evidence Trail;
- `MR-0009` — Reporting, Dashboards and Product Intelligence.

These macro-areas define boundaries. `MR-0002` now also has a baseline architecture ADR and small requirements. Other macro-areas still require ADRs and small requirements before implementation.

`MR-0003/ADR-0001` defines child projects as analyzable Doc-as-Code workspaces. The first derived requirements are:

- `MR-0003REQ-0001` — Child project analyzable documentation profile;
- `MR-0003REQ-0002` — Child project governed commit-push gates;
- `MR-0003REQ-0003` — Child project security-analysis readiness from Doc-as-Code creation;
- `MR-0003REQ-0004` — Threat-forge self-analysis as a governed project.

These requirements define the documentation and governance contract only. Future implementation must still introduce child-project scaffolding, adapters, and validators through separate ADRs and requirements.

`MR-0001/ADR-0011` defines Diátaxis-correct placement for governed development guides. The first derived guide-placement requirements are:

- `MR-0001REQ-0026` — Governed development guide Diátaxis placement;
- `MR-0001REQ-0026GOV-0001` — Programmer governed development guide;
- `MR-0001REQ-0026GOV-0002` — LLM governed development guide.

The guide documents live in `docs/how-to/governed-development/` and are referenced from `GRAPH-0001` as `Document` nodes.

`MR-0002/ADR-0012` defines the Project Documentation Explorer read-only OpenAPI contract. The derived contract requirement is:

- `MR-0002REQ-0045` — Project Documentation Explorer governed OpenAPI contract.

The contract is stored at `docs/reference/api/openapi/threat-forge.openapi.yml` and currently covers the read-only documentation list, filters, and entity detail operations.

`MR-0002/ADR-0013` defines the minimal Project Documentation Explorer HTTP read-only server boundary. The derived server requirement is:

- `MR-0002REQ-0046` — Project Documentation Explorer HTTP read-only server.

The first implementation exists as a native Node.js HTTP boundary at `backend/src/MR-0002/project-documentation-explorer/project-documentation-explorer.http-server.mjs`, with runtime smoke coverage for collection, detail decoding and read-only behavior.

`MR-0002/ADR-0020` defines the Project Documentation Explorer JSDoc static type-checking pilot. The derived requirement is:

- `MR-0002REQ-0053` — Project Documentation Explorer JSDoc static type-checking pilot.

The pilot has been implemented as a focused `tsc --checkJs` gate with selected files and a wrong-field negative fixture.

`MR-0002/ADR-0021` defines the Project Documentation Explorer JSDoc type-check coverage expansion boundary. The derived requirement is:

- `MR-0002REQ-0054` — Project Documentation Explorer JSDoc type-check coverage expansion.

The expansion is document-only at this point. A later implementation must extend the focused check to a small additional Explorer file set, keep runtime boundary validation separate, and avoid repository-wide TypeScript migration.

`MR-0002/ADR-0014` defines the local Project Documentation Explorer serve composition root. The derived command requirement is:

- `MR-0002REQ-0047` — Project Documentation Explorer local serve command.

The local command exists as `backend:project-documentation-explorer:serve` and starts the read-only API through the feature composition boundary.

`MR-0002/ADR-0015` through `MR-0002/ADR-0019` define the completed Project Documentation Explorer live HTTP and caching hardening slice. The derived requirements are:

- `MR-0002REQ-0048` — Project Documentation Explorer frontend HTTP data-source boundary;
- `MR-0002REQ-0049` — Project Documentation Explorer live HTTP UI activation;
- `MR-0002REQ-0050` — Project Documentation Explorer typed HTTP error boundary;
- `MR-0002REQ-0051` — Project Documentation Explorer filesystem source path canonicalization;
- `MR-0002REQ-0052` — Project Documentation Explorer snapshot caching policy.

The implementation now supports generated snapshot default loading, explicit live HTTP opt-in, visible live-source loading/error state, typed HTTP error mapping, canonical filesystem containment and optional TTL-based in-memory snapshot caching through a source-port decorator.

`MR-0002/ADR-0001` defines the reusable application architecture for backend and frontend modules. The first derived architecture requirements are:

- `MR-0002REQ-0001` — Backend application module architecture;
- `MR-0002REQ-0002` — Frontend application shell and API boundary;
- `MR-0002REQ-0003` — Protected route and page guard mechanism;
- `MR-0002REQ-0004` — Cross-cutting HTTP middleware boundary.

These requirements define the application architecture contract only. Future implementation must still introduce source layout, OpenAPI contracts, Zod schemas, route/controller/service/port/adapter modules, frontend shell components, and middleware through separate implementation micropassi with code traceability.

`MR-0009` now defines the boundary for general reporting, dashboards, and product intelligence. It currently has no ADR or operational requirements beyond the macro-area definition.

## Pending Implementations

No new implementation should start before the related requirements and graph relations exist.

Preferred near-term implementation sequence before code:

1. MR-0002/MR-0001 read-only Project Model Explorer API/view-model contract for governed documentation and graph data.
2. MR-0002 first implementation slice for backend project-model reader service/API adapter and frontend read-only documentation/graph explorer.
3. Resume the deferred MR-0004 Base Analysis command/query/storage track when the visible documentation/graph explorer foundation exists.

Expected future implementation areas include:

- reusable application architecture, Project Model Explorer interfaces, frontend shell, API boundaries, protected route mechanics, and middleware templates under `MR-0002`;
- governed project and child project management under `MR-0003`;
- base threat-analysis model contracts under `MR-0004`;
- STRIDE overlay contracts under `MR-0005`;
- STRIDE-AI overlay contracts under `MR-0006`;
- identity, user, and access-management foundations under `MR-0007`;
- logging, audit, and evidence trail foundations under `MR-0008`;
- general reporting, dashboards, export, and product-intelligence foundations under `MR-0009`;
- working plan coherence checker;
- graph view profile validator or renderer;
- future body-format or placement validator for governed how-to guides if guide conventions require deterministic enforcement;
- code RTM generator.

The minimal governed CI workflow has been implemented. Future CI expansion must be introduced through separate ADRs, requirements, graph relations and implementation artifacts rather than extending the minimal workflow opportunistically.

The Project Documentation Explorer OpenAPI contract, dependency-free structural validation gate, native HTTP read-only server, local serve composition command, frontend data-source boundary, live HTTP opt-in UI, typed HTTP error mapping, filesystem source canonicalization, optional TTL-based snapshot cache decorator and focused JSDoc static type-checking pilot have been implemented. The next selected implementation area is the first bounded MR-0002 JSDoc type-check coverage expansion. Future strict OpenAPI validation with a dedicated third-party tool, default frontend API switch, URL-state/deep-linking, generated OpenAPI client, snapshot payload validation, child-project source adapters, broader cache policy, broader JSDoc type-checking beyond Explorer or repository-wide TypeScript migration must be introduced through separate decisions or focused requirements as appropriate.

## Pending Validators / Gates

Current governed local gates are:

```text
npm run docs:graph-format
npm run docs:pages
node tools/docs/check-docs-structure.mjs
npm run docs:adr-registry-fields
npm run docs:requirement-registry-fields
npm run docs:code-traceability
npm run docs:project-documentation-explorer-jsdoc-typecheck
npm run docs:repo-operation-governance
npm run docs:body-format-registry
npm run docs:markdown-body-parser
npm run docs:adr-body-format
npm run docs:requirement-body-format
npm run docs:append-first
npm run docs:lockfile-integrity
npm run docs:orphan-governed-bodies
npm run docs:openapi-contract
npm run frontend:build
npm run test:runtime
npm run repo:check
```

The stabilization gate sequence from `MR-0000/ADR-0006` is now implemented:

- `MR-0000REQ-0017` — frontend build gate in the governed runner;
- `MR-0000REQ-0018` — minimal runtime unit test gate;
- `MR-0000REQ-0019` — lockfile registry and dependency integrity guard;
- `MR-0000REQ-0020` — runtime source traceability coverage expansion to `backend/src` and `frontend/src`;
- `MR-0000REQ-0021` — orphan governed body file detection.

The minimal GitHub Actions CI workflow now runs the governed local check path:

```text
.github/workflows/governed-repository-check.yml
  npm ci
  npm run repo:check
```

The OpenAPI structural validation gate now checks `docs/reference/api/openapi/threat-forge.openapi.yml` for the expected read-only operations, required schemas, required operation metadata and allowed HTTP methods.

The runtime unit test gate now includes HTTP smoke coverage for the Project Documentation Explorer read-only boundary and local serve command, frontend data-source behavior, typed HTTP error behavior, filesystem source canonicalization and snapshot cache behavior in addition to the existing service-level query normalization, graph-derived filtering and governed body loading coverage.

The Project Documentation Explorer JSDoc static type-checking pilot gate now runs a focused `tsc --checkJs` check over selected Explorer source/test files and a negative fixture that verifies field-name drift is rejected. The next governed expansion may add more Explorer files to that same gate, but the gate remains scoped to MR-0002 Explorer files and does not replace runtime boundary validation.

Future gates should be added only after their requirements, graph relations and implementation artifacts exist. Candidate future work remains strict OpenAPI validation with a dedicated tool decision, snapshot payload validation, YAML parser hardening, audit/license/secrets scanning, guide-format validation and broader test coverage, but none of these is part of the Project Documentation Explorer live HTTP/caching closure micropasso.

## Routine Repository Operation Policy

Routine governed repository changes must use the governed local operation path:

```text
npm run repo:check
npm run repo:commit-push -- "<message>"
```

Direct `git commit` or `git push` is reserved for bootstrap, runner recovery, or documented emergency maintenance where the governed runner cannot be used safely.

Handoff instructions should prefer the governed commands above and should explain any direct Git exception.

## Handoff Notes

For handoff, verify live repository state with Git commands rather than relying on this file for dynamic facts.

Minimum handoff checks:

```text
git status --short --branch
git log --oneline -5
git tag --points-at HEAD
git remote -v
npm run docs:graph-format
npm run docs:pages
node tools/docs/check-docs-structure.mjs
npm run docs:adr-registry-fields
npm run docs:requirement-registry-fields
npm run docs:code-traceability
npm run docs:project-documentation-explorer-jsdoc-typecheck
npm run docs:repo-operation-governance
npm run docs:body-format-registry
npm run docs:markdown-body-parser
npm run docs:adr-body-format
npm run docs:requirement-body-format
npm run docs:append-first
```


## Next Suggested Step

The next safe step is to implement the first bounded Project Documentation Explorer JSDoc type-check coverage expansion.

Recommended implementation scope:

1. add a small backend Explorer file set to `tsconfig.project-documentation-explorer.checkjs.json`;
2. prefer source-port, service, controller, HTTP server, typed errors, serve and module/composition files before frontend UI files;
3. add only the JSDoc typedefs/imports needed to make that selected set useful and deterministic;
4. keep the existing wrong-field negative fixture passing as an expected failure;
5. keep `npm run repo:check` passing.

After the JSDoc expansion is implemented and closed, the next major architectural topic should be MR-0003 child-project skeleton and document-source controls before MR-0004 Base Analysis runtime/storage resumes.

The child-project control questions to decide next include:

- whether threat-forge creates a governed child-project skeleton instead of accepting ad-hoc repositories;
- which files and directories the skeleton must contain on day one;
- which gates run inside the child project;
- how the child gate enforces documentation-before-code;
- how child project documents are declared, canonicalized, hashed and validated before analysis;
- how programmer and LLM guides are embedded so child work follows the same method.

Do not expand the JSDoc pilot to unrelated modules, convert the repository to TypeScript, rename source files, add transpilation, change Explorer API behavior, replace runtime validation, implement Base Analysis runtime/storage, implement child-project scaffolding, or expand RBAC without the relevant selected workstream and fresh governance records.

## Project Documentation Explorer JSDoc Static Type-checking Pilot Closure Micropasso

The Project Documentation Explorer JSDoc static type-checking pilot is now defined, implemented and integrated into the governed runner.

The implemented boundary is:

```text
selected Project Documentation Explorer JS files
→ JSDoc typedefs and function annotations
→ focused tsc --checkJs command
→ negative fixture for representative contract drift
→ repo:check gate
```

The completed slice includes:

- `MR-0002/ADR-0020` defining the pilot boundary;
- `MR-0002REQ-0053` requiring a scoped `tsc --checkJs` pilot over selected Explorer files;
- `npm run docs:project-documentation-explorer-jsdoc-typecheck` as the focused command;
- `tsconfig.project-documentation-explorer.checkjs.json` as the pilot configuration;
- a MR-0002 tool that runs both the positive pilot and a negative fixture;
- graph relations connecting the requirement, implementation artifact and verification artifact.

The pilot remains intentionally narrow. It must not be treated as permission for repository-wide type-checking, TypeScript conversion, source-file renaming, build/transpile changes or removal of runtime validation at untrusted boundaries.

## Security-analysis-ready Project Knowledge Pipeline Micropasso

This document-only micropasso defines how governed project documentation and graph relations must prepare future security analysis before any runtime analysis implementation exists.

The intended pipeline is:

```text
governed documentation and project graph
→ security-analysis-ready project knowledge
→ candidate Actor / Component / Data Resource / Boundary identification
→ candidate Data Flow identification
→ human/governed review of candidates
→ DFD derived from accepted inventory and flows
→ versioned Base Analysis snapshot
→ STRIDE, STRIDE-AI and future methodology overlays
```

The DFD is not the first input. It is a derived representation created after assets, explicit boundaries and candidate flows have been identified and reviewed.

This micropasso adds:

- `MR-0001REQ-0031` to require project documentation and graph relations to accumulate security-analysis-ready knowledge;
- `MR-0004/ADR-0002` to define the Base Analysis pipeline from project knowledge to versioned snapshot;
- `MR-0004REQ-0005` through `MR-0004REQ-0008` to govern project knowledge collection, candidate review, DFD derivation and Base Analysis versioning;
- `MR-0009/ADR-0001` and `MR-0009REQ-0001` to introduce readiness reporting for this pipeline.

The next safe design step after this micropasso is to define the controlled Base Threat Analysis taxonomy/registry and the first example project-knowledge-to-base-analysis mapping. Do not implement extraction, DFD rendering, STRIDE, STRIDE-AI, readiness scoring or runtime reporting before their ADRs, requirements, graph relations and contracts exist.


## Versioned Threat Analysis Lifecycle and CI/CD Integration Micropasso

This document-only micropasso defines how threat analysis remains useful while code, documentation, graph records and contracts continue to evolve.

The intended lifecycle is:

```text
governed project state at commit/snapshot N
→ BaseAnalysisVersion-N consolidated against that snapshot
→ STRIDE/STRIDE-AI overlays reference BaseAnalysisVersion-N
→ project evolves through governed commits and future CI/CD
→ security-relevant changes are detected
→ analysis records become current, stale_warning, stale_blocking, requires_review, requires_rebase, superseded or not_applicable according to policy
→ reports and future gates explain the outcome with evidence
```

This micropasso adds:

- `MR-0004/ADR-0003` and `MR-0004REQ-0009` through `MR-0004REQ-0012` for source snapshots, Base Analysis lifecycle, security-relevant change inputs and rebase/supersede semantics;
- `MR-0005/ADR-0002` and `MR-0005REQ-0005` through `MR-0005REQ-0006` for STRIDE overlay BaseAnalysisVersion binding and stale/rebase handling;
- `MR-0006/ADR-0002` and `MR-0006REQ-0005` through `MR-0006REQ-0006` for STRIDE-AI overlay binding, stale handling and reviewed AI output policy;
- `MR-0008/ADR-0001` and `MR-0008REQ-0001` through `MR-0008REQ-0002` for lifecycle audit events and evidence retention;
- `MR-0009/ADR-0002` and `MR-0009REQ-0002` through `MR-0009REQ-0003` for CI/CD security analysis status reporting and policy gate outcome reporting.

No CI/CD gate, stale detector, policy engine, analysis runtime, report payload, dashboard or UI is implemented by this step. The next safe design step is to define a controlled Base Threat Analysis taxonomy/registry or a minimal lifecycle/status taxonomy before any runtime implementation.


## Controlled Taxonomy Value Metadata Micropasso

This document-only micropasso defines how future governed taxonomy values must describe themselves before Base Analysis, STRIDE, STRIDE-AI, reporting or UI contracts depend on them.

The intended model is:

```text
taxonomy value
→ stable id
→ display label/name
→ mandatory description
→ optional function
→ optional semantic UI metadata tokens
→ optional security-analysis hints
```

This micropasso adds:

- `MR-0001/ADR-0013` to define controlled taxonomy value metadata and semantic UI tokens;
- `MR-0001REQ-0032` to require a predictable taxonomy value metadata model;
- `MR-0001REQ-0033` to require descriptions for controlled taxonomy values;
- `MR-0001REQ-0034` to allow semantic UI metadata tokens without coupling domain taxonomy records to concrete UI colors or libraries;
- `docs/reference/project-model/registers/taxonomies.registry.yml` as the first governed taxonomy metadata registry, containing metadata-field and semantic UI token examples.

This micropasso does not define the complete Base Analysis taxonomy and does not implement taxonomy validators, theme mapping, OpenAPI contracts, UI rendering or graph rendering. The next safe design step is to define the controlled Base Analysis taxonomy using this metadata model.

## Domain-neutral Base Analysis Taxonomies and Extension Model Micropasso

This document-only micropasso defines the first governed Base Analysis taxonomy set and the future extension model for domain, methodology, workspace and project-specific taxonomies.

The intended layering is:

```text
Base Analysis taxonomy
→ canonical, minimal, universal, governed by threat-forge
Domain profile taxonomy
→ reusable specialization for project domains
Methodology overlay taxonomy
→ STRIDE, STRIDE-AI, PASTA, safety, privacy, compliance or future methods
Workspace/project custom taxonomy
→ governed user-defined extension for a specific workspace or child project
```

Base taxonomy values must remain domain-neutral and methodology-neutral. They must not assume that a child project is a web application, AI system, industrial plant, irrigation system, business application or any other specific domain.

This micropasso adds:

- `MR-0004/ADR-0004` to decide that Base Analysis taxonomies are universal and extensible through governed profiles/extensions;
- `MR-0004REQ-0013` through `MR-0004REQ-0017` to define domain-neutral taxonomy principles, primitive taxonomy sets, specialization boundary, custom taxonomy extension governance and taxonomy version binding;
- Base Analysis taxonomy values in `docs/reference/project-model/registers/taxonomies.registry.yml` for actors, components, resources, boundaries, flows, Base Analysis lifecycle status and candidate review status;
- extension taxonomy values for extension scope and extension lifecycle status.

The Base Analysis resource taxonomy intentionally uses the broader `base_resource_kind` concept so future child projects can model information, configuration, credentials, operational state, physical resources, contracts, evidence and knowledge without forcing all non-software systems into a narrow data-only model.

Custom project taxonomies are not implemented by this step. A future user-defined taxonomy such as `irrigation_component_type=pump` must map to a base value such as `base_component_kind=physical_or_operational_unit` and must not replace the mandatory base classification.

This micropasso does not implement taxonomy validators, domain profile registries, methodology overlay taxonomy registries, custom taxonomy authoring, OpenAPI contracts, Zod contracts, UI rendering, Base Analysis storage or CI/CD stale detection. The next safe design step is to define a schema/validator for the taxonomy registry or to define the first methodology taxonomy overlay model.

## Project Documentation Explorer Live HTTP UI Activation Micropasso

This document-only micropasso defines how the Project Documentation Explorer UI may activate the live HTTP source without removing the generated snapshot or making the local backend server mandatory for static frontend use.

The intended activation model is:

```text
generated snapshot source
→ default deterministic frontend build and fallback source
explicit live HTTP configuration
→ opt-in local/live Project Documentation Explorer API source
selected-source loading and error state
→ clear UI feedback without silent data corruption
```

This micropasso adds:

- `MR-0002/ADR-0016` to define live HTTP UI activation semantics;
- `MR-0002REQ-0049` to require snapshot-default, live HTTP opt-in and visible selected-source failure behavior.

No frontend implementation is added by this step. The next safe implementation step is to wire the Project Documentation Explorer page to the existing data-source boundary using snapshot as default, live HTTP as explicit opt-in and visible load/error state for the selected source. Do not introduce query/cache libraries, generated OpenAPI clients, dynamic RBAC, mutation endpoints, deployment configuration or Base Analysis runtime/storage in that implementation step.

## Project Documentation Explorer Typed HTTP Error Boundary Micropasso

This document-only micropasso records the first robustness improvement selected after the live HTTP UI activation and the subsequent code review analysis. The review highlighted that HTTP status mapping based on regular expressions over generic error-message text is too fragile for a governed, fail-closed API boundary.

The intended correction is:

```text
generic message-regex error mapping
→ typed Project Documentation Explorer error categories
→ explicit HTTP response mapping at the delivery boundary
→ fail-closed 500 behavior for unexpected exceptions
```

This micropasso adds:

- `MR-0002/ADR-0017` to define the Project Documentation Explorer typed HTTP error boundary;
- `MR-0002REQ-0050` to require typed error/code mapping for access denied, entity not found, invalid request and unexpected internal errors;
- graph relations connecting the decision and requirement to MR-0002.

No backend code is changed by this step. The next safe implementation step is to add a small dependency-free typed error helper or class set inside the Project Documentation Explorer backend slice, replace message-regex status mapping in the HTTP boundary, and add runtime tests for `403`, `404`, `400` and fail-closed `500` behavior. Do not replace the native HTTP server/router, introduce Hono/Fastify/find-my-way, add OpenAPI runtime validation, introduce dynamic RBAC, add mutation endpoints or implement Base Analysis runtime/storage in that implementation step.


## Project Documentation Explorer Filesystem Source Path Canonicalization Micropasso

This document-only micropasso records the next robustness improvement selected after the typed HTTP error boundary. The code review highlighted that guarding against `..` traversal is not sufficient when filesystem indirection such as symbolic links or junctions may allow a path that appears to be inside the project root to resolve outside it.

The intended correction is:

```text
configured project/documentation root
→ canonical allowed root
requested governed relative path
→ canonical requested path
→ read only if contained inside the canonical allowed root
→ fail closed otherwise
```

This micropasso adds:

- `MR-0002/ADR-0018` to define the Project Documentation Explorer filesystem source path canonicalization boundary;
- `MR-0002REQ-0051` to require canonical containment for filesystem source reads and symlink escape rejection;
- graph relations connecting the decision and requirement to MR-0002.

No backend code is changed by this step. The next safe implementation step is to harden the Project Documentation Explorer filesystem source adapter by canonicalizing both the configured root and requested files before reads, rejecting `..` traversal, absolute path injection and symlink/junction escape, and adding runtime tests for safe reads, traversal attempts and symlink escape where supported by the platform. Do not replace the YAML parser, add caching, add filesystem watchers, introduce new dependencies, change the live HTTP UI behavior, introduce dynamic RBAC or implement Base Analysis runtime/storage in that implementation step.

## Project Documentation Explorer Snapshot Caching Boundary Micropasso

This document-only micropasso records the next performance and reliability boundary selected after live HTTP hardening and filesystem path canonicalization. The code review highlighted that loading the complete Project Documentation Explorer snapshot on every request can become expensive as the governed project-model corpus and future child-project documentation sources grow.

The intended correction is:

```text
sourcePort.loadSnapshot()
→ optional source-port snapshot cache decorator
→ composition-root scoped cache per project/documentation root
→ TTL-based invalidation
→ fail closed on load failures by default
```

This micropasso adds:

- `MR-0002/ADR-0019` to define the Project Documentation Explorer snapshot caching boundary;
- `MR-0002REQ-0052` to require an optional, dependency-free, TTL-based in-memory snapshot cache policy;
- graph relations connecting the decision and requirement to MR-0002.

The implementation was completed as `backend: add Project Documentation Explorer snapshot cache decorator`, adding the source-port cache decorator, local serve TTL configuration, `TTL=0` disabled mode, TTL reuse/reload behavior, fail-closed load/reload behavior and pass-through Markdown body loading. Do not add filesystem watchers, mtime fingerprinting, LRU/cache dependencies, cache mutation endpoints, stale-on-error behavior, frontend query/cache libraries, dynamic RBAC or Base Analysis runtime/storage without a new focused decision and requirement.

## Project Documentation Explorer Live HTTP and Snapshot Caching Closure

This closure micropasso records that the Project Documentation Explorer live HTTP/caching slice is complete and that the reusable operating instructions have been aligned.

Completed in this slice:

- read-only OpenAPI contract and structural OpenAPI gate;
- native Node.js read-only HTTP boundary;
- local serve composition command;
- frontend data-source boundary and explicit live HTTP source activation;
- visible selected-source loading/error behavior;
- typed HTTP error categories and fail-closed unexpected error mapping;
- canonical filesystem source containment including symlink/junction escape rejection;
- optional source-port snapshot cache decorator with `TTL=0` default and fail-closed reload semantics;
- runtime test coverage expanded from 23 to 29 tests across HTTP, frontend source selection, filesystem source canonicalization and snapshot caching;
- milestone tag `project-documentation-explorer-live-http-hardening-complete` on the live HTTP hardening commit;
- Programmer and LLM governed development guides aligned with the reusable Project Documentation Explorer pattern.

Remaining candidate work is intentionally separate:

- URL state/deep-linking for filters and detail selection;
- generated snapshot payload/schema validation;
- strict OpenAPI validation with a dedicated tool decision;
- AccessContext/WorkspaceContext refinement;
- governed how-to guide format validation if guide conventions need deterministic enforcement;
- child-project documentation profile/scaffolding under MR-0003;
- MR-0004 Base Analysis command/query/storage design.

The next workstream must be explicitly selected and represented by focused ADRs, requirements and graph relations before implementation.

## Child Project Governed Lifecycle and Management Boundary Micropasso

This document-only micropasso defines the next child-project workstream before any skeleton generator, UI implementation, repository adapter, RBAC runtime, or threat-analysis execution gate is added.

The intended lifecycle is:

```text
governed child-project skeleton
→ standard Project Model registries, bodies, graph and taxonomy declarations
→ ADR/requirement/graph justification for work
→ reserved pre-code threat-analysis readiness stage
→ implementation code with requirement/ADR traceability
→ governed gates and lifecycle status reporting
```

This micropasso adds:

- `MR-0003/ADR-0002` to define the child-project document-first governed lifecycle and platform management boundary;
- `MR-0003REQ-0006` for the governed child-project skeleton;
- `MR-0003REQ-0007` for document-first lifecycle enforcement;
- `MR-0003REQ-0008` for child-project code traceability policy;
- `MR-0003REQ-0009` for the threat-analysis-ready pre-code gate placeholder;
- `MR-0003REQ-0010` for standard Project Model source declaration;
- `MR-0003REQ-0011` for document-source containment controls;
- `MR-0003REQ-0012` for the child-project management UI boundary;
- `MR-0003REQ-0013` for platform-only Child Projects navigation;
- `MR-0003REQ-0014` for child-project lifecycle status views;
- `MR-0003REQ-0015` for RBAC-ready backend capability boundaries;
- graph relations connecting the decision and requirements to `MR-0003`.

No code is changed by this step. A follow-up documentation clarification adds `MR-0003/ADR-0003` to make explicit that child projects reuse the same Project Model, registry models, body formats, graph model and controlled taxonomy model as threat-forge instead of introducing a separate document-source manifest. The next safe implementation step is a standard Project Model skeleton/source validator for child projects, with no skeleton generator, UI, RBAC runtime, repository adapter, Base Analysis execution, STRIDE, STRIDE-AI, or application-code generation until separate ADRs and requirements authorize them.

## Child Project Standard Project Model Reuse Clarification Micropasso

This document-only micropasso corrects the child-project source-control direction before implementation work starts.

The clarified lifecycle is:

```text
governed child-project skeleton
→ standard Project Model registries, governed bodies, graph records, body-format declarations and controlled taxonomy registries
→ ADR/requirement/graph justification for work
→ reserved pre-code threat-analysis readiness stage
→ implementation code with requirement/ADR traceability
→ governed gates and lifecycle status reporting
```

This micropasso adds:

- `MR-0003/ADR-0003` to define child projects as standard Project Model repositories rather than repositories with a custom document-source manifest;
- `MR-0003REQ-0016` for standard Project Model reuse;
- `MR-0003REQ-0017` for controlled taxonomy reuse and governed local taxonomy extensions;
- `MR-0003REQ-0018` for the platform child-project registry boundary, distinct from child internal Project Model registries;
- graph relations connecting the decision and requirements to `MR-0003`.

It also corrects earlier wording around `MR-0003REQ-0010` and `MR-0003REQ-0011`: child-project document-source control is based on validating the same Project Model roots and models used by threat-forge, not on introducing a separate child-project-specific manifest format.

No code is changed by this step. The next safe implementation step is a child-project standard Project Model skeleton/source validator.


## Reusable Project Model Validator Boundary Micropasso

This document-only micropasso defines how child-project validation must reuse threat-forge's existing Project Model validators instead of introducing a parallel child-project checker family.

The intended validation direction is:

```text
explicit child-project repository root
→ contained `docs/reference/project-model/` root
→ shared Project Model validators and registries
→ minimal child-project standard skeleton validation profile
→ deterministic report for future child-project lifecycle status
```

This micropasso adds:

- `MR-0003/ADR-0004` to define the reusable Project Model validator boundary for child projects;
- `MR-0003REQ-0019` for reusable Project Model validation over a target root;
- `MR-0003REQ-0020` for child-project root containment validation;
- `MR-0003REQ-0021` for validator reuse instead of duplicated child-project rule sets;
- `MR-0003REQ-0022` for the standard child-project skeleton validation profile;
- graph relations connecting the decision and requirements to `MR-0003`.

No code is changed by this step. The next safe implementation step is a small child-project standard Project Model skeleton validator that accepts an explicit child-project root, resolves the standard project-model root, rejects containment escapes, and reuses existing threat-forge validators wherever practical. Do not add a skeleton generator, UI, RBAC runtime, repository cloning, Base Analysis, STRIDE, STRIDE-AI, new dependencies, TypeScript migration, or application-code generation in that implementation step.

## Child Project Standard Project Model Skeleton Validation Tooling Micropasso

This implementation micropasso adds the first child-project validation tool without introducing a parallel child-project document model.

The tool validates:

- an explicit child-project repository root;
- containment of `docs/reference/project-model/` under that root;
- the standard Project Model skeleton required by threat-forge reuse;
- required governance registries for macro requirements, body formats, taxonomies, ADR governance, Requirement governance and graph indexing;
- at least one macro-requirement Requirement registry, ADR registry and graph registry;
- delegated root-aware validation through existing threat-forge validators for Requirement registry fields, code traceability and orphan governed body files;
- negative fixtures for missing skeleton paths and lexical traversal root input.

This step intentionally does not generate a child-project skeleton, clone repositories, add UI, add RBAC runtime, execute threat analysis, add a custom child-project manifest, migrate to TypeScript, add dependencies, or define a new family of child-project-specific validators.

## Child Project Management Storage Port and SQLite Adapter Boundary Micropasso

This document-only micropasso defines where managed child-project platform state belongs before adding a database, backend API, UI or skeleton-generation action.

The selected direction is:

```text
child-project canonical documentation
→ remains in the child repository standard Project Model

platform operational management state
→ is stored through a backend port
→ initially implemented by a SQLite adapter
→ replaceable by another database adapter later
```

This micropasso adds:

- `MR-0003/ADR-0005` to define the child-project management storage port and SQLite adapter boundary;
- `MR-0003REQ-0023` for the child-project management storage port;
- `MR-0003REQ-0024` for the initial SQLite adapter boundary;
- `MR-0003REQ-0025` for the operational child-project lifecycle read model;
- `MR-0003REQ-0026` for database portability and RBAC-ready operation boundaries;
- graph relations connecting the decision and requirements to `MR-0003`.

No runtime code, database dependency, schema migration, backend endpoint, UI, RBAC runtime, child-project skeleton generator, repository cloning, or child-project commit/push runner is added by this step.

The next safe implementation step is a small backend child-project management storage port and in-memory/fake adapter test seam, followed by an initial SQLite adapter behind the same port. The service must keep using `Controller -> Service -> Port -> Adapter` and must not expose SQLite details to controllers, UI contracts or Project Model validators.

## Child Project Management Storage Port Backend Micropasso

This implementation micropasso adds the first backend child-project management storage boundary without adding a SQLite adapter, database schema, HTTP API, UI, repository cloning, skeleton generation or RBAC runtime.

The implementation introduces:

- a child-project management contract module for child project records, repository location, governance profile, lifecycle policy, check runs, gate results, violations and operational state list read models;
- a child-project store port module that defines the replaceable storage adapter method surface used by future services;
- runtime tests proving that the contracts normalize defaults and that an adapter is accepted only when it implements the complete port;
- graph traceability from `MR-0003REQ-0023`, `MR-0003REQ-0025` and `MR-0003REQ-0026` to the new backend source modules and verification artifact.

SQLite remains a future adapter behind this port. Child project Project Model registries, ADR, requirements, bodies and graphs remain canonical in each child repository; the backend storage boundary only models operational platform state used by future backend services and UI read models.

## SQLite Child Project Store Adapter Backend Micropasso

This implementation micropasso adds the first SQLite-backed child-project management storage adapter behind the `ChildProjectStorePort`.

The implementation introduces:

- a SQLite adapter module using Node's built-in `node:sqlite` binding and no additional npm dependency;
- contained adapter responsibility for child-project operational tables, check runs, gate results and violations;
- persistence of child project records through the previously defined storage port rather than through controllers or UI contracts;
- runtime tests proving storage-port conformance, child-project persistence, check-run persistence, latest operational state derivation and foreign-key rejection for unknown child projects;
- graph traceability from `MR-0003REQ-0024`, `MR-0003REQ-0025` and `MR-0003REQ-0026` to the SQLite adapter and runtime verification artifact.

This step intentionally does not add an HTTP controller, service orchestration, frontend UI, RBAC runtime, repository cloning, skeleton generation, child-project check execution, child-project governed commit/push, database vendor lock-in outside the adapter, or canonical ADR/Requirement/graph storage in SQLite. Child project Project Model registries, ADR, requirements, bodies and graphs remain canonical in each child repository.

## Child Project Management Service Read Model Backend Micropasso

This implementation micropasso adds the first service layer for child-project management operational state without adding HTTP routes, frontend UI, repository cloning, skeleton generation, child-project check execution or RBAC persistence.

The implementation introduces:

- a child-project management service module that depends only on `ChildProjectStorePort`;
- read-model operations for listing child-project operational states and reading one child project by id;
- write orchestration methods for registering a child project record and recording a check run through the port;
- capability-list shaping for future RBAC without binding the service to a concrete policy database;
- runtime tests using an in-memory port-shaped adapter to prove that the service is independent from SQLite;
- graph traceability from `MR-0003REQ-0025` and `MR-0003REQ-0026` to the service module and verification artifact.

The service preserves the selected `Controller -> Service -> Port -> Adapter` pattern. SQLite remains inside the adapter added in the previous micropasso; canonical child project Project Model registries, ADR, requirements, bodies and graphs remain in the child repository rather than in platform storage.

## Child Project Management Read-only API Backend Micropasso

This implementation micropasso exposes the first read-only backend API boundary for child-project management operational state without adding frontend UI, child-project creation actions, repository cloning, skeleton generation, check execution or governed child-project commit/push.

The implementation introduces:

- a typed child-project management error boundary for stable HTTP error mapping;
- a bootstrap registered-user access policy for read-only child project list/status capabilities;
- a child-project management controller that depends on the service and policy only;
- read-only route descriptors for `GET /api/child-projects` and `GET /api/child-projects/:id`;
- a native Node.js read-only HTTP adapter for the route descriptors;
- a child-project management module composition root that wires service, store port, SQLite adapter, policy, controller and routes;
- OpenAPI contract coverage for the child-project management read-only endpoints;
- runtime tests proving route composition, capability enforcement, read-only HTTP behavior, list responses, detail responses and not-found mapping.

The API remains read-only. It does not register child projects through HTTP, write checks through HTTP, create SQLite records directly in controllers, run child-project validators, generate skeletons, clone repositories, mutate child project Project Model files, perform Git operations, add UI routes or implement final dynamic RBAC persistence.
