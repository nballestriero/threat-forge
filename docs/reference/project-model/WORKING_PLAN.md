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

The Project Documentation Explorer now has a governed read-only OpenAPI contract under `MR-0002/ADR-0012` and `MR-0002REQ-0045`, plus a dependency-free structural validation gate under `MR-0000/ADR-0008` and `MR-0000REQ-0023`.

The active objective for this micropasso is to close the OpenAPI contract and structural validation gate setup in this working plan after the successful contract definition and runner integration.

The Base Analysis runtime/storage/API direction remains parked. It should resume only after the next workstream is explicitly selected and its ADR/requirements/graph are prepared.

The immediate governance themes are now:

1. keep `repo:check` healthy as the local and CI safety baseline before routine commit/push operations;
2. preserve the OpenAPI contract as the canonical HTTP boundary before adding a live HTTP server;
3. avoid adding audit, license, secrets, deployment, strict OpenAPI validation dependencies or runtime stacks without focused requirements and graph relations;
4. preserve document-first order: ADR/Requirement/Graph before each new tool, API, UI or runtime implementation;
5. keep the frontend pragmatic: colocated features, custom hooks, lightweight data clients and context only where lifecycle requires it.

## Current Micropasso

Close the Project Documentation Explorer OpenAPI contract and structural validation gate setup after implementation of the governed read-only contract and the dependency-free `docs:openapi-contract` runner gate.

This micropasso is intentionally document-only: it updates the working plan to reflect that `MR-0002/ADR-0012` and `MR-0002REQ-0045` define the Project Documentation Explorer read-only OpenAPI boundary, and that `MR-0000/ADR-0008` and `MR-0000REQ-0023` validate that contract structurally through `npm run docs:openapi-contract`.

No new server HTTP implementation, strict OpenAPI dependency, UI route, Base Analysis storage/API, STRIDE overlay, RBAC model, deployment, audit, license or secrets scanning workflow is introduced by this step.

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

## Pending Decisions

The requirement-model and common body-format architecture decisions are now represented by ADRs.

Any new decision must be added to the relevant decision registry and graph before derived requirements or implementation work starts.

Before implementing the first Governance Console interfaces and APIs, keep the initial MR-0007 registered-user policy behind the documented capability/access-policy boundary. Future dynamic RBAC remains deferred, but React pages must not hardcode permanent role checks.

The MR-0002/OpenAPI read-only HTTP contract for the Project Documentation Explorer now exists as `MR-0002/ADR-0012`, `MR-0002REQ-0045`, and `docs/reference/api/openapi/threat-forge.openapi.yml`. Future HTTP server implementation must conform to this contract rather than introducing ad-hoc routes or payloads.

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

The contract is stored at `docs/reference/api/openapi/threat-forge.openapi.yml` and currently covers the read-only documentation list, filters, and entity detail operations. It does not implement a live HTTP server.

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

The Project Documentation Explorer OpenAPI contract and dependency-free structural validation gate have been implemented. Future strict OpenAPI validation with a dedicated third-party tool must be introduced through a separate decision and dependency governance step.

## Pending Validators / Gates

Current governed local gates are:

```text
npm run docs:graph-format
npm run docs:pages
node tools/docs/check-docs-structure.mjs
npm run docs:adr-registry-fields
npm run docs:requirement-registry-fields
npm run docs:code-traceability
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

Future gates should be added only after their requirements, graph relations and implementation artifacts exist. Candidate future work remains strict OpenAPI validation with a dedicated tool decision, snapshot payload validation, YAML parser hardening, audit/license/secrets scanning and broader test coverage, but none of these is part of the OpenAPI structural gate closure micropasso.

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
npm run docs:repo-operation-governance
npm run docs:body-format-registry
npm run docs:markdown-body-parser
npm run docs:adr-body-format
npm run docs:requirement-body-format
npm run docs:append-first
```

## Next Suggested Step

Commit this OpenAPI contract and structural validation gate closure through the governed runner.

Recommended governed commit command:

```text
npm run repo:commit-push -- "docs: close OpenAPI contract validation setup"
```

After this closure, the next safe path is to choose a new small implementation workstream instead of continuing implicitly. Good candidates are:

1. backend Project Documentation Explorer read-only HTTP server that conforms to the existing OpenAPI contract;
2. strict OpenAPI validation policy and tool decision before introducing a third-party OpenAPI validator;
3. frontend URL state for filters/detail deep-linking;
4. AccessContext/WorkspaceContext replacement for remaining hardcoded bootstrap assumptions;
5. snapshot payload validation for the Project Documentation Explorer generated frontend snapshot.

The recommended next workstream is the backend Project Documentation Explorer read-only HTTP server, because the API contract and structural contract gate now exist. The implementation must keep controller/service/port/adapter boundaries and must not let controllers instantiate concrete adapters.

Do not implement Base Analysis runtime/storage/API, STRIDE/STRIDE-AI overlays, complex RBAC, deployment or broad CI tooling until the next workstream is selected and represented by focused ADRs, requirements and graph relations.

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
