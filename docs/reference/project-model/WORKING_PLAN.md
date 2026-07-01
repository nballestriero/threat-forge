# Working Plan

## Current State — Semantic Gate Hardening Priority

Current governed baseline: `06482bd` (`docs: close project-scoped child documentation UI milestone`).

Milestone tag: `project-model-child-documentation-project-scoped-ui-complete`.

The project-scoped child documentation UI flow is complete for the demo end-to-end path:

```text
registered child project
→ child documentation source resolver
→ project-scoped child documentation API
→ selected-child Documents UI route
→ visible live documentation source status
```

The next strategic focus is semantic gate hardening before new feature work. A post-milestone ADR/graph review found issues that current gates do not yet prevent:

- legacy graph records can omit reciprocal ADR ownership relations such as `ADR -> belongs_to -> MR`;
- graph `justifies` relations can drift from `derived_from_decision_id` in requirement registries;
- child-project governance status vocabularies can drift between registries, runtime/API contracts and storage;
- high-impact product/component naming can drift across governed titles and labels;
- real child-project gate execution and future Knowledge Graph ingestion need status, freshness and eligibility semantics before they can be trusted by LLM-assisted development or security analysis.

`MR-0000/ADR-0009` fixes the current decision boundary: semantic gates must be strengthened before real child-project gate execution, child-project Knowledge Graph ingestion, Base Analysis runtime, STRIDE overlays or STRIDE-AI overlays proceed.

`MR-0000/ADR-0011` refines the canonical-terminology hardening approach: open-ended terminology and semantic-drift review is LLM-assisted and advisory first; deterministic gates are introduced only after a finding is human-reviewed, narrowly scoped, governed by ADR/REQ, backed by fixture coverage and connected in the graph.

`MR-0010/ADR-0001` declares the Project Knowledge Governance Manual as a dedicated macro-requirement. This shifts the immediate study workstream from scattered explanations to a governed manual that teaches students, developers and LLM assistants how documentation, graph records, code traceability, contracts, gates, child-project governance and future threat analysis fit together.

### Immediate Project Knowledge Governance Manual Priorities

1. `docs: declare Project Knowledge Governance Manual macro-requirement`
   - Create `MR-0010` as the manual and study-guide macro-requirement.
   - Define initial requirements for manual structure, learning paths, diagram strategy, code-coherence guidance, LLM reading routes and thesis-oriented source boundaries.

2. `docs: add Project Knowledge Governance Manual index and chapter skeleton`
   - Add the first manual index and chapter files.
   - Keep chapters modular, study-oriented and linked to canonical records.

3. `docs: write documentation, graph and code traceability foundations chapters`
   - Explain canonical sources, ADR/REQ/body/graph relationships and how code cannot diverge from documentation.
   - Include versionable diagrams for the ADR → REQ → graph → code → gate flow.

4. `docs: write deterministic gates and LLM-assisted development chapters`
   - Explain active gates, failure modes, contracts, evidence and advisory LLM review boundaries.
   - Define how LLM reading routes support development without replacing deterministic governance.

5. `tooling: validate Project Knowledge Governance Manual index and reading routes`
   - Add deterministic validation only after the manual structure and route records stabilize.

### Immediate Semantic Gate Priorities

1. `docs: define child gate plan, execution, freshness and Knowledge Graph ingestion status model`
   - Separate planning status from execution result status.
   - Separate check-run freshness from pass/fail execution outcomes.
   - Define when a child project is eligible, stale, unavailable or quarantined for Knowledge Graph ingestion.

2. `tooling: enforce controlled vocabulary consistency across registries and contracts`
   - Prevent registry values, Zod/runtime contracts, OpenAPI schemas, storage records and UI states from accepting different vocabularies for the same governed field.
   - Start with child-project governance status vocabularies.

3. `tooling: enforce graph and registry ownership consistency`
   - Require reciprocal `MR -> has_decision -> ADR` and `ADR -> belongs_to -> MR` ownership.
   - Require requirement `derived_from_decision_id` to match canonical `ADR -> justifies -> REQ` graph relations.
   - Preserve future ADR/REQ specialization through explicit secondary semantics, not duplicate ownership.

4. `docs: define LLM-assisted semantic governance review and deterministic promotion boundary`
   - Use governed prompt records for open-ended terminology and semantic-drift review.
   - Keep LLM findings advisory, evidence-linked and non-blocking by default.
   - Promote only narrow, high-confidence, human-reviewed findings to deterministic gates with ADR/REQ/fixture/graph traceability.

5. `tooling: add optional LLM semantic review report generator`
   - Read the governed prompt registry and selected project-model inputs.
   - Emit an advisory report without changing repository files or blocking `repo:check`.
   - Record prompt id/version, input scope, evidence paths, confidence and limitations.

6. `docs: define real child project onboarding and gate execution lifecycle`
   - Decide how real projects are created or registered: local workspace, Git checkout/clone, template or other intake path.
   - Decide profile/type selection and execution timing.
   - Define check-run, gate-result, violation and stale-state persistence before implementing an executor.

7. `docs: define Knowledge Graph ingestion boundary for LLM-assisted development and security analysis`
   - Do not allow dirty, stale or incomplete child-project knowledge to feed GraphRAG, development assistance, Base Analysis, STRIDE or STRIDE-AI.
   - Keep platform knowledge, child-project knowledge and analysis snapshots project-scoped and evidence-linked.

### Parked Until Semantic Gates Are Stronger

The following work remains parked unless explicitly reprioritized by a new ADR:

- real child-project gate executor;
- remote Git onboarding/clone workflow;
- child-project Knowledge Graph ingestion;
- Base Analysis runtime/storage/API;
- STRIDE and STRIDE-AI overlays;
- dynamic RBAC administration.


# Immediate UI Refinement Working Plan

This section defines the next prioritized work after the governed local UI test environment runner.

The current priority is to continue the Governance Console visual refinement started with compact details, shared `InfoPopover`, semantic badges, spacing and local UI test tooling. The next work MUST keep the default UI concise and readable, with deeper explanations available on demand through `i` progressive-disclosure controls.

## Immediate Priorities

1. `frontend: refine governance console navigation icons`
   - Improve the sidebar/menu icons to match the mockup direction.
   - Keep icon definitions centralized through the existing design-system/token approach.
   - Avoid scattered inline SVG definitions in page components.
   - Avoid inline colors.
   - Cover at least Project Documentation, Governance Gate Plans, Child Projects and Threat Analysis navigation entries.
   - Improve active, hover, focus and disabled navigation states without making the UI visually noisy.

2. `frontend/style: centralize semantic UI color tokens`
   - Keep the black/white GitHub/ChatGPT-like baseline.
   - Centralize light semantic accents for success/pass, warning/planned, danger/fail/blocking, info/neutral, active navigation, selected rows and focus/hover states.
   - Reuse existing CSS variables where possible.
   - Avoid one-off component colors.

3. `frontend: normalize status badge semantics`
   - Make badges consistent across Project Documentation Explorer and Governance Gate Plans.
   - Treat pass, accepted, implemented and verified as positive states.
   - Treat planned, candidate and draft as informational states.
   - Treat stale warning, needs more evidence and partially implemented as warning states.
   - Treat fail, rejected and stale blocking as blocking states.
   - Treat unsupported, unknown and not applicable as neutral states.

4. `frontend/style: refine shell navigation and topbar hierarchy`
   - Make sidebar spacing, active item shape, topbar weight and page content rhythm closer to the mockup.
   - Keep the layout simple and readable.
   - Do not introduce new backend behavior.

5. `frontend: show live data source status`
   - Show whether the Project Documentation Explorer UI is using snapshot data or live HTTP data.
   - Show whether Governance Gate Plans are using generated artifacts through the local HTTP backend.
   - Make the state visible during `npm run dev:ui-test:start` sessions.

6. `frontend: link governance explanations to documentation details`
   - Link gate explanations and technical traces to related ADR, requirement and taxonomy details.
   - Keep raw ids secondary.
   - Preserve read-only behavior.

## Guardrails

