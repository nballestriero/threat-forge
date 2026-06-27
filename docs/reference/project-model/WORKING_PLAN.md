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

The child-project governance foundation has been closed and milestone-tagged as `project-model-child-project-governance-foundation-complete` on HEAD `5649e72`.

That foundation established the following MR-0003 decision chain:

- `MR-0003/ADR-0007` — parent/child ownership and governed taxonomy responsibility boundary;
- `MR-0003/ADR-0008` — mandatory child-project governance baseline;
- `MR-0003/ADR-0009` — child-project archetypes and governance capability model;
- `MR-0003/ADR-0010` — provisional child-project governance profiles and gate applicability classes;
- `MR-0003/ADR-0011` — gate applicability and profile registry contract.

The active objective is now to realign the working plan before new implementation work starts.

This alignment records the ordered path from the foundation milestone to the next safe implementation sequence:

```text
1. preserve the child-project governance foundation as a closed milestone;
2. carry forward expert-review quality constraints before adding new tools;
3. elevate taxonomy visibility and usage semantics as a cross-cutting priority;
4. add governed child-project governance registries and a small validator before orchestration;
5. expose taxonomy values and usage in the Project Documentation Explorer before relying on taxonomy-driven UI or analysis workflows;
6. add a gate-planning tool before running full child-project gate orchestration;
7. resume Base Analysis only after the governance registries, taxonomy semantics and planning outputs are deterministic.
```

The previous Project Documentation Explorer, JSDoc, live HTTP, caching and child-project demo workstreams remain closed. They remain available as validation surfaces and dogfooding evidence, but they are no longer the active planning topic.

The Base Analysis runtime/storage/API direction remains parked. It should resume only after the registry, taxonomy and gate-planning workstreams below are explicitly completed or reprioritized through a focused governance decision.

## Quality Constraints Carried Forward

The earlier expert-review analysis is carried forward as planning constraint, not as a new canonical decision by itself.

Near-term work must preserve these quality rules:

- prefer schema-first contracts before large tools, runtime flows or UI behavior;
- use controlled vocabularies for critical values instead of free strings;
- distinguish strong deterministic gates from advisory quality signals;
- avoid treating tag noise, lexical overlap or similarity as blocking errors until tuning and migration rules are explicit;
- keep provenance, freshness, `canonical_for`, lifecycle/status and authority semantics explicit when a document or registry value claims to be canonical;
- make unknown fields, invalid enum values and unregistered taxonomy/tag values detectable with clear file/field/value diagnostics;
- preserve graph health and declared relationships rather than relying on unstructured prose inference;
- keep every new gate dogfooded inside threat-forge before using it to govern child projects.

## Taxonomy Planning Note

Taxonomies are a cross-cutting product and governance concern.

They must not be treated as opaque enum files, free tags or UI-only dropdown lists.

For threat-forge and governed child projects, taxonomy values should become visible governed contracts with at least:

```text
id
label / display name
description
intended use / function
accepted/deprecated/superseded semantics
allowed usage fields
validation behavior
UI/report/filter surfaces
example usage
extension namespace and mapping when a child project specializes a platform taxonomy
```

This note affects the next workstreams because governance profiles, applicability classes, capabilities, validation surfaces, analysis methods, Base Analysis element kinds, STRIDE categories and STRIDE-AI categories all depend on controlled values that users must be able to inspect and understand in the interface.

The Project Documentation Explorer must therefore evolve from showing that taxonomy records exist to showing what each taxonomy contains, which values are accepted or deprecated, where each value is valid, and how the value affects gates, reports, filters, menus and future analysis workflows.

## Current Micropasso

Align the working plan after the `project-model-child-project-governance-foundation-complete` milestone.

This micropasso is document-only and updates only this working plan.

It does not add ADRs, requirements, graph records, registry files, validators, APIs, frontend behavior, Base Analysis runtime, STRIDE, STRIDE-AI, child-project orchestration or taxonomy runtime implementation.

The purpose is to decide the order of work after the child-project governance foundation and to carry forward two planning constraints:

```text
expert-review quality constraints
+ taxonomy values as governed, UI-visible contracts
```

The next implementation-bearing workstream should not start until this plan is aligned and committed.

