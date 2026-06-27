# ADR-0009 — Child Project Archetypes and Governance Capability Model

## Status

Accepted.

## Context

Threat-forge now defines a parent-child ownership boundary and a mandatory governance baseline for every managed child project. The baseline requires governed Doc-as-Code, explicit decision-to-artifact traceability semantics and mandatory Threat Analysis lifecycle presence before capability-specific gates are evaluated.

The next decision must not freeze a final gate matrix. Many gates will depend on future Base Analysis, STRIDE, STRIDE-AI, data-pipeline, AI-pipeline, CI/CD and deployment support. Projects managed by threat-forge may also vary widely: some may be documentation-only, some may contain code without a service boundary, some may expose APIs, some may be frontend-only, some may be full-stack applications, some may be data pipelines, and some may include AI, RAG, model-serving or agentic runtime behavior.

Classifying child projects only by language would be too narrow. A Node, Python, Go, Rust, Java or .NET project can have very different governance needs depending on whether it contains APIs, frontend, storage, sensitive data, AI pipelines, RAG, deployment descriptors or external integrations. Conversely, projects with different languages can require the same governance capability checks.

This decision defines child-project archetypes and capability facets as a provisional classification model. It intentionally precedes final gate applicability and concrete detector implementation.

## Decision

Managed child-project governance profiles must be composed from:

1. the mandatory child-project governance baseline;
2. declared or detected capability facets;
3. language or ecosystem adapters when implementation artifacts are present;
4. provisional analysis method applicability rules.

Archetypes are user-facing defaults and documentation guidance. They help operators, UI views and future onboarding flows explain what kind of project is being managed, but they are not rigid enforcement classes. A child project may match multiple archetypes or may be classified as mixed/custom when its shape does not fit a predefined default.

The initial archetype vocabulary is:

- `documentation_only_project`;
- `code_library_or_cli_project`;
- `backend_api_service_project`;
- `frontend_ui_project`;
- `full_stack_application_project`;
- `data_pipeline_project`;
- `ai_pipeline_project`;
- `ai_enabled_application_project`;
- `infrastructure_or_deployment_project`;
- `mixed_or_custom_project`.

Capability facets are the authoritative basis for additional checks. The initial capability vocabulary is:

- `project_model`;
- `source_code`;
- `backend_api`;
- `frontend_ui`;
- `persistent_storage`;
- `data_pipeline`;
- `ai_pipeline`;
- `rag_pipeline`;
- `agentic_tools`;
- `deployment`;
- `ci_cd`;
- `external_integrations`;
- `sensitive_data`;
- `regulated_data`;
- `runtime_operations`.

Each capability must eventually be represented with an evidence state rather than a plain boolean. The allowed state vocabulary is provisional but must distinguish at least:

- `declared`, when the child Project Model declares the capability;
- `detected`, when threat-forge detects evidence in files, manifests or repository structure;
- `not_present`, when absence is declared or verified;
- `unknown`, when the capability has not been evaluated;
- `unsupported`, when evidence exists but threat-forge does not yet have a control adapter.

Capability evidence must be explainable. Future gate results must be able to show which files, records, declarations or heuristics caused a capability to be declared, detected, not present, unknown or unsupported.

Language and ecosystem adapters are secondary selectors. A language ecosystem does not define the governance profile; it only selects concrete checks when implementation artifacts exist. Examples include `node`, `python`, `go`, `rust`, `java`, `dotnet` and `generic_shell`. Each adapter may later define manifest files, lock files, test command conventions, build command conventions, source roots and framework hints.

Threat Analysis method applicability is capability-based and provisional. Base Analysis remains the default foundational method lifecycle for every managed child project. STRIDE becomes applicable when security-relevant surfaces, trust boundaries, actors, data flows, APIs, deployable components, external integrations or sensitive data are present. STRIDE-AI becomes applicable when AI, RAG, model-serving, prompt/context handling, embedding, vector-store, agentic tool-use or similar AI pipeline capabilities are present. Until the corresponding analysis workflows are implemented, method applicability may be reported as planned, pending or unsupported rather than final pass/fail.

Capability-specific gates may be introduced incrementally as threat-forge implements Base Analysis, STRIDE, STRIDE-AI and other method support. Those gates extend the mandatory baseline; they do not replace it.

## Scope

In scope:

- defining child-project archetypes as user-facing defaults;
- defining capability facets as the basis for additional governance checks;
- defining evidence state semantics for capability classification;
- defining the language ecosystem adapter boundary;
- defining provisional analysis method applicability by capability;
- defining governance profiles as compositions rather than rigid classes.

Out of scope:

- implementing capability detection;
- implementing final gate applicability matrices;
- implementing language-specific adapters;
- implementing Base Analysis, STRIDE or STRIDE-AI workflows;
- changing taxonomy registry schemas;
- changing the Project Documentation Explorer UI;
- implementing child-project write-back;
- implementing governed child-project commit/push;
- implementing remote CI or branch protection enforcement.

## Consequences

### Positive consequences

- Threat-forge can classify many project shapes without prematurely freezing a final gate matrix.
- The mandatory child-project baseline stays stable while capability-specific controls evolve.
- Language support can be added incrementally without redefining governance semantics.
- AI, RAG and agentic projects can be represented before STRIDE-AI gates are finalized.
- UI and reports can explain why a gate is applicable, not applicable, unknown or unsupported.
- Mixed projects can be governed through composed capabilities instead of brittle hardcoded classes.

### Negative consequences

- Gate orchestration must reason about capabilities, evidence and applicability, not only project type.
- The platform must distinguish declared capabilities from detected capabilities and must handle disagreement.
- Early profiles will remain provisional while Base Analysis, STRIDE, STRIDE-AI and future methods mature.
- Future UI must present capability evidence clearly enough for users to remediate misclassification.

## Follow-up

1. Define provisional child-project governance profiles using the baseline plus capability facets.
2. Add a child-project capability registry or declaration format to the child Project Model.
3. Add a capability detector that reports evidence states and confidence without mutating child project content.
4. Add child-project gate orchestration that maps capabilities to mandatory, warning-only, optional or not-applicable gates.
5. Extend the demo child-project seed with explicit capability declarations and Threat Analysis lifecycle records.
6. Add taxonomy usage metadata and UI rendering so capability and analysis values become visible contracts.
