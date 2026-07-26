# Documentation to Base Analysis Case Study

This repository-contained Target Project demonstrates the transition from governed documentation to a methodology-neutral Base Analysis.

## Purpose

The case study provides a small, coherent and potentially implementable service interaction. It demonstrates:

1. governed documentary sources;
2. canonical Base Analysis Elements;
3. documentary references to those elements;
4. canonical data-flow endpoint and boundary relations;
5. Target Project validation;
6. portable VS Code assistance;
7. one manually authored methodology-specific Analysis Record;
8. proposed, accepted and rejected methodology-neutral Common Findings;
9. deterministic Common Finding validation and verification coverage.

The case study is a human-readable governed example and a registered positive validation source. Negative verification cases operate only on isolated temporary copies. It is not the source of the Target Project generator template. External Target Projects remain independently creatable in any valid explicit destination.

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

The current state completes the example with five canonical Base Analysis Elements, three canonical relations, one manually authored simulated Analysis Record and three manually authored Common Findings.

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

## Simulated methodology-specific analysis

The file `analysis/ANALYSIS-0001.analysis-record.yml` contains one manually authored methodology-specific Analysis Record.

Its `method_id` is `stride`, but this value is used only as the controlled identifier of the simulated analytical method. STRIDE-specific classification data and observations remain confined to `method_payload`.

The payload explicitly records:

```yaml
simulation_only: true
implementation_status: not_implemented
```

The Analysis Record also declares:

```yaml
derivation_state: not_accepted
```

This makes explicit that the Common Findings are manually authored. They are not the output of an implemented STRIDE plugin or automatic derivation process.

## Common Findings and review outcomes

The case study contains three independently traceable Common Findings:

- `FINDING-0001` is `proposed`: the candidate remains available for review without being treated as accepted.
- `FINDING-0002` is `accepted`: it references the governed Functional Requirement `MR-0001ADR-0001REQ-0001`.
- `FINDING-0003` is `rejected`: it is retained with its evidence and rejection rationale because the governed model does not contain the downstream system required by the scenario.

A rejected Finding is not deleted or silently ignored. Its stable identity, originating Analysis Record, affected subjects, scenario, consequences, evidence and explicit review state remain available for inspection.

A Functional Requirement is mandatory for the accepted Finding. It is not forced onto proposed or rejected Findings when the governed evidence does not establish a valid functional relationship.

The current model records the explicit review state but does not yet provide reviewer identity, an approval workflow or append-first state-transition history.

## Demonstrated scope

This case study demonstrates:

- validation of one simulated methodology-specific Analysis Record;
- validation of manually authored methodology-neutral Common Findings;
- explicit `proposed`, `accepted` and `rejected` review states;
- resolution of Base Analysis Element, relation and Functional Requirement references;
- confinement of STRIDE-specific data to the Analysis Record `method_payload`;
- deterministic human-readable evidence;
- deterministic positive and negative verification coverage.

It does not demonstrate:

- an implemented STRIDE plugin or analysis engine;
- complete STRIDE methodological coverage;
- automatic Common Finding derivation;
- automatic review-state inference;
- a Security Requirement model or derivation process;
- reviewer identity certification or review-transition audit.

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

Validate the simulated Analysis Record and Common Findings:

```powershell
node .\tools\MR-0005\check-common-finding-case-study.mjs
```

Run the deterministic positive and negative verification suite:

```powershell
node --test `
  .\tools\MR-0005\test\common-finding-case-study.test.mjs
```

The complete repository gate executes both Common Finding case-study checks through the local governance check registry.

The case study is versioned by the parent ThreatForge repository and must not contain a nested Git repository.
