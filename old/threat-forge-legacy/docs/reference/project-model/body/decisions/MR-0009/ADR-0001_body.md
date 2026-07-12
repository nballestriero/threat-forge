# ADR-0001 — Threat Analysis Readiness Reporting Boundary

## Status

Accepted.

## Context

The Base Threat Analysis pipeline depends on governed project knowledge. A project may not yet have enough documented components, data resources, boundaries, flows, contracts or graph relations to support meaningful analysis.

`MR-0009` owns general reporting, dashboards and product intelligence. It needs a first document-only boundary for reporting whether a workspace is ready for Base Analysis and later methodology overlays.

This step does not implement scoring, dashboards, APIs, exports, UI widgets, extraction tooling or analysis engines.

## Decision

Threat Analysis readiness must be reported as a first-class product intelligence concern under `MR-0009`.

A readiness report must summarize whether the governed documentation and project graph contain enough source-traceable knowledge to prepare Base Analysis candidates. The report must distinguish readiness for Base Analysis from readiness for methodology overlays such as STRIDE and STRIDE-AI.

Readiness reporting must not invent missing topology. It must surface missing or weak evidence, such as undocumented boundaries, absent data flows, unlinked API contracts, missing component ownership, missing data-resource descriptions or incomplete evidence trails.

## Scope

In scope:

- reporting boundary for Threat Analysis readiness;
- readiness distinction between project knowledge, Base Analysis and overlays;
- missing-evidence and weak-evidence reporting semantics.

Out of scope:

- implementing dashboards;
- implementing readiness scoring algorithms;
- implementing APIs or UI;
- implementing extraction, DFD rendering, STRIDE or STRIDE-AI;
- defining mitigation or evidence closure reports.

## Consequences

### Positive consequences

- Users can see whether a project is analyzable before starting a security review.
- Child projects can be guided toward security-analysis-ready documentation.
- Missing boundaries, flows and evidence can be fixed early in the documentation lifecycle.
- Reporting remains distinct from analysis execution.

### Negative consequences

- Readiness reporting requires controlled criteria before it can become a gate.
- Early reports may be advisory until deterministic checks and examples are introduced.
- Future scoring must avoid hiding evidence gaps behind a single aggregate number.

## Follow-up

1. Define minimal readiness criteria for Base Analysis preparation.
2. Define report payload contracts after readiness concepts stabilize.
3. Define dashboard views only after report contracts exist.
4. Consider gates only after readiness criteria are deterministic and backed by negative fixtures.