- Read the relevant body format profiles and registries before adding or editing ADR/REQ bodies.
- Do not infer required body sections.
- Keep all code/tool changes linked through requirement, ADR, graph and JSDoc.
- Keep registries and graphs append-first unless a governed append-first manifest explicitly allows protected changes.
- Keep details behind progressive disclosure when they are not necessary for the default reading path.
- Keep icon, badge and color styling centralized.
- Do not replace `repo:check` with developer convenience tooling.
- Use the governed runner for commit and push.

## Completed UI Foundation

The following UI foundation is complete and should not be lost while refining the menu and visual system:

- Project Documentation Explorer compact list/detail hierarchy.
- Taxonomy fields and taxonomy value explanations available behind `i` controls.
- Governance Gate Plans compact list and inline details.
- Governance plan overview details available behind `i` controls.
- Shared `InfoPopover` behavior for hover, focus and click/tap progressive disclosure.
- Single-column readable popover panels.
- Semantic badge and spacing refinement.
- Governed local UI test environment runner:
  - `npm run dev:ui-test:start`
  - `npm run dev:ui-test:status`
  - `npm run dev:ui-test:stop`

## Handoff Baseline

Latest confirmed baseline after the local UI test environment runner:

- Branch: `master`, tracking `origin/master`.
- Latest confirmed commit: `50da41b tooling: add local UI test environment runner`.
- Repository status after governed push: clean and aligned with `origin/master`.
- Metrics:
  - Macro requirements: 10
  - Taxonomies: 101
  - Requirements: 241
  - ADR: 73
  - Graph nodes: 427
  - SPO relations: 1050
  - Governed Markdown body files: 324
  - Project Documentation Explorer snapshot: 336 items / 336 details
  - Runtime tests: 31 pass



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

The child-project governance plan UI visibility workstream is now closed and milestone-tagged as `project-model-child-governance-plan-ui-visible-complete` on HEAD `bdbbe10`.

This completed the first end-to-end, read-only governance-plan visibility slice for platform and child projects:

```text
child-project governance registries
→ deterministic registry validator
→ profile-driven gate planner
→ generated plan artifacts
→ read-only HTTP API
→ Governance Console UI view
→ project-list/detail navigation and child documentation launch correction
```

The UI-visible milestone established that governance gate plans can be inspected by selecting a platform or child project, viewing profile/target/project details, reviewing gate applicability/status/reason/evidence, and navigating back to the project list without executing gates or mutating child repositories.

The active objective is now explainable governance preparation. The next implementation-bearing work should not add a gate executor yet. It should first make Governance Console values study-oriented and explainable by linking governance-plan concepts back to governed taxonomy, registry and planning-rationale detail views.

The current document-only micropasso defines the semantic boundary for this explainability work in `MR-0003/ADR-0012`, `MR-0003REQ-0061`, `MR-0003REQ-0062` and `MR-0003REQ-0063`.

The recommended next implementation-bearing workstream is:

```text
backend/frontend: expose and render governance concept explanations and gate rationale
```

That workstream should connect visible values such as governance profile, target scope, gate id, capability, applicability class, execution status and validation surface to governed source records, human explanations and gate-selection rationale. Capability and validation-surface values must be presented as explained study concepts, not as raw ids. Each gate should be able to answer what it checks, why it was selected, which capabilities it requires, which surfaces validate it, and how the gate contributes to analyzable documentation and future threat analysis.

The Base Analysis runtime/storage/API direction remains parked. It should resume only after governance-plan concepts and gate rationales are explainable in the UI, or after an explicit decision reprioritizes the executor/orchestrator ahead of taxonomy/registry detail linking.

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

Define the shared UX hierarchy for explainable Project Documentation Explorer taxonomy fields and Governance gate plan explanations before adding more UI code.

This micropasso is document-only. It adds governed ADRs, requirements, body files and graph relations for:

- keeping Project Documentation Explorer filters at the top, document results below the filters and selected details below the list;
- rendering taxonomy-backed document fields with current value, source taxonomy and allowed values with descriptions;
- keeping Governance gate plans as compact gate lists with inline expandable details;
- separating primary semantic gate explanations from secondary technical trace.

This micropasso keeps gate execution, orchestrator behavior, child-project mutation, Base Analysis runtime/storage, STRIDE and STRIDE-AI work parked. It also avoids hardcoding final UI copy or colors. Future implementation must consume backend/registry-provided explanations and reuse shared visual styles or centralized semantic badges.

The next implementation-bearing workstream should implement the documented hierarchy in small UI steps while preserving the read-only Explorer and Governance Console navigation patterns.

## Current Workstream Order

The recommended order from the current baseline is:

1. `frontend: render taxonomy field allowed values in documentation detail` — implement `MR-0002REQ-0057` and `MR-0002REQ-0058` by keeping filters at the top, results below and selected detail below the list while showing current taxonomy value plus allowed values and descriptions.
2. `frontend: improve governance gate explanation hierarchy` — implement `MR-0003REQ-0064` and `MR-0003REQ-0065` by rendering compact gate rows, inline expansion, primary semantic sections and secondary technical trace.
3. `docs: refine taxonomy explanation text for documentation explorer` — progressively improve taxonomy labels, descriptions, functions and security-analysis hints so the new UI has clearer governed content to display.
4. `frontend/style: centralize semantic badges and taxonomy/gate status styles` — only if needed after inspecting existing shared CSS/design-system conventions.
5. `frontend: link governance explanations to Project Documentation Explorer details` — connect gate explanations, taxonomy records, requirements, ADRs and graph references for guided study navigation.
6. `tooling/backend: define child-project governance gate execution result persistence boundary` — decide whether executed results live first as artifacts, SQLite state, or both before implementing execution.
7. `tooling: execute planned child-project governance gates for platform/demo surfaces` — only after the planner, artifact, API and UI explainability layers are deterministic and understandable.
8. `docs/backend: resume Base Analysis model/runtime planning` — only after governance registries, taxonomy semantics, plan visibility and result evidence are deterministic.
9. `docs/backend/frontend: STRIDE overlay planning and implementation` — after Base Analysis is stable enough to provide canonical elements, boundaries, flows and evidence.
10. `docs/backend/frontend: STRIDE-AI overlay planning and implementation` — after AI/RAG/agent capabilities, taxonomy contracts and Base Analysis inputs are stable.
11. quality hardening backlog — parser hardening, stronger graph/link validation, provenance automation, coverage expansion, lint/formatting and future advisory-to-gate promotions.

The registry validator, planner, plan artifact export, read-only API, gate explanation backend, taxonomy explanation backend and first explanation-rendering UIs are completed inputs for this hierarchy-focused workstream.

## Completed Milestones

- Project Documentation Explorer taxonomy field UX hierarchy, represented by `MR-0002/ADR-0023`, `MR-0002REQ-0057` and `MR-0002REQ-0058`, defining filters-top/list-below/detail-below navigation and taxonomy-backed field allowed-value explanations.
- Governance gate plan explanation hierarchy, represented by `MR-0003/ADR-0013`, `MR-0003REQ-0064` and `MR-0003REQ-0065`, defining compact gate rows, inline expansion, semantic explanation order and secondary technical trace.

- Explainable child governance concept boundary, represented by `MR-0003/ADR-0012` and `MR-0003REQ-0061` through `MR-0003REQ-0063`, defining study-oriented concept explanations, gate-selection rationale and capability/validation-surface explanation semantics before executor/orchestrator work.
- Child governance plan UI-visible milestone `project-model-child-governance-plan-ui-visible-complete`, tagged on `bdbbe10` after the Governance Console could render governance gate plans with project selection/detail navigation and child documentation launch correction.
- Governance plan project selection and layout improvement, pushed as `bdbbe10`, with project-list based selection, same-page detail, `Back to projects`, data-source placement immediately below the page heading, long-value wrapping, static demo child visibility and child Project Documentation Explorer launch using the child HTTP source without platform snapshot fallback.
- Child Project Governance Gate Plan UI, pushed as `e34f89f`, adding the first read-only Governance Console view for generated gate plans.
- Child Project Governance Plan read-only API, pushed as `255a36f`, exposing list and detail endpoints for generated gate-plan artifacts and expanding the OpenAPI contract to 7 read-only operations and 31 required schemas.
- Child Project Governance Gate Plan artifact export, pushed as `bc6cc8f`, writing platform-self, demo-child and documentation-only plan artifacts under `artifacts/child-project-governance/gate-plans/`.
- Child Project Governance Gate Planner, pushed as `420702d`, expanding governed profile/capability/gate registries into deterministic planned gate evidence for representative profiles.
- Child Project Governance registry files and validator, pushed as `66e624c`, adding the governed child-project governance registry family and deterministic validator with negative fixtures.

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

