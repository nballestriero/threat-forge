# ADR-0003 — Versioned Threat Analysis Lifecycle and CI/CD Stale Detection

## Status

Accepted.

## Context

`MR-0004/ADR-0002` defines a project-knowledge-first Base Threat Analysis pipeline where the DFD is derived after accepted base inventory and flows. The next design concern is how this model survives normal software evolution.

Threat-forge and child projects must continue to change through governed commits, branches and future CI/CD pipelines. A security analysis that was valid for one documentation, graph and code state may become stale when API contracts, components, boundaries, data resources, data flows, requirements or evidence change.

The project therefore needs versioned analysis records that are reproducible, but also stale-aware. This step is intentionally document-only. It does not implement CI/CD integration, stale detection tooling, policy gates, snapshot storage, analysis execution or reporting dashboards.

## Decision

Threat Analysis must be versioned, snapshot-based and CI/CD-aware.

A consolidated Base Analysis version must record the source snapshot it analyzed. The source snapshot must include enough identity to compare later project states against the analyzed state, including governed documentation, registries, graph records, relevant source/code references, API contracts, component declarations, data-resource declarations, boundary declarations, data-flow declarations and evidence references.

The project may continue to evolve after an analysis is consolidated. Future repository and CI/CD checks must be able to classify whether a change is security-relevant for the current Base Analysis and overlays. When relevant inputs change, the affected analysis records must become stale, require review, require rebase, or be superseded according to policy.

The base lifecycle must support at least these semantic states:

```text
draft
ready_for_review
consolidated
stale_warning
stale_blocking
requires_rebase
superseded
archived
```

A stale analysis is not automatically invalid for audit. It remains reproducible for the snapshot it references, but it must not be treated as current coverage for a changed project state unless a governed review confirms that the change does not affect the analysis or a new analysis version supersedes it.

CI/CD must report analysis status and policy outcomes. It may warn, require review, or block depending on the configured policy and the affected change class. Routine code evolution must remain possible, but unreviewed security-relevant drift must be visible and governable.

## Scope

In scope:

- source snapshots for Base Analysis versions;
- stale status and rebase/supersede semantics;
- security-relevant change detection inputs;
- CI/CD status integration as a future governed gate/reporting concern;
- preserving old analysis versions for audit and reproducibility.

Out of scope:

- implementing snapshot storage;
- implementing CI/CD checks or repository gates;
- defining exact policy thresholds;
- implementing runtime analysis execution;
- implementing dashboard rendering;
- implementing automatic impact analysis.

## Consequences

### Positive consequences

- Security analysis can coexist with continuous development.
- Analyses remain reproducible because they reference a concrete project state.
- CI/CD can detect when Base Analysis or overlays no longer cover the current project state.
- Future gates can block only policy-relevant drift instead of freezing all development.
- Child projects can inherit the same security-first governance model.

### Negative consequences

- Analysis records must preserve snapshot identity and evidence references.
- Future tooling must compare current project state with analyzed snapshots.
- Teams must handle stale, rebase and supersede states rather than treating analysis as a one-time document.
- Policy configuration must be careful to avoid excessive blocking during early development.

## Follow-up

1. Define the controlled Base Analysis lifecycle/status taxonomy.
2. Define the source snapshot record shape.
3. Define security-relevant change classes and their default policy outcomes.
4. Define overlay stale propagation for STRIDE and STRIDE-AI.
5. Define CI/CD reporting payloads before implementing any gate.
