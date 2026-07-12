# ADR-0001 — Child projects as analyzable Doc-as-Code workspaces

## Status

Accepted.

## Context

Threat-forge must manage projects that can be analyzed for security from the earliest documentation stage, not only after source code exists or after a project has already grown without governance.

A child project must therefore not be treated as an arbitrary repository that threat-forge inspects later with best-effort heuristics. It must be created and maintained as a governed Doc-as-Code workspace whose documentation, registries, graph records, gates, and analysis inputs are structured enough for deterministic validation and later threat-analysis methods.

Threat-forge already uses governed registries, canonical body formats, graph relations, append-first protection, source-code traceability checks, and a governed commit/push runner to control itself. The same governance model must become reusable for child projects so that child projects are security-analysis-ready by construction.

Threat-forge must also apply its own documentation and threat-analysis model to itself. Self-analysis is necessary to improve the product and to demonstrate that the same security-first workflow imposed on child projects is usable by the parent project.

## Decision

Child projects governed by threat-forge must be created as analyzable Doc-as-Code workspaces.

A child project is not considered governed unless it declares a documentation and analysis profile that threat-forge can validate. The profile must provide the structure needed to produce analyzable documentation, not only human-readable notes.

Threat-forge must provide the child-project structure, controlled documentation model, graph model, and validation gates. Child projects must run governed checks before routine commit and push operations so that project documentation, traceability, and security-analysis readiness cannot be bypassed during normal development.

The same model used by threat-forge to control itself must be reusable for child projects. This includes governed registries, canonical document bodies, graph traceability, append-first behavior for protected records, validation gates, and the governed local operation path.

Base security analysis must start from documentation artifacts that are intentionally structured for analysis: project identity, architecture description, assets, actors, boundaries, data flows, entry points, assumptions, and open questions. STRIDE and STRIDE-AI overlays must be applied only after the base model has enough governed information to avoid invented or ungrounded analysis.

Threat-forge itself must be eligible for the same base threat-analysis workflow that it applies to child projects.

## Scope

In scope:

- defining child projects as governed Doc-as-Code workspaces;
- requiring analyzable documentation rather than free-form documentation;
- requiring child projects to inherit or instantiate threat-forge documentation governance structures;
- requiring governed check/commit/push behavior for routine child-project changes;
- requiring child-project documentation to prepare asset, boundary, data-flow, and entry-point inputs for base threat analysis;
- declaring that threat-forge must be analyzed with its own methods.

Out of scope:

- implementing child-project scaffolding;
- implementing child-project repository adapters;
- implementing the base threat-analysis model;
- implementing STRIDE or STRIDE-AI overlay logic;
- implementing user, role, or audit runtime behavior;
- defining the final frontend interfaces for project management or threat analysis.

## Consequences

### Positive consequences

* Child projects become security-analysis-ready from the documentation creation phase.
* Threat-forge can reject missing or unstructured documentation before attempting threat analysis.
* The same governed model used by threat-forge can be reused for child projects.
* Routine child-project commits and pushes can be forced through gates instead of relying on manual discipline.
* Future STRIDE and STRIDE-AI overlays can be grounded in assets, boundaries, and data flows instead of generic checklists.
* Self-analysis of threat-forge becomes part of product improvement.

### Negative consequences

* Child projects require more structure at creation time than an unconstrained repository.
* Scaffolding and adapters must account for project-specific configuration without weakening the shared governance model.
* Some security analysis may be blocked until required documentation inputs are present.
* The parent project must maintain backward-compatible governance contracts for child projects once they depend on them.

## Follow-up

1. Derive small child-project requirements from this decision.
2. Define the child-project documentation governance profile.
3. Define the governed child-project commit/push gate requirement.
4. Define the child-project security-analysis readiness requirement.
5. Define how threat-forge is represented as a self-analyzable project.
6. Later, design child-project scaffolding and adapters.
7. Later, connect `MR-0004` base threat-analysis inputs to the governed child-project documentation profile.