The child-project governance foundation is closed through `MR-0003/ADR-0011` and milestone-tagged as `project-model-child-project-governance-foundation-complete`.

The child governance plan visibility slice is closed through the `project-model-child-governance-plan-ui-visible-complete` milestone. It implemented registry validation, planning, artifact export, read-only API and UI visibility without implementing the final gate executor.

Do not revise those foundations opportunistically. Future work must instantiate them through focused registry, taxonomy, UI-detail, executor, persistence or analysis decisions.

Near-term pending decisions, in order, are:

1. the exact UI/API linking model from visible governance-plan values to their governed registry/taxonomy detail records;
2. the exact schema/shape for broader taxonomy usage metadata so taxonomy values become explainable contracts rather than opaque enum strings;
3. whether Governance Console value explanations should reuse Project Documentation Explorer detail endpoints, dedicated registry-detail endpoints, generated snapshot data, or a small composed view-model;
4. the result-persistence boundary for executed child-project governance gates: generated artifacts, SQLite child-project management state, or both;
5. the re-entry point for Base Analysis once registry, taxonomy, planning and UI explainability outputs are deterministic.

The expert-review quality constraints remain planning guidance: schema-first, controlled vocabularies, clear provenance/freshness semantics, explicit authority/canonical ownership, deterministic diagnostics and separation between strong gates and advisory quality signals.

The taxonomy visibility note is a priority before Base Analysis and STRIDE/STRIDE-AI implementation: taxonomy and registry values must become inspectable contracts, not only internal enum strings used by filters, validators or UI badges.

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

The child-project governance plan visibility slice is now implemented through:

1. child-project governance registry files and validator;
2. profile-driven gate planner;
3. generated gate-plan artifact export;
4. read-only governance-plan API;
5. Governance Console governance-plan view with project-list/detail navigation.

The next selected implementation sequence is:

