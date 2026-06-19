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
- top-down project-model graph traversal using `MR -> has_decision -> ADR`.
- graph relations for `ADR -> justifies -> REQ`, `REQ -> implemented_by -> TOOL`, and `TOOL -> verifies -> REQ`.
- dedicated MR-0000 placement for graph format validation tooling and its technical contracts.
- initial ADR registry field governance.
- governed body-format profiles for stable ADR and Requirement bodies.
- append-first protection for canonical project-model registries and graph records.
- self-contained append-first confirmation manifests for explicitly reviewed protected modifications and deletions.

The current strategic direction is to build a governance substrate for future security and threat-modeling analyses over GitHub projects created through threat-forge. Future methodology families may include STRIDE, PASTA, and STRIDE-AI, but methodology-specific implementation is not in the current scope.

## Active Objective

Stabilize the foundational governance substrate before implementing more validators or analysis workflows.

The document-format and append-first foundation has been completed and tagged as `project-model-document-format-and-append-first-controls-complete`.

The immediate governance themes are now:

1. working plan and handoff coherence;
2. canonical identity and namespace rules;
3. a single MR-0000 project-model gate runner that orchestrates existing gates without duplicating their logic;
4. schema-backed structured registry/header validation support;
5. knowledge graph exploration, GraphRAG-like navigation, and derived graph views;
6. code RTM derived from the knowledge graph.

## Current Micropasso

Declare the focused specialized requirement for the concrete MR-0000 project-model gate runner.

This micropasso reuses existing runner decision `MR-0000/ADR-0003` and parent requirement `MR-0000REQ-0007`, adds the specialized child requirement `MR-0000REQ-0007GOV-0001`, and connects it in `GRAPH-0000` before any runner source file is introduced.

The next implementation block should introduce only the thin runner tool that satisfies this focused requirement, without duplicating existing validator logic.

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

## Pending Decisions

The requirement-model and common body-format architecture decisions are now represented by ADRs.

Any new decision must be added to the relevant decision registry and graph before derived requirements or implementation work starts.

## Pending Requirements

Append-first governance requirements have been declared. The schema-backed body-format registry validator has been implemented. The shared Markdown parser requirement has been declared and implemented.

The ADR body format validator requirement has been declared and implemented.

The Requirement body format validator requirement has been declared and implemented.

The focused append-first protected record guard requirement has been declared and implemented as a small semantic diff tool.

The focused confirmation-manifest requirement has been declared and implemented. A schema contract for the confirmation manifest format has been introduced. The confirmation-manifest storage model has been clarified as self-contained YAML records. The append-first guard now discovers, validates, and matches confirmation manifests against protected `modify` or `delete` changes.

The broad MR-0000 gate runner requirement already exists as `MR-0000REQ-0007`. The focused specialized runner requirement now exists as `MR-0000REQ-0007GOV-0001`; the next runner implementation must cite it.

## Pending Implementations

No new implementation should start before the related requirements and graph relations exist.

Expected future implementation areas include:

- a thin MR-0000 project-model gate runner that invokes the existing document-governance gates without duplicating validation logic, satisfying `MR-0000REQ-0007GOV-0001`;
- schema-backed structured registry/header validation support;
- Requirement registry field validator;
- working plan coherence checker;
- graph view profile validator or renderer;
- LLM guide document;
- code traceability declaration checker;
- code RTM generator.

## Pending Validators / Gates

Currently expected gates remain:

```text
npm run docs:graph-format
npm run docs:pages
node tools/docs/check-docs-structure.mjs
npm run docs:adr-registry-fields
npm run docs:body-format-registry
npm run docs:markdown-body-parser
npm run docs:adr-body-format
npm run docs:requirement-body-format
npm run docs:append-first
```

Future gates should be added only after their requirements, graph relations, and implementation artifacts exist.

The current gate list already includes the body-format registry, shared Markdown parser, ADR body format, Requirement body format, and append-first checks introduced in the completed milestone.

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
npm run docs:body-format-registry
npm run docs:markdown-body-parser
npm run docs:adr-body-format
npm run docs:requirement-body-format
npm run docs:append-first
```

## Next Suggested Step

The next safe path is to implement the first thin MR-0000 project-model gate runner against `MR-0000REQ-0007GOV-0001`.

Expected next micropasso chain:

1. add the runner source file under `backend/tools/MR-0000/`;
2. include JSDoc traceability to `MR-0000REQ-0007GOV-0001`, `MR-0000/ADR-0003`, and `MR-0000`;
3. orchestrate existing gate commands without duplicating validator logic;
4. add graph relations from the focused requirement to the runner tool and from the runner tool back to the requirement as verification;
5. add or update the package command only if the implementation micropasso also declares the corresponding graph relation;
6. run the existing gates and the new runner command.

Do not expand the runner into an RTM generator, graph-view generator, LLM guide workflow, or replacement for specialized validators. Confirmation manifest support must remain limited to specific, reviewable authorization of protected `modify` and `delete` changes.