## Current Workstream Order

The recommended order is:

1. `docs: align working plan after child project governance foundation milestone` — this document-only alignment.
2. `docs/tooling: add child project governance registry files and validator` — initial registry files for applicability classes, capabilities, gates, profiles and validation surfaces, plus a small deterministic validator.
3. `docs/tooling: define taxonomy usage metadata registry contract` — make taxonomy value usage semantics explicit before UI or analysis workflows depend on them.
4. `backend/frontend: expose and render taxonomy values and usage in Explorer` — show accepted/deprecated values, descriptions, usage fields, UI/report/filter surfaces and extension mappings.
5. `tooling: plan child project governance gates from profile registry` — compute gate plans with pass/fail/warn/planned/not_applicable/unsupported evidence before executing full child gates.
6. `docs/backend: resume Base Analysis model/runtime planning` — only after governance registries, taxonomy semantics and planner output are deterministic.
7. `docs/backend/frontend: STRIDE overlay planning and implementation` — after Base Analysis is stable enough to provide canonical elements, boundaries, flows and evidence.
8. `docs/backend/frontend: STRIDE-AI overlay planning and implementation` — after AI/RAG/agent capabilities, taxonomy contracts and Base Analysis inputs are stable.
9. quality hardening backlog — parser hardening, stronger graph/link validation, provenance automation, coverage expansion, lint/formatting and future advisory-to-gate promotions.

## Completed Milestones

- Child-project governance foundation milestone `project-model-child-project-governance-foundation-complete`, tagged on `5649e72` after `repo:check` passed and the working tree was clean.
- Parent-child ownership and governed taxonomy responsibility boundary, represented by `MR-0003/ADR-0007` and `MR-0003REQ-0031` through `MR-0003REQ-0036`.
- Mandatory child-project governance baseline, represented by `MR-0003/ADR-0008` and `MR-0003REQ-0037` through `MR-0003REQ-0042`.
- Child-project archetypes and governance capability model, represented by `MR-0003/ADR-0009` and `MR-0003REQ-0043` through `MR-0003REQ-0048`.
- Provisional child-project governance profiles and gate applicability classes, represented by `MR-0003/ADR-0010` and `MR-0003REQ-0049` through `MR-0003REQ-0054`.
- Gate applicability and profile registry contract, represented by `MR-0003/ADR-0011` and `MR-0003REQ-0055` through `MR-0003REQ-0060`.

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

The requirement-model and common body-format architecture decisions are represented by ADRs.

The child-project governance foundation is closed through `MR-0003/ADR-0011` and milestone-tagged as `project-model-child-project-governance-foundation-complete`.

Do not revise that foundation opportunistically. Future work must instantiate it through focused registry, validator, planner, UI or analysis decisions.

Near-term pending decisions, in order, are:

1. whether the initial child-project governance registry files should be introduced as pure documentation records first or together with a small validator in the same micropasso;
2. the exact schema/shape for taxonomy usage metadata so taxonomy values become explainable contracts rather than opaque enum strings;
3. the Explorer API/view-model shape needed to expose taxonomy values, accepted/deprecated semantics, usage fields and child extension mappings;
4. the first gate-planning output contract before any tool executes a full set of child-project gates;
5. the re-entry point for Base Analysis once registry, taxonomy and planner outputs are deterministic.

The expert-review quality constraints remain planning guidance: schema-first, controlled vocabularies, clear provenance/freshness semantics, explicit authority/canonical ownership, deterministic diagnostics and separation between strong gates and advisory quality signals.

The taxonomy visibility note is a priority before Base Analysis and STRIDE/STRIDE-AI implementation: taxonomy values must become inspectable contracts, not only internal enum strings used by filters or validators.

Any new decision must be added to the relevant decision registry and graph before derived requirements or implementation work starts.

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

Current selected implementation sequence after the child-project governance foundation:

1. add initial child-project governance registry files and a validator for the registry contract;
2. define and validate taxonomy usage metadata before taxonomy-driven UI, gate or analysis behavior depends on it;
3. expose taxonomy values, usage, accepted/deprecated semantics and child-extension mappings in the Project Documentation Explorer;
4. add a gate-planning tool that reads the profile/gate/capability registries and emits an execution plan with evidence before executing full child-project gates;
5. resume Base Analysis planning only after the registry, taxonomy and planner layers are deterministic;
6. add STRIDE and STRIDE-AI overlays after Base Analysis and analysis-method applicability semantics are stable.