1. link visible governance-plan values to governed taxonomy/registry details;
2. expose broader taxonomy values, usage, accepted/deprecated semantics and child-extension mappings in the Project Documentation Explorer or a dedicated registry-detail view;
3. define the child-project governance execution-result persistence boundary before executing planned gates;
4. add a minimal executor for already-planned platform/demo validation surfaces;
5. resume Base Analysis planning only after the registry, taxonomy, planning, UI explainability and result-evidence layers are deterministic;
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
npm run docs:child-project-governance-registries
npm run docs:child-project-governance-plan
npm run docs:child-project-governance-plan-artifacts
npm run docs:child-project-governance-plan-api-serve
npm run docs:openapi-contract
npm run frontend:build
npm run test:runtime
npm run repo:check
```

The child-project governance visibility gates now validate:

- the child-project governance registry family and cross-registry references;
- deterministic gate planning for representative platform, demo child and documentation-only profiles;
- deterministic generation of read-only gate-plan artifacts;
- the read-only Governance Plan API serve boundary.

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

The OpenAPI structural validation gate now checks `docs/reference/api/openapi/threat-forge.openapi.yml` for the expected read-only operations, required schemas, required operation metadata and allowed HTTP methods. The current contract includes Project Documentation Explorer, Child Project Management and Child Project Governance Plan read-only operations.

The runtime unit test gate now includes HTTP smoke coverage for the Project Documentation Explorer read-only boundary and local serve command, frontend data-source behavior, typed HTTP error behavior, filesystem source canonicalization and snapshot cache behavior in addition to the existing service-level query normalization, graph-derived filtering and governed body loading coverage.

The Project Documentation Explorer JSDoc static type-checking pilot gate now runs a focused `tsc --checkJs` check over selected Explorer source/test files and a negative fixture that verifies field-name drift is rejected. The next governed expansion may add more Explorer files to that same gate, but the gate remains scoped to MR-0002 Explorer files and does not replace runtime boundary validation.

Future gates should be added only after their requirements, graph relations and implementation artifacts exist. Candidate future work remains strict OpenAPI validation with a dedicated tool decision, snapshot payload validation, YAML parser hardening, audit/license/secrets scanning, guide-format validation and broader test coverage, but none of these is part of the current child-governance-plan UI-visible milestone.

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

Current handoff baseline after the latest completed milestone:

```text
Expected branch: master tracking origin/master
Expected HEAD: bdbbe10
Expected tag at HEAD: project-model-child-governance-plan-ui-visible-complete
Expected working tree: clean
Latest milestone scope: child governance plan UI visible
```

Recent commits at handoff:

```text
bdbbe10 frontend: improve governance plan project selection and layout
e34f89f frontend: render child project governance plan view
255a36f backend: serve child project governance plan read-only API
bc6cc8f tooling: export child project governance gate plan artifacts
420702d tooling: plan child project governance gates from profile registry
```

Minimum handoff checks:

```text
git status --short --branch
git rev-parse --short HEAD
git log --oneline -5
git tag --points-at HEAD
git remote -v
npm run repo:check
```

Focused UI smoke-check commands for the current milestone:

```text
npm run docs:child-project-governance-plan-artifacts
npm run backend:child-project-governance-plan:serve
npm run backend:project-documentation-explorer:serve:demo
```

Frontend demo environment:

```text
VITE_CHILD_PROJECT_GOVERNANCE_PLAN_SOURCE=http
VITE_CHILD_PROJECT_GOVERNANCE_PLAN_HTTP_BASE_URL=http://127.0.0.1:4176
VITE_CHILD_PROJECT_DOCUMENTATION_EXPLORER_HTTP_BASE_URL=http://127.0.0.1:4174
npm run frontend:dev
```

Manual UI checks after starting the demo services:

```text
Child Projects shows the Demo Child Project.
Open Project Documentation Explorer from the demo child shows the child documentation, not threat-forge platform documentation.
Governance gate plans shows project cards instead of a project dropdown.
Selecting a project loads the detail in the same page.
Back to projects returns to the project list.
Data source appears immediately below the Governance gate plans heading and subheading.
Long profile/target/gate values wrap inside their cards.
```

A complete handoff ZIP can be generated with:

```text
npm run context:zip -- --include-git --name threat-forge-handoff-with-git-after-governance-plan-ui-visible.zip
```

## Next Suggested Step

The taxonomy-backed document field allowed-value rendering slice is now ready to be committed. It implements the Project Documentation Explorer hierarchy by keeping filters at the top, keeping document detail below the list, and showing controlled field current values together with allowed values supplied by the backend view-model.

The next safe implementation-bearing step is to improve the Governance gate plans hierarchy using the same principle: compact first, explanation second, technical trace last.

Recommended scope:

1. keep Governance gate plans read-only;
2. keep the selected project context visible;
3. render the gate list as compact cards first;
4. show name, description and status before deeper details;
5. keep inline expand/collapse behavior for each gate;
6. order expanded content as why selected, what it checks, checked areas, required capabilities, expected result and threat-analysis contribution;
7. move raw ids, evidence markers and registry references into a collapsed Technical trace section;
8. avoid hardcoding gate meanings in JSX;
9. avoid adding gate execution, orchestration, mutation or Base Analysis runtime/storage.

Suggested commit title:

```text
frontend: improve governance gate explanation hierarchy
```

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

## Child Project Governance Gate Planner Micropasso

This tooling micropasso implements the first read-only gate planning preview after the child-project governance registry validator.

The implementation introduces:

- a deterministic planner `backend/tools/MR-0003/plan-child-project-governance-gates.mjs` that reads the governed child-project governance registry family and expands a selected profile into a gate plan;
- a root script `npm run child-project:governance:plan` for operator-visible planning of a selected profile and target scope;
- a self-test script `npm run docs:child-project-governance-plan` that plans representative platform, demo child project and documentation-only child project profiles;
- a new governed gate `child_governance_gate_plan` and validation surface `governance_gate_planner_self_test` so the planner itself is dogfooded by `npm run repo:check`;
- graph traceability from `MR-0003REQ-0059` and `MR-0003REQ-0060` to the planner and governed runner.

The planner reports gate id, applicability class, planned status, reason, required capabilities, validation surfaces and evidence. It can emit human-readable output or JSON through `--json`.

This step intentionally does not execute real gates, persist plan artifacts, write SQLite state, mutate child-project repositories, detect capabilities automatically, add backend API endpoints, render the plan in the frontend, add language adapters, or implement Base Analysis, STRIDE or STRIDE-AI.

The next safe step is to export planner output as a stable artifact for platform-self and demo-child profiles, then serve that read-only plan through the Child Project Management API before adding the UI view.

## Child Project Governance Gate Plan Artifact Export Micropasso

This tooling micropasso makes the read-only governance gate plan consumable by later backend and frontend work without introducing the final gate executor.

The implementation extends the planner so it can write deterministic JSON plan artifacts under an ignored generated-artifact directory when an output directory is provided. It also introduces:

- a root script `npm run docs:child-project-governance-plan-artifacts` that exports representative platform-self, demo-child-project and documentation-only child-project plans;
- a governed validation surface `governance_gate_plan_artifact_export` proving that generated plan artifacts can be produced during `npm run repo:check` without mutating tracked files;
- a governed gate `child_governance_gate_plan_artifacts` selected by the `platform_self_governance` profile;
- graph traceability from the generated-artifact self-test surface back to `MR-0003REQ-0059` and `MR-0003REQ-0060`.

Generated artifacts remain operational evidence, not canonical Project Model source. The canonical contract remains the child-project governance registry family; the generated plans are read-only projections that future APIs and UI views may consume.

This step intentionally does not execute real gates, persist gate results in SQLite, mutate child projects, expose a backend API endpoint, render a UI view, detect capabilities automatically, add language adapters, or implement Base Analysis, STRIDE or STRIDE-AI.

The next safe step is to serve the generated or computed gate plan through a read-only Child Project Management API endpoint, then render the plan in the UI.

## Child Project Governance Gate Plan Read-only API Micropasso

This backend micropasso serves generated child-project governance gate plan artifacts through a read-only HTTP boundary so the upcoming UI can consume the same deterministic plan evidence produced by the governed runner.

The implementation introduces:

- a local serve command `backend/src/MR-0003/child-project-governance-plan/child-project-governance-plan.serve.mjs`;
- a self-test script `npm run docs:child-project-governance-plan-api-serve` that starts the API on an ephemeral local port and verifies list, detail, forbidden and read-only method behavior;
- a local operator serve script `npm run backend:child-project-governance-plan:serve`;
- read-only endpoints for listing generated gate plan artifacts and fetching one plan by governance profile and target scope;
- OpenAPI contract coverage for the new read-only plan endpoints;
- a governed validation surface `governance_gate_plan_api_self_test` and gate `child_governance_gate_plan_api` selected by `platform_self_governance`;
- graph traceability from `MR-0003REQ-0014`, `MR-0003REQ-0015`, `MR-0003REQ-0059` and `MR-0003REQ-0060` to the API serve boundary and self-test evidence.

Generated plan artifacts remain evidence, not canonical source. The API reads artifacts produced from the governed registry family; it does not execute real gates or mutate child-project repositories.

This step intentionally does not persist gate results in SQLite, implement the final executor/orchestrator, detect capabilities automatically, render the frontend UI, add language adapters, or implement Base Analysis, STRIDE or STRIDE-AI.

The next safe step is a frontend governance-plan view that consumes the read-only API or generated preview data and renders gate status, applicability, reason, evidence and validation surface details.

## Child Project Governance Gate Plan UI Micropasso

This frontend micropasso renders generated child-project governance gate plans in the Governance Console without introducing the final executor/orchestrator.

The implementation introduces:

- a read-only frontend page `frontend/src/MR-0003/child-project-governance-plan/ChildProjectGovernancePlanPage.jsx`;
- a frontend client port `frontend/src/MR-0003/child-project-governance-plan/child-project-governance-plan.client.js` that can use static preview mode or the governed HTTP API;
- deterministic state helpers in `frontend/src/MR-0003/child-project-governance-plan/child-project-governance-plan.state.js` for list filtering, gate filtering, result counts and summary normalization;
- a platform-only `Governance Plans` navigation entry protected by the `child_project_governance_plan.read` capability;
- a UI that renders plan list, selected profile/target scope, result summary, capability states, gate status, applicability class, reason, evidence and validation surfaces;
- a governed validation surface `governance_gate_plan_frontend_view` and gate `child_governance_gate_plan_ui` selected by `platform_self_governance`;
- graph traceability from `MR-0003REQ-0014`, `MR-0003REQ-0015`, `MR-0003REQ-0059` and `MR-0003REQ-0060` to the new frontend page, client and state helper modules.

The UI consumes generated evidence through a client port. It does not execute gates, mutate child projects, write SQLite state, read artifact files directly from the browser, detect capabilities automatically or change canonical Project Model registries.

This step intentionally does not persist gate results, implement the final executor/orchestrator, link every UI value to the taxonomy/registry detail view, add language adapters, or implement Base Analysis, STRIDE or STRIDE-AI.

The next safe step is to link governance plan values back to registry/taxonomy detail views or add a minimal UI launch recipe for running the governance-plan API alongside the Governance Console.

## Child Project Governance Plan Project Selection and Layout Micropasso

This frontend refinement micropasso completes the first usable Governance gate plans navigation pattern after the initial read-only UI.

The implementation refines the Governance Console so the Governance gate plans page presents platform and child projects as selectable cards rather than as a dropdown. Selecting a project loads its detail in the same page, shows project/profile/target/gate-plan data, and provides a `Back to projects` return action. The data-source status is placed immediately below the page heading and subheading, and long profile, target, capability, gate and validation-surface values wrap inside their cards rather than overflowing.

The same refinement also preserves child-project visibility in the Child Projects page and ensures the demo child `Open Project Documentation Explorer` path uses the child Project Documentation Explorer HTTP source instead of falling back to threat-forge platform snapshot data. If the child documentation server is not available, the UI must fail clearly rather than silently showing platform documentation.

This step intentionally does not add a gate executor, persist gate results, mutate child projects, change canonical registries at runtime, add language adapters, or implement Base Analysis, STRIDE or STRIDE-AI.

It closes the UI-visible planning slice now tagged as `project-model-child-governance-plan-ui-visible-complete`.


## Explainable Child Governance Plan Backend View-model Micropasso

This backend micropasso implements the first read-only study-oriented view-model after `MR-0003/ADR-0012` and the explainable child governance concept boundary.

The implementation extends the existing Child Project Governance Gate Plan API detail endpoint so it still returns the generated artifact, but also returns an `explanation` object derived from governed child-project governance registries. The explanation makes profile, target scope, result status, gate rationale, required capabilities, validation surfaces and applicability classes understandable without requiring a user to read raw YAML registry ids.

The view-model explains:

- what the selected governance profile means and why it matters;
- what target scope means for platform-self, demo-child and child-project plans;
- what each gate checks;
- why each gate was selected by the profile/target-scope/applicability chain;
- what required capabilities mean for threat-analysis readiness;
- what validation surfaces are and which commands, fixtures, APIs, generated artifacts or UI builds provide evidence;
- why planned, pass, fail, warning, unsupported and not-applicable status values must not be confused.

The API remains read-only. It reads generated plan artifacts and governed registry files, returns a UI-safe explanation view-model, and verifies the explanation contract through the existing bounded API self-test. It does not execute gates, mutate child projects, persist gate results, change canonical registries at runtime, implement the final executor/orchestrator, add language adapters, or implement Base Analysis, STRIDE or STRIDE-AI.

The next safe step is a frontend refinement that renders this `explanation` payload in the Governance gate plans page as inline help, expandable gate rationale and field-level guidance for capabilities and validation surfaces.

## Taxonomy-backed Child Governance Explanation Model Micropasso

This backend/data-model micropasso moves gate explanation knowledge out of frontend copy and into governed child-project governance registry metadata consumed by the backend explanation view-model.

The implementation enriches the existing child-project governance registries so gate-plan explanations can answer study-oriented questions directly from governed data:

- `governance-gates.registry.yml` now declares, per gate, the checked objects, checked entity types, checked paths, expected result and threat-analysis contribution;
- `validation-surfaces.registry.yml` now declares, per validation surface, the checked area, checked artifacts, checked paths and why that surface matters;
- `governance-capabilities.registry.yml` now declares, per capability, what the capability enables and why it matters for threat-analysis readiness;
- the child-project governance registry validator now fails closed when these explanation fields are missing from canonical registry records;
- the existing Child Project Governance Gate Plan API explanation view-model now reads and returns those governed fields instead of relying on generic fallback text;
- the OpenAPI contract describes the enriched explanation payload so the frontend can render checked objects, entity types, paths, expected verification output and technical trace without hardcoding their meaning.

For example, the `governed_body_format` gate now explains that it checks governed Markdown body files for ADR records and Requirement records under `docs/reference/project-model/body/decisions/**` and `docs/reference/project-model/body/requirements/**`, using the body format registry as part of the checked model.

The API remains read-only. It still serves generated gate plan artifacts and registry-derived explanations; it does not execute gates, mutate child projects, persist gate results, implement the final executor/orchestrator, add language adapters or implement Base Analysis, STRIDE or STRIDE-AI.

The next safe step is a frontend refinement that consumes the enriched backend explanation payload and replaces raw evidence markers such as `validation_surface.threat_forge_repo_check exists` with human labels, checked areas, expected verification output and a separate technical trace section.

## Project Documentation Explorer Taxonomy Field Hover Detail Refinement Micropasso

This frontend refinement keeps taxonomy-backed document metadata compact while preserving access to governed allowed-value explanations.

The implementation changes the Project Documentation Explorer detail view so taxonomy-backed fields show the current value inline by default and move allowed values, raw ids, source taxonomy and value descriptions behind a small information icon. The help surface opens on mouse hover, keyboard focus or click/tap, and closes when focus or hover leaves the help target. This follows the explainable UI hierarchy defined for `MR-0002REQ-0058`: the primary detail page shows the field and current value first, while deeper meaning remains available on demand.

The refinement introduces shared stylesheet classes for the compact field rows, information icon and popover rather than placing inline colors or local styling in JSX. It preserves the existing top filter bar, list/detail placement and backend-driven taxonomy view-model; it does not change taxonomy registries, OpenAPI, backend contracts, snapshot generation semantics, mutation behavior, or governed Markdown body loading.

The next safe implementation step remains the Governance gate plan UI hierarchy refinement: compact gate rows first, semantic explanation sections on expansion, and technical trace at the end.

## Project Documentation Explorer Taxonomy Value Hover Detail Refinement Micropasso

This frontend refinement applies the same progressive-disclosure rule to taxonomy group detail pages.

The implementation changes taxonomy value rows so the primary page shows only the value label, raw id and an information icon. Longer registry-derived descriptions, function text, UI presentation tokens, graph presentation tokens and security-analysis hints move into the on-demand help surface. The help surface opens on mouse hover, keyboard focus or click/tap, matching the taxonomy-backed document field behavior.

This keeps taxonomy group pages readable when values such as `icon_token`, `color_token`, `graph_shape_token` and `graph_edge_style_token` have explanatory text. The frontend still renders backend-supplied taxonomy meaning only; it does not hardcode taxonomy semantics, mutate registries, change backend contracts, change snapshot generation semantics or add taxonomy governed Markdown bodies.

The next safe implementation step remains the Governance gate plan UI hierarchy refinement: compact gate rows first, semantic explanation sections on expansion, and technical trace at the end.

## Governance Gate Plan Explanation Hierarchy Frontend Refinement Micropasso

This frontend refinement applies the explainable UI hierarchy defined by `MR-0003REQ-0064` and `MR-0003REQ-0065` to the Governance gate plans page.

The implementation keeps the gate list compact by default: each gate row continues to show the gate label, short explanation, status and a single show/hide details action. When a gate is expanded, the detail flow now presents semantic sections in study order:

- why the gate is selected for the current profile and target scope;
- what the gate checks;
- checked areas as a collapsible validation-surface subsection;
- required capabilities as a collapsible capability subsection;
- expected result;
- contribution to threat-analysis readiness;
- planning status as secondary detail;
- technical trace at the end.

The refinement keeps raw ids and planner evidence out of the primary reading path. It uses shared stylesheet classes for gate sections and disclosures instead of inline styling, preserving the uniform Governance Console visual language.

This step does not add a gate executor, persist gate results, mutate child projects, change governed registries at runtime, alter backend API contracts, add language adapters, or implement Base Analysis, STRIDE or STRIDE-AI.

The next safe step is to continue the visual-system cleanup from the mockup reference: centralize reusable information-icon, badge and semantic disclosure patterns so Project Documentation Explorer and Governance gate plans share the same compact/detail behavior.

## Governance Gate Plan Overview Progressive-Disclosure Refinement Micropasso

This frontend refinement keeps the top-level governance plan explanation compact while preserving access to the full study-oriented meaning.

The implementation replaces the always-open plan explanation blocks with compact overview rows for Study guide, Profile, Target scope, Result and Field guide. Each row shows the current headline value first and moves the longer explanation behind a small information icon that opens on mouse hover, keyboard focus or click/tap. The detailed meaning remains derived from the backend explanation payload; the frontend only changes how that meaning is disclosed.

This keeps the top of the Governance gate plans page readable without losing the governed explanation model. It aligns the page with the same progressive-disclosure behavior already used for taxonomy-backed document fields and taxonomy value details in the Project Documentation Explorer.

The refinement uses shared stylesheet classes and the same information-icon interaction pattern rather than introducing a separate visual language. It does not change gate selection semantics, backend contracts, registry content, gate execution behavior, child-project mutation, snapshot generation semantics, or threat-analysis runtime features.

The next safe step is to continue the visual-system cleanup from the mockup reference: centralize reusable information-icon, badge and semantic disclosure patterns so Project Documentation Explorer and Governance gate plans share the same compact/detail behavior.


## Information Popover Readability Refinement Micropasso

This frontend style refinement keeps information-icon panels readable by rendering their detail text in a single vertical column.

The implementation changes only shared stylesheet behavior for the existing popover/help surfaces. Metadata grids inside information popovers no longer inherit multi-column page layouts; labels, meanings, raw values, source registries, allowed values and field-guide descriptions stack vertically so users can read them without scanning across columns. Badge lists inside popovers wrap naturally instead of forcing dense horizontal reading.

This refinement preserves the compact primary UI, hover/focus/click information-icon behavior, backend-provided explanation payloads, gate selection semantics, taxonomy semantics, registries, OpenAPI contracts and runtime behavior. It does not add new UI logic, mutate project data, execute gates, or change snapshot generation semantics.

The next safe step remains visual-system cleanup from the mockup reference: centralize reusable information-icon, badge and progressive-disclosure patterns so Project Documentation Explorer and Governance gate plans share the same compact/detail behavior.


## Shared Information Popover Pattern Consolidation Micropasso

This frontend cleanup centralizes the information-icon progressive-disclosure behavior used by Project Documentation Explorer and Governance gate plans.

The implementation introduces a shared `InfoPopover` component under the MR-0002 design-system boundary and replaces page-local hover/focus/click wrappers in taxonomy field rows, taxonomy value rows and governance plan overview rows. The semantic content remains owned by each page and its backend-provided view-model; the shared component owns only the reusable interaction pattern, accessible button, open/closed state and popover panel wiring.

This reduces duplication while preserving the approved UX rule: the primary page stays compact, the current value remains visible, and longer explanations open only when the user hovers, focuses or clicks the information icon. The existing single-column popover styling remains shared so details stay readable.

The cleanup does not change backend contracts, registry semantics, taxonomy values, gate-planning behavior, snapshot generation semantics, child-project mutation behavior, or threat-analysis runtime features.

The next safe step is visual-system refinement from the mockup reference: unify badges, semantic color tokens and spacing across Project Documentation Explorer and Governance gate plans without introducing page-specific inline styling.


## Semantic Badge and Visual Rhythm Refinement Micropasso

This frontend style refinement applies the mockup reference as a visual-system cleanup without changing read-model semantics.

The implementation adds shared visual tokens for surface, border and light semantic status treatments; refines badge weight and status-specific background/border accents; improves card, row, information-icon and gate-section spacing; and keeps the monochrome Governance Console style while adding subtle semantic cues for success, warning, danger and informational states.

The refinement remains centralized in the shared stylesheet. Feature pages continue to use existing design-system components and existing backend-provided view-model values. No inline colors, page-local design systems or hardcoded taxonomy/gate semantics are introduced.

This step does not change backend contracts, registry content, gate planning, snapshot generation, child-project mutation behavior, documentation loading, or threat-analysis runtime features.

The next safe step is a governed developer-experience tool that starts and stops the local UI test environment in one command pair, covering the Project Documentation Explorer backend, Governance gate plan backend and frontend dev server without replacing `repo:check`.


## Local UI Test Environment Runner Micropasso

This governed developer-experience micropasso adds a repeatable way to start, inspect and stop the local UI test environment used for Governance Console review.

The implementation introduces `tools/dev/run-ui-test-environment.mjs` and exposes three npm scripts:

- `npm run dev:ui-test:start`
- `npm run dev:ui-test:status`
- `npm run dev:ui-test:stop`

The start command generates child-project governance plan artifacts through the existing governed artifact-generation script, then spawns the existing Project Documentation Explorer backend, Child Project Governance Plan backend and Vite frontend. The frontend is started with explicit HTTP live data-source environment variables so UI review uses the live backends instead of stale snapshots where appropriate.

The tool writes PID metadata and logs under `.threat-forge/state/ui-test-environment/`, which is generated platform operational state. The stop command terminates only the recorded spawned processes and removes the PID registry file. The status command reports recorded PIDs, log paths and liveness.

This tool is local developer convenience. It does not replace `repo:check`, mutate governed registries, execute final governance gates, persist gate results, write child-project state, commit files, push to git, run Base Analysis, STRIDE or STRIDE-AI.


## Local UI Test Environment Runner Windows Spawn Fix Micropasso

This tooling fix keeps the local UI test environment runner cross-platform by invoking npm through a shell on Windows when starting foreground setup commands or long-running local services.

The original runner worked in POSIX-like verification but could report `npm.cmd run docs:child-project-governance-plan-artifacts exited with null` on Windows because `.cmd` process spawning may not return a normal exit status without shell handling. The fix preserves non-Windows behavior, adds Windows-only shell execution, and improves startup diagnostics when a foreground command fails to start or exits due to a signal.

This does not change the runner boundary, generated artifacts, backend services, frontend data-source configuration, governed registries, gate-planning semantics, repository verification, commit behavior or push behavior.

## Governance Console Navigation Icon Refinement Micropasso

This frontend visual-system refinement improves the Governance Console sidebar while keeping the UI compact and governed by shared MR-0002 design-system boundaries.

The implementation keeps sidebar navigation records in the centralized `shellNavigation` token registry, resolves concrete glyphs only through the shared `Icon` adapter and renders a consistent icon cell in the shared shell. Navigation entries may declare semantic icon tone and compact state labels in the token registry, but feature pages do not choose sidebar icons directly.

Active, hover and disabled states now use shared stylesheet classes and CSS custom properties rather than inline colors or page-local styles. The selected page is highlighted with a lightweight surface treatment instead of a heavy full-contrast block, while disabled future capabilities remain legible and visibly planned without becoming interactive.

This step does not add page-local SVG assets, introduce an external icon dependency, change route/capability policy behavior, implement disabled future pages, alter backend contracts, mutate registries at runtime, or change Project Documentation Explorer and Governance gate plan read-model semantics.

The next safe step is to continue the mockup-driven visual-system cleanup by centralizing broader semantic UI color tokens before normalizing status badge semantics.

## Semantic UI Color Token Centralization Micropasso

This frontend style micropasso centralizes Governance Console color semantics before the next badge and shell hierarchy refinements.

The implementation adds semantic color groups to the shared MR-0002 design-system token registry and maps the shared stylesheet root to matching CSS custom properties. Component selectors now consume semantic custom properties for common text, surface, border, focus, shadow, navigation, brand and status accent treatments instead of repeating raw color values throughout the stylesheet.

The visual appearance is intended to remain stable and lightweight. This step does not change layout, spacing, typography, badge classification behavior, backend contracts, snapshot generation, child-project mutation behavior, or threat-analysis runtime features.

Known bug to resolve in a dedicated micropasso: when a child project is selected and the user opens Documents, the UI can still show threat-forge platform documents through a fallback path. The child-project documentation view must not silently fall back to platform documents; it should show the child-project source, an explicit empty state, or an explicit source error.

The next safe step is to normalize status badge semantics using the centralized status accent tokens, then address the child-project documentation no-fallback bug with a focused backend/frontend data-source micropasso.


## Status Badge Semantic Normalization Micropasso

This frontend design-system micropasso normalizes shared Governance Console status badge semantics without changing backend status values.

The implementation adds a centralized status-badge semantic registry to the MR-0002 design-system token module. Raw read-model values such as `accepted`, `approved`, `pass`, `fail`, `planned`, `not_applicable`, `unsupported`, `not_implemented` and `partially_implemented` now map to compact UI tones, readable labels and shared icon tokens. The shared `StatusBadge` component uses that registry to emit stable semantic tone classes while preserving the raw status class only as metadata. Unknown values remain visible through a neutral fallback instead of disappearing or inheriting a misleading success/danger treatment.

The shared stylesheet renders badge tone classes with centralized CSS custom properties introduced by the semantic color token micropasso. Project Documentation Explorer, Child Projects and Governance gate plans continue to pass raw status values from their read-models; feature pages do not choose badge colors directly.

This step does not change backend contracts, generated status ids, child-project gate-planning semantics, filters, routing, snapshot loading, child-project mutation behavior or threat-analysis runtime features.

Known bug remains for a dedicated micropasso: when a child project is selected and the user opens Documents, the UI must not silently fall back to threat-forge platform documents.

The next safe step is to refine shell navigation and topbar hierarchy, or to switch to the child-project documentation no-fallback bug if functional correctness takes priority over visual polish.

## Shell Navigation and Topbar Hierarchy Refinement Micropasso

This frontend shell refinement applies the approved mockup direction to the shared Governance Console chrome after the navigation icon, semantic color and status badge foundations.

The implementation tightens the sidebar brand and navigation rhythm, keeps the active navigation state lightweight, and renders a clearer topbar hierarchy with context text, read-only status and non-mutating utility affordances. Topbar utility affordances are declared in the shared design-system token registry and rendered through the shared semantic icon adapter, so feature pages still do not own shell icons, inline colors or local navigation markup.

This step remains visual and structural. It does not add notification, help or profile behavior; it does not change routing, capabilities, authentication, backend contracts, snapshot generation, child-project mutation behavior, threat-analysis runtime behavior, or child-project document data-source selection.

Known bug remains for a dedicated micropasso: when a child project is selected and the user opens Documents, the UI must not silently fall back to threat-forge platform documents.

The next safe step is to address the child-project documentation no-fallback bug with a focused backend/frontend data-source micropasso, then show explicit live data-source status in the shell.

## Completed UI Refinement Micropasso — Child Project Documentation No-Fallback Boundary

The child-project documentation no-fallback bug has been addressed with a dedicated MR-0002 micropasso.

Commit target: `frontend: prevent child project documentation fallback to platform documents`.

Governed records added:

- `MR-0002/ADR-0029` — Child Project Documentation Source Fail-Closed Boundary.
- `MR-0002REQ-0069` — Child Project Documentation source isolation.
- `MR-0002REQ-0070` — Child Project Documentation unavailable UI state.

The implementation separates platform and child Project Documentation Explorer frontend client construction. The child-project documentation client no longer defaults to the platform Project Documentation Explorer endpoint. If the child documentation HTTP base URL is not explicitly configured, the UI uses a fail-closed unavailable client that reports `effective_source: unavailable` and `fallback: false` and rejects reads instead of loading the platform snapshot.

Local demo use now requires explicitly configuring the child documentation source before opening child documents. If the source is missing or unreachable, the Project Documentation Explorer renders a child-project-specific unavailable/error state rather than valid-looking ThreatForge platform documents.

The next safe step is to show live data-source status more prominently in the shell and page header so users can see whether they are reading platform snapshot, platform HTTP, child HTTP, or unavailable child source data.

## Demo Child Project Documentation UI Test Source Micropasso

This local developer-environment micropasso makes the Demo Child Project document view useful after the no-fallback fix.

Commit target: `dev: serve demo child project documentation source in local UI test environment`.

Governed records added:

- `MR-0002/ADR-0030` — Demo Child Project Documentation UI Test Source Boundary.
- `MR-0002REQ-0071` — Local UI Test Demo Child Documentation Service.
- `MR-0002REQ-0072` — Local UI Test Frontend Child Documentation Configuration.

The implementation extends `npm run dev:ui-test:start` so it resets the generated demo child-project workspace, starts a dedicated read-only Project Documentation Explorer backend for that workspace on a separate endpoint, and configures the Vite frontend with an explicit child Project Documentation Explorer HTTP base URL.

The platform Project Documentation Explorer remains on its platform endpoint, while the demo child Project Documentation Explorer uses a separate endpoint. This keeps the no-fallback boundary intact: the frontend can read demo child documents during local review only because a child-specific source is running, not because it substituted platform records.

This step remains local developer convenience. It does not implement production per-child source routing, mutate governed child Project Models, add write APIs, or change child-project registration storage.

The next safe step is to replace the single demo child documentation URL with a project-scoped backend resolver that reads registered child-project source metadata for real projects.

## Registered Child Project Documentation Source Resolver Micropasso

This backend micropasso moves real child project documentation source selection out of the single demo-only frontend URL pattern and into a project-scoped backend resolver.

Commit target: `backend: resolve child project documentation sources from registered projects`.

Governed records added:

- `MR-0003/ADR-0014` — Child project documentation source resolver boundary.
- `MR-0003REQ-0066` — Registered child project documentation source resolver.
- `MR-0003REQ-0067` — Child project documentation source unavailable semantics.

The implementation adds a child project documentation source resolver under the MR-0003 child project management boundary. The resolver derives source metadata from registered child project records: local child projects with a valid Project Model root inside the registered workspace resolve to an available filesystem descriptor, while missing local paths, Git-only registrations, absent Project Model roots and escaping Project Model roots resolve to explicit non-available states.

The child project management read model now carries this derived documentation source metadata. This prepares the next project-scoped documentation API slice without requiring the frontend to infer child sources from a global environment variable and without reintroducing platform documentation fallback behavior.

This step does not add a child documentation proxy endpoint, clone Git repositories, mutate child Project Models, replace the demo child local UI test source, add write APIs or change frontend routing.

The next safe step is to add a read-only project-scoped child documentation API that uses the registered source resolver and returns either child Project Documentation Explorer data or the explicit resolver status.

## Project-Scoped Child Documentation API Micropasso

This backend micropasso exposes the registered child project documentation resolver through read-only project-scoped HTTP endpoints.

Commit target: `backend: expose project-scoped child documentation API`.

Governed records added:

- `MR-0003/ADR-0015` — Project-scoped child documentation API boundary.
- `MR-0003REQ-0068` — Project-scoped child documentation collection endpoint.
- `MR-0003REQ-0069` — Project-scoped child documentation detail endpoint.

The implementation adds child-project-scoped documentation routes under the existing Child Project Management API boundary. The endpoints use the registered child project source resolver, compose a filesystem-backed Project Documentation Explorer service for the selected local child workspace, and return collection or entity detail view-models for that child project only.

Unavailable, unconfigured or unsupported child documentation sources return explicit typed HTTP errors. They do not substitute threat-forge platform Project Documentation Explorer snapshots, endpoints or generated frontend snapshots.

This step remains read-only. It does not add child project write APIs, clone Git repositories, mutate child Project Models, replace the existing platform Project Documentation Explorer endpoints, or change frontend routing yet.

The next safe step is to update the frontend child project document view to load selected child documents through these project-scoped platform endpoints instead of a global child documentation URL.

## Frontend Project-Scoped Child Documentation Loading Micropasso

This frontend integration micropasso completes the selected child project document flow by routing the UI through the project-scoped Child Project Management API introduced in the previous backend step.

Commit target: `frontend: load selected child project documents through project-scoped API`.

Governed records added:

- `MR-0003/ADR-0016` — Child project documentation frontend project-scoped routing boundary.
- `MR-0003REQ-0070` — Frontend project-scoped child documentation loading.
- `MR-0003REQ-0071` — Local UI test child management API wiring.

The implementation adds a Project Documentation Explorer-compatible frontend client that reads child documents from `/api/child-projects/{childProjectId}/documentation` and child entity details from `/api/child-projects/{childProjectId}/documentation/entities/{entityId}`. The Governance Console now keeps the selected child project id in documentation context and uses the project-scoped API for child Documents views when Child Project Management HTTP mode is configured.

If the Child Project Management API is not configured, child project Documents still fail closed with an explicit unavailable state. Platform document views keep their existing snapshot/live HTTP behavior, including platform snapshot fallback where configured. Child project document views do not use platform snapshots, platform documentation endpoints or a single global child documentation URL as fallback.

The local UI test environment now registers the demo child project, starts the Child Project Management API, and configures the frontend with `VITE_CHILD_PROJECT_MANAGEMENT_SOURCE=http` plus the Child Project Management API base URL. The dedicated demo child Project Documentation Explorer service remains available for compatibility with the previous governed local-review requirement, but the primary frontend path now exercises the project-scoped API used by real projects.

This step remains read-only. It does not add write APIs, clone remote repositories, mutate child Project Models, remove platform Project Documentation Explorer endpoints, remove the platform snapshot fallback for platform views, or implement dynamic RBAC administration.

The next safe step is to show explicit source status in the shell/header and then expand real-project registration workflows around the documentation source metadata.

## Live Documentation Data Source Status Micropasso

This frontend visibility micropasso makes the Project Documentation Explorer explicitly show which documentation source is serving the current view.

Commit target: `frontend: show live documentation data source status`.

Governed records added:

- `MR-0003/ADR-0017` — Live documentation data-source status boundary.
- `MR-0003REQ-0072` — Documentation source status metadata contract.
- `MR-0003REQ-0073` — Visible live documentation source status.

The implementation enriches Project Documentation Explorer frontend client data-source state with selected source, effective source, fallback state, source scope, transport, endpoint metadata, child project metadata and live/non-live status. Snapshot-backed platform documentation is identified as generated static data, platform HTTP as live data, HTTP failure fallback as snapshot fallback, project-scoped child documentation as live child-project data and unavailable child documentation as an explicit unavailable state.

The Project Documentation Explorer page renders a compact live documentation source card during loading, loaded and unavailable/error states. This keeps the source visible when a child project is selected, when platform documentation uses the snapshot, and when a configured live source falls back or fails.

This step is UI visibility only. It does not change backend documentation endpoint semantics, add write APIs, remove the platform snapshot fallback for platform views, clone remote projects or implement dynamic RBAC administration.

The next safe step is to close the project-scoped child documentation UI milestone with a governed tag once the visual behavior is manually verified.

## Project-Scoped Child Documentation UI Milestone Closure Micropasso

This document-only milestone closure records that the project-scoped child Project Documentation Explorer flow is complete for the governed local demo slice.

Commit target: `docs: close project-scoped child documentation UI milestone`.

Milestone tag target after the governed commit lands cleanly on `master`: `project-model-child-documentation-project-scoped-ui-complete`.

The closed implementation chain is:

- `07feb97` — `frontend: prevent child project documentation fallback to platform documents`.
- `8c80f26` — `dev: serve demo child project documentation source in local UI test environment`.
- `3a252b8` — `backend: resolve child project documentation sources from registered projects`.
- `9ecb871` — `backend: expose project-scoped child documentation API`.
- `f6c50ee` — `frontend: load selected child project documents through project-scoped API`.
- `875b6ca` — `frontend: show live documentation data source status`.

The completed governed flow is now:

```text
registered child project
→ child documentation source resolver
→ project-scoped child documentation API
→ selected-child Documents UI route
→ visible live documentation source status
```

The milestone is complete when the current HEAD remains clean, governed checks pass, and manual UI review confirms that selecting `Demo Child Project` and opening `Documents` loads child-project documentation through the project-scoped platform API instead of falling back to threat-forge platform documentation.

The closed behavior includes these guarantees:

- child project document views do not use threat-forge platform snapshots or platform documentation endpoints as fallback;
- missing, unsupported or unavailable child documentation sources remain explicit UI states;
- the local UI test tool starts the platform Project Documentation Explorer, demo child Project Documentation Explorer, Child Project Management API, Child Project Governance Plan API and frontend together;
- the frontend selected-child document route uses the Child Project Management API project-scoped documentation endpoints as the primary path;
- the Project Documentation Explorer shows whether the current documentation source is live, snapshot-backed, fallback-backed or unavailable.

The milestone intentionally does not include child Project Model mutation, write APIs, Git repository cloning, remote project onboarding, dynamic RBAC administration, Base Analysis runtime/storage, STRIDE overlays or STRIDE-AI overlays.

The next safe step after tagging the milestone is to expose registered child project documentation source details in the Child Projects UI so real projects can show which workspace/source is registered, whether the source is currently available, and why a source is unavailable before users open the Documents view.

## Child Gate Status Model Micropasso

This document-only semantic hardening micropasso defines the child-project gate planning, execution, freshness and Knowledge Graph ingestion status model before real child gate execution or Knowledge Graph ingestion is implemented.

Commit target: `docs: define child gate and knowledge graph ingestion status model`.

Governed records added:

- `MR-0000/ADR-0010` — Child gate planning, execution, freshness and Knowledge Graph ingestion status model.
- `MR-0000REQ-0028` — Child gate planning status model.
- `MR-0000REQ-0029` — Child gate execution result status model.
- `MR-0000REQ-0030` — Child check-run freshness status model.
- `MR-0000REQ-0031` — Child Knowledge Graph ingestion eligibility status model.
- `child-project-governance-status-model` — Canonical registry for the separated status families.

The status model separates planned gate selection from execution results, check-run freshness and Knowledge Graph ingestion eligibility. Passing execution results are not enough for trusted ingestion when the check run is stale, source evidence is unknown, semantic gates fail, controlled vocabularies diverge or ownership consistency is unresolved. Such child-project knowledge must remain blocked or quarantined rather than exposed to LLM-assisted development or security analysis.

This step does not implement the controlled vocabulary gate, graph ownership gate, child-project executor, SQLite migrations, OpenAPI/runtime enum updates, Knowledge Graph ingestion, Base Analysis, STRIDE or STRIDE-AI.

The next safe step is `tooling: enforce controlled vocabulary consistency across registries and contracts`, using the new status model as one of the vocabulary owners to compare against runtime contracts and OpenAPI schemas.

## Controlled Vocabulary Consistency Gate Micropasso

This technical semantic-hardening micropasso implements the first controlled vocabulary consistency gate across the child-project governance status model, runtime contract and OpenAPI contract.

Commit target: `tooling: enforce controlled vocabulary consistency across registries and contracts`.

Governed implementation links:

- `MR-0000REQ-0025` — Controlled vocabulary consistency across registries and contracts.
- `TOOL-check-controlled-vocabulary-consistency` — Deterministic validator for governed status values exposed across the status-model registry, Zod runtime contract and OpenAPI schemas.
- `TOOL-run-governed-repository-operation` — Governed runner now executes the controlled vocabulary validator under `npm run repo:check` and `npm run repo:commit-push`.

The gate currently enforces the first concrete governed mapping: `gate_execution_result_status` from `child-project-governance/status-model.registry.yml` controls `gate_result.status` and `check_run.overall_status` as exposed by `childProjectGateStatusSchema`, `ChildProjectGateResult.status` and `ChildProjectCheckRun.overall_status`.

The implementation keeps the status model's distinction between canonical execution result values and explicitly declared transitional runtime values. `pass`, `fail`, `warning` and `not_executed` are the canonical owner values, while `skipped`, `reserved` and `unknown` remain transitional runtime values until later migration/governance work removes or remaps them.

This step updates the runtime and OpenAPI contracts to represent `not_executed`, adds a focused negative fixture proving missing governed values fail closed, and wires the checker into the governed repository runner.

This step does not implement the graph ownership consistency gate, minimal terminology guard, storage migrations, UI behavior changes, child-project executor, Knowledge Graph ingestion, Base Analysis, STRIDE or STRIDE-AI runtime behavior.

The next safe step is `tooling: enforce graph and registry ownership consistency`, using ADR ownership, requirement `derived_from_decision_id` and graph `has_decision`/`belongs_to`/`justifies` relations as the semantic source of truth.

## Graph and Registry Ownership Consistency Gate Micropasso

This technical semantic-hardening micropasso implements the first graph and registry ownership consistency gate across indexed graph files, decision registries and requirement registries.

Commit target: `tooling: enforce graph and registry ownership consistency`.

Governed implementation links:

- `MR-0000REQ-0024` — Graph and registry ownership consistency gate.
- `TOOL-check-graph-registry-ownership-consistency` — Deterministic validator for macro-requirement ownership semantics across `has_decision`, `belongs_to`, `justifies` and `derived_from_decision_id`.
- `TOOL-run-governed-repository-operation` — Governed runner now executes the graph and registry ownership validator under `npm run repo:check` and `npm run repo:commit-push`.

The gate checks every graph listed in `graph.index.yml` against its owning decision and requirement registries. It verifies that registered ADRs are represented by macro-requirement `has_decision` relations, registered requirements belong to the owning macro-requirement, and each requirement's registry `derived_from_decision_id` has a matching graph `justifies` relation.

The first implementation deliberately remains compatible with historical graph records: existing `belongs_to` relations must not contradict registry ownership, but the gate does not rewrite old ADR records that predate the explicit reverse-relation convention. A later governed consolidation can make reverse ADR ownership mandatory after historical graph cleanup is planned and manifest-governed.

This step adds a focused negative fixture proving that a requirement whose `derived_from_decision_id` lacks the matching graph `justifies` relation fails closed, then wires the checker into the governed repository runner.

This step does not implement graph cleanup manifests, duplicate-ownership consolidation, minimal terminology guard, child-project executor, Knowledge Graph ingestion, Base Analysis, STRIDE or STRIDE-AI runtime behavior.

The next safe step is `tooling: enforce minimal canonical terminology guard for governed labels`, scoped only to governed titles and labels so it does not become a broad natural-language linter.

## Project Knowledge Governance Manual First Study Slice Micropasso

This document-only MR-0010 micropasso writes the first study-oriented manual slice for threat-forge project knowledge governance.

Commit target: `docs: write Project Knowledge Governance Manual current-state foundations`.

Governed documentation added:

- `docs/explanation/project-knowledge-governance-manual/README.md` — Manual index, canonical-source boundary and study routes.
- `docs/explanation/project-knowledge-governance-manual/part-01-current-state-foundations.md` — First study chapter explaining the current documentation, graph, code traceability and gate model.
- `DOC-MR0010-project-knowledge-governance-manual-index` — Graph document node for the manual index.
- `DOC-MR0010-project-knowledge-governance-manual-part-01` — Graph document node for the first study chapter.

The first manual slice explains the current-state foundation for students, developers and LLM-assisted reviewers. It introduces the canonical-source boundary, the ADR-to-requirement-to-graph-to-code chain, the active gate taxonomy, the code coherence and anti-duplication workflow, and the advisory-only role of LLM semantic review.

This step is explanatory and study-oriented. It does not introduce new runtime behavior, new repository gates, new child-project execution, Knowledge Graph ingestion, Base Analysis, STRIDE, PASTA or STRIDE-AI behavior.

The next safe MR-0010 step is to expand the manual with a detailed canonical-source and repository layout chapter, then a graph-reading chapter with local graph diagrams and concrete entity examples.
