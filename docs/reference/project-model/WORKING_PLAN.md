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

The current strategic direction is to build a governance substrate for future security and threat-modeling analyses over GitHub projects created through threat-forge. Future methodology families may include STRIDE, PASTA, and STRIDE-AI, but methodology-specific implementation is not in the current scope.

## Active Objective

Stabilize the foundational governance substrate before implementing more validators or analysis workflows.

The immediate governance themes are:

1. working plan and handoff coherence;
2. canonical identity and namespace rules;
3. canonical ADR and Requirement document formats;
4. atomic functional and linked specialized requirement modeling;
5. common body format profiles and uniform validator architecture;
6. knowledge graph exploration, GraphRAG-like navigation, and derived graph views;
7. code RTM derived from the knowledge graph.

## Current Micropasso

Derive small requirement records from the accepted requirement-model and common body-format architecture decisions.

This micropasso adds atomic requirements for requirement granularity, specialized child requirements, independent requirement bodies, governed body-format profiles, shared Markdown body validation behavior, and schema-backed structured registry/header validation.

No validator, shared utility, dependency change, runner, RTM generator, graph-view generator, body-format registry file, or methodology-specific analysis implementation is part of this micropasso.

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

## Pending Decisions

The requirement-model and common body-format architecture decisions are now represented by ADRs.

Any new decision must be added to the relevant decision registry and graph before derived requirements or implementation work starts.

## Pending Requirements

Requirement-model and common body-format architecture requirements are being derived in the current micropasso.

Requirements still need to be derived for:

- working plan coherence and handoff usage;
- canonical identity resolution;
- canonical ADR body format validation based on the body-format registry;
- graph view profile governance;
- governed LLM project navigation guide;
- code RTM generation;
- bidirectional graph/code traceability checks.

## Pending Implementations

No new implementation should start before the related requirements and graph relations exist.

Expected future implementation areas include:

- body format registry;
- shared Markdown section parsing utilities;
- schema-backed structured registry/header validation support;
- ADR body format validator;
- Requirement registry field validator;
- Requirement body format validator;
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
```

Future gates should be added only after their requirements, graph relations, and implementation artifacts exist.

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
```

## Next Suggested Step

After this requirement derivation micropasso, choose one governed implementation path and keep it small.

The safest next path is to introduce the governed body-format registry requirement implementation only after the requirement graph is committed, then use later micropassi for shared Markdown parsing utilities, schema-backed validation support, and focused ADR/Requirement body validators.

Alternatively, derive the remaining requirement batches for working plan coherence, identity resolution, graph views, LLM guidance, and code RTM before introducing new files or code.