Expected future implementation areas remain:

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

The Project Documentation Explorer OpenAPI contract, dependency-free structural validation gate, native HTTP read-only server, local serve composition command, frontend data-source boundary, live HTTP opt-in UI, typed HTTP error mapping, filesystem source canonicalization, optional TTL-based snapshot cache decorator and focused JSDoc static type-checking pilot have been implemented. Future strict OpenAPI validation with a dedicated third-party tool, default frontend API switch, URL-state/deep-linking, generated OpenAPI client, snapshot payload validation, child-project source adapters, broader cache policy, broader JSDoc type-checking beyond Explorer or repository-wide TypeScript migration must be introduced through separate decisions or focused requirements as appropriate.

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
npm run docs:child-project-standard-project-model
npm run docs:child-project-demo-workspace
npm run docs:child-project-demo-registration
npm run docs:child-project-management-api-serve
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

The next safe step is to add initial child-project governance registry files and a small deterministic validator for the registry contract already defined by `MR-0003/ADR-0011`.

Recommended scope:

1. create initial registry files under `docs/reference/project-model/registers/child-project-governance/` for applicability classes, capabilities, gates, governance profiles and validation surfaces;
2. keep values small and based on the already-accepted MR-0003 decisions;
3. add a validator that checks required fields, unique IDs, cross-references and allowed status/applicability values;
4. include positive and negative fixture coverage;
5. wire the validator into `repo:check` only after the tool is deterministic and dogfooded inside threat-forge.

Do not implement full child-project gate orchestration yet.

Do not resume Base Analysis runtime/storage yet.

Do not implement taxonomy UI yet, but keep taxonomy usage metadata as the next high-priority planning step after the governance registry validator because taxonomy values must be readable, meaningful and UI-visible before analysis workflows rely on them.

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

## Child Projects Read-only Frontend Page Micropasso

This implementation micropasso adds the first visible Child Projects frontend page in the Governance Console without adding child-project creation, repository cloning, skeleton generation, check execution, Project Documentation Explorer switching for child roots, or governed child-project commit/push operations.

The implementation introduces:

- a Child Projects read-only React page under `frontend/src/MR-0003/child-project-management/`;
- a frontend client port that can read `GET /api/child-projects` and `GET /api/child-projects/:id` when explicitly configured for HTTP mode;
- a static empty preview client so the frontend remains buildable and visible without starting backend services;
- frontend state helpers for searching child projects and summarizing latest lifecycle status;
- platform-only navigation from the shared Governance Console shell to the Child Projects page;
- graph traceability from `MR-0003REQ-0012`, `MR-0003REQ-0013`, `MR-0003REQ-0014`, `MR-0003REQ-0015`, `MR-0003REQ-0025` and `MR-0003REQ-0026` to the new frontend implementation artifacts.

The page consumes only normalized operational-state read models. It does not read SQLite directly, inspect child-project repositories, parse child Project Model files, run validators, register projects, create skeletons, mutate platform storage, or execute Git operations. Live data remains selected by frontend environment configuration; the default static preview intentionally shows an empty registered-project state until backend data is configured or a child project is registered in a later micropasso.
## Child Project Demo Seed and Resettable Workspace Boundary Micropasso

This document-only micropasso defines how threat-forge will provide a safe learning/demo child project without confusing platform source code with a governed child-project working copy.

The selected model is hybrid:

```text
examples/child-projects/minimal-governed-child-project/
→ versioned demo seed/template

.threat-forge/workspaces/demo-child-project/
→ generated, resettable runtime workspace ignored by git
```

This micropasso adds:

- `MR-0003/ADR-0006` for the child-project demo seed and resettable workspace model;
- `MR-0003REQ-0027` for the versioned demo seed template;
- `MR-0003REQ-0028` for the resettable generated runtime workspace;
- `MR-0003REQ-0029` for the safe demo reset operation;
- `MR-0003REQ-0030` for the production child-project external workspace policy;
- graph relations connecting the decision and requirements to `MR-0003`.

