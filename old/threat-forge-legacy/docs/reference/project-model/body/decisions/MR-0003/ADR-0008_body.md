# ADR-0008 — Mandatory Child Project Governance Baseline

## Status

Accepted.

## Context

Threat-forge now has a documented parent-child ownership boundary, a resettable demo child-project workspace, SQLite-backed child-project operational state, a read-only child-project management API and local launch guidance for opening the demo Project Model in the Project Documentation Explorer.

The next decision before defining detailed governance profiles is to identify which controls must apply to every managed child project regardless of language, framework, runtime shape or project archetype. A child project may be documentation-only, code-only, API-backed, frontend-only, full-stack, data-pipeline-oriented, AI-enabled, infrastructure-oriented or a hybrid of those capabilities. Many concrete gates for Base Analysis, STRIDE, STRIDE-AI, AI pipeline controls and future methodologies will be defined later when those analysis workflows are implemented.

However, threat-forge must not wait for every methodology-specific gate before establishing the minimum governance baseline. If a project is managed by threat-forge, it must be governed as a Doc-as-Code project, it must maintain explicit traceability from decisions and requirements to implementation artifacts when such artifacts exist, and it must carry Threat Analysis as a mandatory lifecycle concern from the beginning of development.

This decision is document-only. It does not implement a new child-project profile engine, capability detector, gate orchestrator, Threat Analysis workflow, Base Analysis workflow, STRIDE workflow, STRIDE-AI workflow, repository write-back, UI enforcement or child-project commit/push automation.

## Decision

Every managed child project must satisfy a mandatory governance baseline before any capability-specific gate profile is evaluated. Capability-specific gates may add checks for code, APIs, frontend, storage, data pipelines, AI pipelines, deployment, CI/CD, language ecosystems or security analysis methods, but they must not remove the mandatory baseline.

The mandatory baseline has three pillars:

1. governed Doc-as-Code;
2. explicit decision-to-artifact traceability semantics;
3. mandatory Threat Analysis lifecycle presence.

A child project is not considered managed or governed by threat-forge unless it has a canonical Project Model under its own repository/workspace. The Project Model must be the source of truth for MR, ADR, Requirements, graph records, governed Markdown bodies, taxonomies used or extended by the child project and its working plan. Platform operational storage may register, index, summarize or report on those records, but it must not replace them.

When a child project contains code, scripts, API handlers, frontend components, pipeline definitions, prompt/runtime assets, agent tools, deployment descriptors or other implementation artifacts, those artifacts must be traceable from the governing Project Model. The expected chain remains:

```text
MR → ADR → REQ → implementation artifact → verification evidence
```

If a child project has no implementation artifacts yet, the traceability baseline is not silently skipped. The child project or platform check result must explicitly record the applicability state, such as `applicable: false` with a reason like `no implementation artifacts declared`. This keeps pre-code projects governable while preserving an auditable transition point for when code appears.

Threat Analysis must be a mandatory lifecycle concern for every managed child project. This does not mean that every project must immediately complete every analysis method. It means every project must declare the presence, status and applicability of Threat Analysis from the beginning of development. At minimum, a child project must expose a governed record or equivalent Project Model content that states that Threat Analysis is required, identifies its current state and records whether concrete methods are pending, draft, approved, stale, not applicable or blocked.

Base Analysis is the default foundation for future method-specific overlays. STRIDE becomes applicable when security-relevant surfaces, trust boundaries, actors, data flows, APIs or deployable components are present. STRIDE-AI becomes applicable when the child project contains AI, RAG, model-serving, prompt, agent, vector-store, embedding, tool-calling or similar AI pipeline capabilities. Future methods may be added as governed extensions.

Capability-specific governance profiles are therefore provisional compositions of detected or declared capability facets. They may decide which additional gates are mandatory, warning-only, optional or not applicable, but they must always preserve the baseline.

## Scope

In scope:

- defining the mandatory baseline for every managed child project;
- requiring Doc-as-Code as the entry condition for managed child projects;
- requiring explicit traceability semantics for implementation artifacts when present;
- requiring explicit no-code applicability evidence when implementation artifacts are absent;
- requiring Threat Analysis lifecycle presence for every managed child project;
- defining that concrete Threat Analysis methods are selected by project capabilities;
- defining that capability-specific gates extend but do not replace the baseline.

Out of scope:

- implementing a child-project gate orchestration engine;
- defining the final governance profile matrix for all project archetypes;
- implementing Base Analysis, STRIDE or STRIDE-AI workflows;
- implementing AI pipeline-specific validators;
- implementing language-specific build/test adapters;
- implementing UI enforcement for the baseline;
- implementing child-project repository mutation or governed commit/push;
- implementing remote branch protection or CI/CD integration.

## Consequences

### Positive consequences

- Every managed child project has a clear minimum bar before language-specific or methodology-specific controls are considered.
- Documentation-only and pre-code projects remain governable without pretending that code traceability applies before code exists.
- Projects with code cannot bypass decision-to-artifact traceability.
- Threat Analysis becomes part of project development from the beginning rather than a later optional report.
- Future Base Analysis, STRIDE, STRIDE-AI and other methods can be layered on top of a stable lifecycle requirement.
- Capability-based profiles can evolve without breaking the mandatory baseline.

### Negative consequences

- Even simple child projects must carry a Project Model and Threat Analysis lifecycle record.
- Existing imported projects will need onboarding/remediation before they can be marked fully managed.
- Threat-forge must distinguish missing, planned, draft, approved, stale and not-applicable analysis states instead of using a single pass/fail value.
- The eventual gate orchestrator must report applicability and reasons, not only pass/fail.

## Follow-up

1. Define child-project archetypes and capability facets without turning them into rigid final classes.
2. Define provisional governance profiles that extend the mandatory baseline.
3. Add a child-project baseline validator for Project Model, traceability applicability and Threat Analysis lifecycle presence.
4. Extend the demo child-project seed with a minimal Threat Analysis lifecycle record once the record format is defined.
5. Add capability detection for code, API, frontend, data, AI, deployment and CI/CD facets.
6. Add methodology-specific gates as Base Analysis, STRIDE, STRIDE-AI and later methods become available.
