# ADR-0010 — Provisional Child Project Governance Profiles and Gate Applicability Classes

## Status

Accepted.

## Context

Threat-forge now defines a mandatory child-project governance baseline and a child-project archetype/capability model. The baseline requires governed Doc-as-Code, explicit decision-to-artifact traceability semantics and mandatory Threat Analysis lifecycle presence. The capability model explains how child projects may vary across source code, APIs, frontend UI, storage, data pipelines, AI pipelines, RAG, agentic tools, deployment, CI/CD, external integrations and sensitive or regulated data.

The next decision must define how gates are described before a final gate matrix exists. Some gates are already implemented and exercised by `repo:check`; others will be introduced only after Base Analysis, STRIDE, STRIDE-AI and future analysis workflows exist. The decision must also guarantee that gates developed by threat-forge are testable inside threat-forge before they are used to govern child projects.

Threat-forge must therefore distinguish gate applicability from gate validation surface. A gate may be always required, required only when a capability exists, platform-only, demo-required, planned until a method is available, not applicable with evidence, or unsupported with warning. Separately, every gate must declare how it is validated: platform self-check, demo child project, temporary workspace self-test, positive fixture, negative fixture, generated snapshot, contract test, runtime test or another governed verification surface.

This decision intentionally remains provisional. It does not freeze final STRIDE, STRIDE-AI, language-specific or deployment gate behavior. It creates the vocabulary needed to compose profiles and test gates incrementally.

## Decision

Threat-forge will model governance profiles as provisional compositions of:

1. the mandatory child-project baseline;
2. capability facets and their evidence states;
3. gate applicability classes;
4. gate validation surfaces;
5. language/ecosystem adapters when implementation artifacts exist;
6. analysis method availability and planning state.

Every governance gate developed by threat-forge must declare how it is validated inside the threat-forge repository before it is used to govern child projects. Threat-forge is the reference self-governed project for every platform capability it implements.

The initial gate applicability class vocabulary is:

- `always_required`, for gates required for every managed child project;
- `capability_required`, for gates required when a capability is declared or detected;
- `declared_if_present`, for capabilities or artifacts that must not remain invisible when present;
- `planned_until_method_available`, for method gates whose applicability is known but whose implementation is not complete yet;
- `platform_self_required`, for gates that must be exercised against threat-forge itself when threat-forge has the related capability;
- `platform_only`, for gates that govern threat-forge platform behavior and are not imposed on child projects;
- `child_project_required`, for gates required of managed child projects independently from platform implementation details;
- `demo_required`, for child-project gates that must have a demo child project or fixture validation surface;
- `not_applicable_with_evidence`, for gates skipped only with explicit reason and evidence;
- `unsupported_with_warning`, for detected capabilities that threat-forge cannot yet validate with a concrete adapter.

Every gate result must be explainable. A skipped gate must not disappear from reporting. It must be represented as not applicable, planned, unsupported, platform-only or otherwise non-blocking with a reason, evidence and the profile/capability context that caused that decision.

The initial provisional profile catalog is:

- `platform_self_governance`, for threat-forge itself;
- `demo_child_project_governance`, for the generated demo child project workspace;
- `documentation_only_child_project`, for governed Project Model repositories without implementation artifacts;
- `code_child_project`, for projects with source code but no required API/UI capability;
- `api_child_project`, for backend/API service projects;
- `frontend_child_project`, for UI projects;
- `full_stack_child_project`, for composed backend/frontend/storage projects;
- `data_pipeline_child_project`, for data lineage and transformation projects;
- `ai_enabled_child_project`, for AI, RAG, model-serving or agentic projects;
- `custom_child_project`, for mixed projects composed directly from capabilities.

Profiles are provisional defaults, not final hardcoded enforcement classes. Future Base Analysis, STRIDE, STRIDE-AI, data, AI, deployment and CI/CD work may add gates, validation surfaces and adapter-specific behavior without replacing the mandatory baseline.

## Scope

In scope:

- defining gate applicability classes;
- defining gate validation surface requirements;
- defining platform self-governance and dogfooding expectations;
- defining not-applicable and unsupported evidence semantics;
- defining a provisional profile catalog;
- keeping child-project gate profiles explicitly provisional while future methods mature.

Out of scope:

- implementing the gate orchestrator;
- implementing capability detection;
- implementing a final gate matrix;
- adding language-specific adapters;
- implementing Base Analysis, STRIDE or STRIDE-AI gates;
- changing frontend UI behavior;
- changing taxonomy registry metadata;
- mutating child project repositories;
- implementing governed child-project commit/push;
- enforcing remote branch protection or CI policies.

## Consequences

### Positive consequences

- Threat-forge can introduce child-project gate orchestration without pretending that all future methods are final.
- Each gate can show whether it is required, planned, unsupported, platform-only or not applicable.
- Every developed gate has a validation surface inside threat-forge before it governs child projects.
- Platform capabilities are dogfooded by threat-forge itself.
- Child-specific gates can be validated through the demo child project or fixtures before applying them to external projects.
- UI and reports can explain why a gate did or did not run.

### Negative consequences

- Gate orchestration must track both applicability and validation surface metadata.
- Early reports may contain planned or unsupported gate states while methods and adapters mature.
- New gates must include self-validation, fixtures or demo coverage, increasing implementation discipline.
- The profile catalog must evolve without breaking existing child-project status history.

## Follow-up

1. Define a registry or contract for gate applicability classes and validation surfaces.
2. Add a child-project governance profile catalog readable by backend services and UI.
3. Extend the demo child project with explicit baseline, capability and Threat Analysis lifecycle records.
4. Implement an orchestrator that reports gate applicability, execution status, reason and evidence.
5. Add self-tests requiring every child-project gate to have a validation surface in threat-forge.
6. Add taxonomy usage metadata and UI rendering for gate/profile/capability values.
7. Extend the model after Base Analysis, STRIDE, STRIDE-AI and future methods become available.