This step intentionally does not create the seed files, add `.gitignore` entries, implement reset commands, register a demo project in SQLite, run validators from backend actions, add UI create/reset/check actions, switch Project Documentation Explorer to child roots, clone repositories, or implement governed child-project commit/push.

The next safe implementation step is a tooling micropasso that creates the minimal governed child-project seed and a reset command that copies it into `.threat-forge/workspaces/demo-child-project/` with strict path containment and standard child-project skeleton validation.

## Micropasso: demo child project reset workspace tooling

Status: planned implementation boundary converted into tooling.

- Add versioned seed under `examples/child-projects/minimal-governed-child-project/`.
- Add generated runtime workspace ignore rule for `.threat-forge/workspaces/`.
- Add reset command `npm run child-project:demo:reset`.
- Add self-test gate `npm run docs:child-project-demo-workspace` to prove reset can generate a valid child Project Model without mutating the repository working tree.
- Keep SQLite registration, backend reset actions, UI reset buttons and Project Documentation Explorer child-root opening as later micropassi.

## Micropasso: demo child project SQLite registration tooling

Status: planned implementation boundary converted into tooling.

- Add demo child project SQLite registration command `npm run child-project:demo:register`.
- Store platform operational demo state under ignored `.threat-forge/state/child-project-management.sqlite`.
- Keep generated demo workspace files under ignored `.threat-forge/workspaces/demo-child-project/`.
- Register the demo through the child project management service and `ChildProjectStorePort`, not by writing SQL from UI or controllers.
- Add self-test gate `npm run docs:child-project-demo-registration` to prove registration produces a readable latest operational state without mutating the default runtime workspace or database.
- Keep HTTP serving of the SQLite-backed demo state, UI reset buttons, child Project Documentation Explorer opening and governed child-project commit/push as later micropassi.

## Micropasso: child project management SQLite-backed API serve command

Status: planned implementation boundary converted into backend serve tooling.

- Add local backend serve command `npm run backend:child-project-management:serve` for the read-only Child Project Management HTTP API.
- Read operational state from `.threat-forge/state/child-project-management.sqlite` by default through the existing module composition root and SQLite adapter.
- Preserve bootstrap registered-user headers and read-only endpoints `GET /api/child-projects` and `GET /api/child-projects/:id`.
- Add self-test gate `npm run docs:child-project-management-api-serve` that starts a bounded local server on an ephemeral port, seeds a temporary SQLite database, and verifies list/detail responses for `demo-child-project`.
- Keep frontend launch convenience, UI reset buttons, child Project Documentation Explorer opening and governed child-project commit/push as later micropassi.

## Micropasso: demo child Project Model Explorer launch guidance

Status: planned implementation boundary converted into frontend/demo serve guidance.

- Add local demo Project Documentation Explorer serve script `npm run backend:project-documentation-explorer:serve:demo` pointing at `.threat-forge/workspaces/demo-child-project/`.
- Add child-project detail guidance that tells the operator how to serve the demo child Project Model and configure the frontend HTTP data source.
- Add a UI navigation action from the selected `demo-child-project` detail to the existing Project Documentation Explorer page.
- Keep browser-side filesystem access forbidden: the frontend still reads only through configured HTTP/snapshot client ports.
- Keep automatic process orchestration, UI reset buttons, child-project write APIs, governed child-project commit/push and full multi-child Explorer routing as later micropassi.

## Child Project Parent-Child Ownership and Governed Taxonomy Boundary Micropasso

This document-only micropasso defines a single responsibility boundary for managed child projects, platform operational state and governed taxonomy usage before adding full child-project gate orchestration or taxonomy UI rendering.

The decision establishes that a child project remains the canonical owner of its own Project Model, MR/ADR/REQ records, graph records, governed Markdown bodies, application code, local evidence, authorized taxonomy extensions and approved analysis artifacts that describe its system. Threat-forge owns registration, operational state, latest checks, gate aggregation, management UI, platform policy/capability/RBAC, demo/reset/check orchestration, cross-project reports, draft/candidate review state and platform persistence.

