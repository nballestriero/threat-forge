# ADR-0012 — Explainable Child Governance Concepts and Gate Rationale Boundary

## Status

Accepted.

## Context

Threat-forge can now generate and render read-only child-project governance gate plans for platform self-governance, demo child projects and documentation-only child projects. The visible plan shows project selection, profile context, target scope, gates, applicability, status, reasons, evidence, required capabilities and validation surfaces.

That visibility is useful, but it is not yet sufficiently educational. A user studying threat analysis or child-project governance cannot reliably understand the meaning of a raw profile id, gate id, capability id, applicability class, execution status or validation surface without opening registry YAML files, ADRs or implementation details. This weakens threat-forge as a study base and makes the Governance Console feel like an internal diagnostics screen rather than a guided interface.

Capability and validation-surface values are especially important. A capability is not just a tag; it explains what a project or the platform must be able to do before a gate or analysis method is meaningful. A validation surface is not just a location; it explains which part of threat-forge, a demo workspace, a fixture, a contract, a snapshot or a test proves that the gate is mature enough to be trusted. If those concepts are opaque, users cannot understand why a gate appears, why it is skipped, why it is unsupported, or how the gate contributes to analyzable threat-analysis inputs.

The next workstream must therefore establish an explainability boundary before implementing a final gate executor, orchestrator, Base Analysis runtime or mutable child-project governance flow.

## Decision

Threat-forge shall treat child-project governance concepts as study-oriented governed concepts, not opaque enum strings. Governance profiles, target scopes, gate ids, applicability classes, execution statuses, required capabilities, validation surfaces, reasons and evidence must be explainable through governed records and view-models before they are used as primary UI concepts for final gate execution.

Every governance gate plan item must be able to answer the following questions in user-facing terms:

- what this gate checks;
- why this gate was selected for this project/profile/target scope;
- what the selected applicability class means;
- what the execution status means;
- which capabilities the gate requires or uses;
- what each required capability means;
- why each required capability matters for threat analysis or analyzable documentation;
- which validation surfaces the gate relies on;
- what each validation surface proves;
- which concrete project files, registries, APIs, generated artifacts, fixtures, snapshots or tests are affected;
- how the gate supports future Base Analysis, STRIDE, STRIDE-AI or other threat-analysis methods;
- where the source governed record can be inspected.

Capability explanations must describe the action or evidence the platform expects. They must explain whether a capability is declared, detected, unknown, unsupported or absent, and how that state affects gate applicability or threat-analysis readiness.

Validation-surface explanations must describe the controlled project area or self-test evidence that gives confidence in a gate. They must explain what is validated, why it matters, and what kinds of defects or missing evidence the surface is expected to reveal.

Gate-selection rationale must be preserved separately from execution outcome. A gate may be selected because of a mandatory baseline, a profile composition rule, a target scope, a required capability, a validation-surface maturity rule or a future analysis-method requirement. A later executed pass/fail result must not erase the reason why the gate was selected in the first place.

The first implementation-bearing follow-up should expose read-only explanation data through backend view-models and render it in Governance Console UI surfaces. The UI may use inline descriptions, field help, expandable concept panels, detail links or a guide button, but the explanation must come from governed records rather than hardcoded prose hidden in components.

## Scope

In scope:

- defining the explainability boundary for child-project governance plan concepts;
- requiring user-facing explanations for gates, profiles, target scopes, applicability classes, execution statuses, capabilities, validation surfaces, reasons and evidence;
- requiring gate-selection rationale to explain why a gate appears in a plan;
- requiring capability and validation-surface concepts to be understandable to users studying threat analysis;
- preparing future backend/API/view-model and Governance Console UI work to expose explanation details from governed sources.

Out of scope:

- implementing the gate executor or orchestrator;
- implementing mutable child-project governance actions;
- implementing Base Analysis runtime/storage;
- implementing STRIDE or STRIDE-AI analysis methods;
- changing registry schemas in this micropasso;
- changing frontend behavior in this micropasso;
- hardcoding final UI copy without governed source records.

## Consequences

### Positive consequences

- Governance gate plans become useful as a study surface, not only an operational checklist.
- Users can understand why gates were selected before trusting execution results.
- Capability and validation-surface concepts become explicit teaching concepts for threat-analysis readiness.
- Future UI/API work has a clear contract for field help, guide panels and registry-detail links.
- The executor/orchestrator can later reuse the same rationale model instead of inventing separate reporting language.

### Negative consequences

- Registry records and view-models will need more explanatory metadata than minimal machine execution requires.
- UI work must avoid duplicating explanations in hardcoded component text.
- Gate authors must maintain rationale and explanation quality in addition to executable behavior.
- Some early explanations may remain provisional until Base Analysis, STRIDE and STRIDE-AI methods mature.

## Follow-up

1. Add requirements for study-oriented governance concept explanations, gate-selection rationale and capability/validation-surface explanations.
2. In a later backend micropasso, expose a read-only governance concept explanation view-model sourced from governed registries and planning artifacts.
3. In a later frontend micropasso, render page guidance, field explanations, gate detail panels and rationale links in the Governance Console.
4. Keep the gate executor/orchestrator parked until explanation data is inspectable for the planned gates.
5. Reuse the same explanation model for future Base Analysis, STRIDE and STRIDE-AI readiness views.
