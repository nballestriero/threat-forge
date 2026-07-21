# Documentation to Base Analysis Case Study

This repository-contained Target Project demonstrates the transition from governed documentation to a methodology-neutral Base Analysis.

## Purpose

The case study provides a small, coherent and potentially implementable service interaction. It demonstrates:

1. governed documentary sources;
2. canonical Base Analysis Elements;
3. documentary references to those elements;
4. canonical data-flow endpoint and boundary relations;
5. Target Project validation;
6. portable VS Code assistance.

The case study is not an automated test fixture and is not the source of the Target Project generator template. External Target Projects remain independently creatable in any valid explicit destination.

## Generation provenance

The initial Target Project structure was created on 2026-07-21 with the maintained ThreatForge generator:

```powershell
node .\tools\MR-0004\create-target-project.mjs `
  --destination-root .\examples\case-studies\documentation-to-base-analysis `
  --project-id documentation-to-base-analysis `
  --project-title "Documentation to Base Analysis Case Study" `
  --author "Nicolo Ballestriero" `
  --decision-date "2026-07-21"
```

The pre-analysis state is preserved by the parent repository tag:

```text
documentation-to-base-analysis-pre-analysis-baseline-complete
```

The current state completes the example with five canonical Base Analysis Elements and three canonical relations.

## Implementable interaction

A demonstration user outside the governed service domain submits a request containing a demonstration record. A logical demonstration service inside the governed domain receives and processes the request.

A future implementation may choose concrete frontend, transport, backend and persistence technologies without changing the canonical meaning of the documented interaction.

## Canonical Base Analysis model

- `[BAE-0001] Demonstration user` — Actor
- `[BAE-0002] Demonstration service` — Component
- `[BAE-0003] Demonstration record` — Data Resource
- `[BAE-0004] Service domain boundary` — Boundary
- `[BAE-0005] Demonstration request flow` — Data Flow

Canonical relations:

```text
BAE-0005 --has_source_endpoint--> BAE-0001
BAE-0005 --has_target_endpoint--> BAE-0002
BAE-0005 --crosses_boundary-----> BAE-0004
```

The demonstration record is described as information carried by the request, but no additional relation is asserted because the current canonical Base Analysis taxonomy does not define a dedicated payload predicate.

## Validation

Run these commands from the ThreatForge repository root:

```powershell
node .\tools\MR-0004\run-target-project-check.mjs `
  --target-root .\examples\case-studies\documentation-to-base-analysis
```

```powershell
node .\tools\MR-0004\materialize-target-project-vscode-workspace.mjs `
  --check `
  --engine-root . `
  --target-root .\examples\case-studies\documentation-to-base-analysis
```

The case study is versioned by the parent ThreatForge repository and must not contain a nested Git repository.
