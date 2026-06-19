# Programmer Governed Development Guide

This how-to explains the routine development path for threat-forge and future child projects governed by threat-forge.

The goal is to keep every meaningful change documentation-first, traceable, and security-first.

## Use the governed path

For routine changes, use the governed repository runner:

```text
npm run repo:check
npm run repo:commit-push -- "<message>"
```

Direct `git commit` or `git push` is reserved for bootstrap, runner recovery, or documented emergency maintenance.

## Start from the right macro-requirement

Before editing files, identify the macro-requirement that owns the change.

Use the current area split:

- `MR-0000` — repository governance and operating controls;
- `MR-0001` — project model and documentation governance;
- `MR-0002` — reusable interface framework;
- `MR-0003` — project and child project management;
- `MR-0004` — base threat analysis model;
- `MR-0005` — STRIDE threat analysis overlay;
- `MR-0006` — STRIDE-AI threat analysis overlay;
- `MR-0007` — identity, user and access management;
- `MR-0008` — logging, audit and evidence trail.

Do not place a change in `MR-0001` merely because it is documented. `MR-0001` owns the documentation method and project-model governance itself.

## Follow the governed sequence

Use this sequence for governed behavior changes:

1. Identify the owning macro-requirement.
2. Add or update an ADR when a decision is needed.
3. Add a small requirement derived from the ADR.
4. Update the graph before implementation.
5. Implement the smallest artifact that satisfies the requirement.
6. Add JSDoc traceability when the artifact is source code.
7. Add or update focused verification.
8. Run `npm run repo:check`.
9. Commit and push with `npm run repo:commit-push -- "<message>"`.

Avoid broad changes that mix unrelated domains. Prefer one micropasso per coherent requirement.

## Keep ADRs, requirements and how-to guides separate

Use the Diátaxis categories correctly:

- ADR bodies record decisions and rationale.
- Requirement bodies record verifiable contracts.
- `docs/reference/` contains governed reference material such as registries and schemas.
- `docs/how-to/` contains operational instructions such as this guide.
- `docs/explanation/` contains conceptual background and design rationale that is not itself a requirement.
- `docs/tutorials/` contains guided learning paths.

Do not hide operating instructions inside ADR or Requirement bodies. Link guides from the project model instead.

## Respect backend boundaries

Backend modules should use:

- Node.js;
- Zod for runtime contracts and internal DTO validation;
- OpenAPI for the HTTP contract;
- factory and composition root for dependency assembly;
- Controller → Service → Port → Adapter layering;
- middleware only for cross-cutting HTTP concerns such as request parsing, validation, auth, logging, correlation id, and error handling.

Controllers must not instantiate concrete adapters. Services must depend on ports. Adapters must isolate concrete infrastructure such as filesystem, Git, generated artifacts, APIs, or child-project repositories.

## Respect frontend boundaries

Frontend modules should use React with reusable components.

Components should render view models and send user actions to controllers/hooks. They must not read YAML, Markdown, Git state, graph files, registry files, or filesystem paths directly.

Frontend access to backend/project data should go through client ports and API/OpenAPI adapters.

## Preserve child-project analyzability

Child projects must be created as analyzable Doc-as-Code workspaces.

When adding child-project behavior, preserve the contract that threat-forge provides the structure, applies the same model/tool/gate pattern it uses for itself, and prevents routine commit/push flows from bypassing documentation-first and security-first controls.

## Verify before handoff

Before handoff, capture at least:

```text
git status --short --branch
git log --oneline -5
npm run repo:check
```

Do not claim a gate passed unless the command was actually run or the user explicitly reported its output.