The micropasso also fixes the taxonomy boundary: platform taxonomies are shared governed contracts for validation, UI, filters, reports and methodology overlays; child projects may reuse or extend them only with governed namespaces, descriptions, intended-use metadata and mapping to platform/base values when cross-project aggregation needs common semantics. Taxonomy values must become visible UI contracts showing accepted/deprecated state, descriptions, allowed fields, validation behavior, UI surfaces and examples.

This step adds:

- `MR-0003/ADR-0007` for the parent-child ownership and governed taxonomy responsibility boundary;
- `MR-0003REQ-0031` for child-project canonical content ownership;
- `MR-0003REQ-0032` for platform operational management ownership;
- `MR-0003REQ-0033` for governed child-project taxonomy reuse and extension;
- `MR-0003REQ-0034` for taxonomy value visibility and UI handoff;
- `MR-0003REQ-0035` for draft/candidate versus approved analysis artifact ownership;
- `MR-0003REQ-0036` for managed child-project governance profiles.

This step intentionally does not change taxonomy schemas, validators, frontend rendering, child-project gate orchestration, analysis write-back, repository mutation, branch protection, or governed child-project commit/push.

The next safe implementation/documentation steps are to define child-project governance profiles and then extend taxonomy registry metadata/view-models so the Project Documentation Explorer can show taxonomy values, accepted/deprecated semantics and usage surfaces.

## Child Project Mandatory Governance Baseline Micropasso

This document-only micropasso defines the universal baseline that every managed child project must satisfy before threat-forge evaluates language-specific, runtime-specific or methodology-specific gates.

The baseline is intentionally independent from final Base Analysis, STRIDE, STRIDE-AI and future methodology gates. It requires every managed child project to provide governed Doc-as-Code, explicit decision-to-artifact traceability semantics and mandatory Threat Analysis lifecycle presence from the beginning of development.

This step adds:

- `MR-0003/ADR-0008` for the mandatory child-project governance baseline;
- `MR-0003REQ-0037` for the Doc-as-Code baseline;
- `MR-0003REQ-0038` for decision-to-artifact traceability when implementation artifacts exist;
- `MR-0003REQ-0039` for explicit no-code applicability evidence when implementation artifacts are absent;
- `MR-0003REQ-0040` for mandatory Threat Analysis lifecycle presence;
- `MR-0003REQ-0041` for selecting concrete Threat Analysis methods by project capability;
- `MR-0003REQ-0042` for capability-specific gates extending, but never replacing, the mandatory baseline.

This step intentionally does not implement child-project gate orchestration, capability detection, Base Analysis, STRIDE, STRIDE-AI, language-specific adapters, UI enforcement, repository write-back or governed child-project commit/push.

The next safe documentation step is to define child-project archetypes and capability facets so future governance profiles can classify which additional gates are mandatory, optional, warning-only or not applicable while preserving this baseline.

## Child Project Archetypes and Capability Model Micropasso

This document-only micropasso defines how threat-forge classifies child projects before finalizing child-project gate applicability.

The decision keeps the mandatory child-project baseline stable while allowing additional controls to be composed from project capabilities. Archetypes provide user-facing defaults and documentation guidance, but capability facets are the authoritative basis for future gate selection. Language ecosystems select concrete adapters only after capabilities and baseline rules are known.

This step adds:

- `MR-0003/ADR-0009` for the child-project archetypes and governance capability model;
- `MR-0003REQ-0043` for archetype classification;
- `MR-0003REQ-0044` for capability facets;
- `MR-0003REQ-0045` for evidence state and confidence semantics;
- `MR-0003REQ-0046` for language ecosystem adapter boundaries;
- `MR-0003REQ-0047` for provisional governance profile composition;
- `MR-0003REQ-0048` for capability-specific analysis method planning.

This step intentionally does not implement capability detection, final gate matrices, language adapters, UI changes, Base Analysis, STRIDE, STRIDE-AI, child-project write-back, governed child-project commit/push or remote CI enforcement.

The next safe documentation step is to define provisional child-project governance profiles and gate applicability classes using this capability model, while keeping Base Analysis, STRIDE, STRIDE-AI and future methodology gates explicitly provisional until their implementations are available.

