# ADR-0006 — Child Project Demo Seed and Resettable Workspace Model

## Status

Accepted.

## Context

`MR-0003` now has a platform Child Projects area, backend read-only API, service read model, storage port and SQLite adapter for operational child-project state.

The platform also needs a safe demo child project for tutorials, presentations, onboarding and exploratory UI work. The demo must be realistic enough to behave like a child project governed by threat-forge, but it must not blur the boundary between the platform repository and the repositories it governs.

Keeping the only demo project fully inside the threat-forge source tree would make it too easy to confuse platform code with governed child-project content. Keeping it only outside the repository would make onboarding, reset and deterministic tests harder because the seed would not be versioned with the platform.

The selected model must support a repeatable reset to a known base state after users try create, validate, check, edit or other future child-project workflows.

This decision is document-only. It defines the demo seed and resettable workspace boundary before adding a generator, reset command, demo registration, UI actions, child-project validation orchestration, repository cloning or governed child-project commit/push.

## Decision

Threat-forge must use a hybrid demo model:

```text
versioned demo seed inside threat-forge
+
resettable runtime demo workspace outside governed source content
```

The versioned seed must live under a dedicated examples area, initially:

```text
examples/child-projects/minimal-governed-child-project/
```

The seed is an example/template, not a live managed child project. It may contain the minimal standard Project Model skeleton, initial Diátaxis learning documents and starter governed records needed to show how a child project begins.

The live demo copy must be generated into a runtime workspace, initially:

```text
.threat-forge/workspaces/demo-child-project/
```

The runtime workspace must be ignored by git and treated as generated application state. It may be deleted and recreated by a reset operation. It is the target users can safely mutate while learning the platform.

A future reset operation must recreate the runtime demo from the versioned seed, register or update the demo child-project operational record in platform storage, run the reusable child-project Project Model validation profile and leave the Child Projects UI ready to show the demo status.

Real production child projects must remain external to the threat-forge governed source tree: sibling directories, configured local paths or independent Git repositories. The internal `.threat-forge/workspaces/` area is for runtime/demo/checkout state only and must not become the canonical location policy for production child projects.

The future reset operation must be path-contained. It must refuse to delete arbitrary user-selected paths, refuse traversal outside the configured workspace root and must not mutate the versioned seed.

## Scope

In scope:

- defining the versioned child-project demo seed location;
- defining the resettable runtime workspace location;
- separating seed content from generated demo state;
- preserving the platform-vs-child-project boundary;
- requiring a safe reset operation for tutorials and presentations;
- defining that production child projects are external to threat-forge source content.

Out of scope:

- creating the seed files;
- adding `.gitignore` rules;
- implementing the reset command;
- registering the demo project in SQLite;
- running validators from backend actions;
- adding UI create/reset/check buttons;
- opening a child Project Model in Project Documentation Explorer;
- cloning repositories;
- implementing governed child-project commit/push;
- implementing Base Analysis, STRIDE or STRIDE-AI workflows.

## Consequences

### Positive consequences

- The demo is reproducible because its seed is versioned.
- Users can experiment without dirtying the governed platform source tree.
- Reset returns the demo to a known starting point for tutorials and presentations.
- Real child projects remain conceptually and operationally separate from the platform.
- Future tests can use the same seed/reset model to create deterministic child-project fixtures.

### Negative consequences

- The platform must distinguish seed files, generated demo workspaces and real managed child projects.
- Reset tooling must implement strict path containment to avoid unsafe deletion.
- The UI may need to explain why demo projects are generated workspaces while production projects are external repositories or paths.

## Follow-up

1. Add a minimal governed child-project seed under `examples/child-projects/minimal-governed-child-project/`.
2. Add `.threat-forge/workspaces/` to ignored runtime state.
3. Add a reset command that recreates `.threat-forge/workspaces/demo-child-project/` from the seed.
4. Register or update the demo project in child-project management storage during reset.
5. Run the standard child-project Project Model skeleton validation after reset.
6. Later, surface the demo project and reset/check actions through backend capabilities and the Child Projects UI.
