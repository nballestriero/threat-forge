# ADR-0010 — Child gate planning, execution, freshness and Knowledge Graph ingestion status model

## Status

Accepted.

## Context

ADR-0009 established that child-project gate execution and Knowledge Graph ingestion must not advance while governed statuses are ambiguous or divergent across registries, runtime contracts, OpenAPI, storage and UI.

The current child-project governance model already distinguishes planned gate applicability from some runtime check-run fields, but several status concepts are still easy to conflate:

- whether a gate is selected for a project profile;
- whether a selected gate is ready to execute;
- whether a gate execution result passed, failed or produced a warning;
- whether the latest check run is fresh enough for trust decisions;
- whether child-project documentation and governed graph data are eligible for Knowledge Graph ingestion;
- whether a child project must be quarantined from LLM-assisted development and security analysis.

If these states share one vague status enum, threat-forge can accidentally treat planned, stale, unavailable or quarantined child-project data as reliable knowledge.

## Decision

MR-0000 will define the canonical child-project status model for semantic hardening before real child gate execution and Knowledge Graph ingestion.

The model separates four status families:

1. gate planning status, which describes whether a gate is selected and executable for a child-project target;
2. gate execution result status, which describes the outcome of an executed or explicitly skipped gate;
3. check-run freshness status, which describes whether the latest result can still be trusted for decision making;
4. Knowledge Graph ingestion status, which describes whether child-project documentation and graph data may enter the trusted knowledge surface used by LLM-assisted development and security analysis.

Gate execution result values remain provisional until the controlled vocabulary consistency gate aligns the child-project governance registry, runtime Zod contracts, OpenAPI schemas, storage records and UI states. Transitional runtime values such as `skipped`, `reserved` or `unknown` must be mapped or replaced before real child execution is trusted.

Knowledge Graph ingestion must be fail-closed: a child project is not eligible when registration, documentation source resolution, semantic gates, freshness, status vocabulary alignment or ownership consistency are unresolved.

## Scope

In scope:

- defining the status families and their canonical meanings;
- recording a governed status vocabulary registry for child gate planning, execution, freshness and Knowledge Graph ingestion;
- making freshness and ingestion eligibility separate from pass/fail outcomes;
- requiring quarantine/unavailable states for untrusted child-project knowledge.

Out of scope:

- implementing the controlled vocabulary consistency gate;
- changing runtime Zod contracts, OpenAPI schemas, SQLite storage or UI code;
- executing real child-project gates;
- ingesting child-project data into a Knowledge Graph;
- implementing Base Analysis, STRIDE or STRIDE-AI runtime behavior.

## Consequences

### Positive consequences

* Child-project gate planning, execution, freshness and ingestion are no longer collapsed into one ambiguous status field.
* The next controlled vocabulary gate has a canonical registry to compare against runtime and contract enum values.
* LLM-assisted development and security analysis receive an explicit fail-closed ingestion boundary.
* Stale or semantically inconsistent child-project data can be quarantined rather than treated as trusted knowledge.

### Negative consequences

* Existing runtime and OpenAPI status values may require a migration or explicit mapping.
* Real child-project execution remains parked until the vocabulary and ownership gates are implemented.
* UI copy may need later updates to explain multiple status families instead of one overall status.

## Follow-up

1. Implement controlled vocabulary consistency across the status model registry, runtime contracts, OpenAPI schemas, storage and UI states.
2. Implement graph and registry ownership consistency.
3. Add freshness computation to child-project check-run state.
4. Add Knowledge Graph ingestion eligibility checks before any ingestion job or LLM context builder consumes child-project data.