## Child Project Provisional Governance Profiles and Gate Applicability Classes Micropasso

This document-only micropasso defines how threat-forge classifies gate applicability and validates gates before final child-project gate orchestration exists.

The decision keeps child-project governance provisional while requiring every developed governance gate to have a validation surface inside threat-forge before it can be used to govern child projects. It also formalizes threat-forge dogfooding: platform capabilities implemented by threat-forge must be exercised by threat-forge self-checks, self-tests, fixtures, generated snapshots, contract tests or runtime tests.

This step adds:

- `MR-0003/ADR-0010` for provisional child-project governance profiles and gate applicability classes;
- `MR-0003REQ-0049` for gate applicability classes;
- `MR-0003REQ-0050` for platform self-governance validation surfaces;
- `MR-0003REQ-0051` for child-project gate validation surface requirements;
- `MR-0003REQ-0052` for not-applicable and unsupported gate evidence semantics;
- `MR-0003REQ-0053` for the provisional governance profile catalog;
- `MR-0003REQ-0054` for threat-forge dogfooding of developed governance capabilities.

This step intentionally does not implement the gate orchestrator, capability detectors, final gate matrix, Base Analysis, STRIDE, STRIDE-AI, language adapters, UI changes, child-project repository mutation, governed child-project commit/push or remote CI enforcement.

The next safe documentation or tooling step is to define a gate applicability/profile registry contract, then implement a read-only profile catalog and a demo/self-test path that reports applicability classes, validation surfaces and evidence without enforcing final method-specific gates.

## Child Project Gate Applicability and Profile Registry Contract Micropasso

This document-only micropasso defines the registry contract needed before implementing child-project gate orchestration.

The decision turns provisional profile and applicability decisions into a future governed registry family for gate applicability classes, governance capabilities, governance gates, governance profiles, validation surfaces and execution planning results. These registries will let threat-forge calculate why a gate is required, planned, unsupported, platform-only or not applicable without hardcoding project-type branches in tools.

This step adds:

- `MR-0003/ADR-0011` for the gate applicability and profile registry contract;
- `MR-0003REQ-0055` for the gate registry contract;
- `MR-0003REQ-0056` for the governance profile registry contract;
- `MR-0003REQ-0057` for the capability registry contract;
- `MR-0003REQ-0058` for the validation surface registry contract;
- `MR-0003REQ-0059` for gate execution planning result semantics;
- `MR-0003REQ-0060` for non-applicability and unsupported evidence contracts.

This step intentionally does not add concrete registry files, schemas, validators, capability detectors, gate orchestration, UI changes, Base Analysis, STRIDE, STRIDE-AI, language adapters, child-project repository mutation or final enforcement matrices.

The next safe implementation step is to add the first child-project governance registry files and a validator with positive and negative fixtures before creating an execution-plan preview tool.


## Child Project Governance Registry Files and Validator Micropasso

This mixed documentation/tooling micropasso implements the first concrete child-project governance registry family after `MR-0003/ADR-0011` without adding the final child-project gate orchestrator.

The implementation introduces:

- governed registry files under `docs/reference/project-model/registers/child-project-governance/` for applicability classes, capabilities, governance gates, governance profiles and validation surfaces;
- a deterministic validator `backend/tools/MR-0003/check-child-project-governance-registries.mjs` for required registry shape and cross-registry references;
- negative fixtures proving that missing gate validation surfaces, unknown gate capabilities and unknown profile gate references fail closed;
- a root script `npm run docs:child-project-governance-registries`;
- inclusion of the validator in the governed repository runner so the registry contract is dogfooded by `npm run repo:check`;
- graph traceability from `MR-0003REQ-0055` through `MR-0003REQ-0060` to the validator and verification fixture surface.

This step intentionally does not execute child-project gates, detect capabilities, generate a gate execution plan, implement final gate enforcement, add UI rendering, mutate child-project repositories, add language adapters, or implement Base Analysis, STRIDE or STRIDE-AI.

The next safe implementation step is a read-only execution-plan preview that reads these registries and emits gate applicability, planned/not-applicable/unsupported/pass/fail status, reason and evidence for threat-forge and the demo child project without enforcing final methodology-specific gates.
