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

Declare append-first governance for protected project-model registries and graph records.

This micropasso introduces the decision and small requirements that require canonical registries and graph files to evolve primarily through additions. It also declares that modifications and deletions of protected records must require explicit confirmation before a future validator accepts them.

No append-first validator, confirmation mechanism, baseline comparison tool, runner update, or source-code implementation is part of this micropasso.

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

## Pending Decisions

The requirement-model and common body-format architecture decisions are now represented by ADRs.

Any new decision must be added to the relevant decision registry and graph before derived requirements or implementation work starts.

## Pending Requirements

Append-first governance requirements are being declared in the current micropasso.

After this micropasso, the project model will also contain requirements for append-first protected record evolution, explicit confirmation of modifications/deletions, and a future deterministic append-first guard.

## Pending Implementations

No new implementation should start before the related requirements and graph relations exist.

Expected future implementation areas include:

- shared Markdown section parsing utilities;
- schema-backed structured registry/header validation support;
- ADR body format validator;
- Requirement registry field validator;
- Requirement body format validator;
- append-first protected record guard;
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

After this append-first governance micropasso, choose one governed implementation path and keep it small.

The safest next implementation path remains schema-backed validation for `body-formats.registry.yml`, because the registry exists and `MR-0001REQ-0011` authorizes schema-backed validation.

Do not implement ADR or Requirement body validators before the shared parsing/profile/schema path is governed.
