# MR-0003REQ-0063 — Capability and Validation Surface Explanation Semantics

## Intent

Capability and validation-surface values must be explained as core study concepts because they determine why a gate can be planned, trusted, skipped or deferred.

## Requirement

The platform must define explanation semantics for required capabilities and validation surfaces so users can understand what a gate needs, what part of the project or platform is validated, and why that evidence matters for threat-analysis readiness.

## Scope

This requirement applies to capability registry records, validation-surface registry records, gate records, planning artifacts, future read-only API/view-models, Governance Console gate detail views and study-oriented documentation surfaces.

It does not implement capability detectors, validation-surface runners, gate executor behavior, child-project mutation, Base Analysis runtime/storage, STRIDE or STRIDE-AI in this micropasso.

## Rules

- A capability explanation must answer what the project or platform must be able to do.
- A capability explanation must describe why the capability matters for analyzable documentation, governance or threat analysis.
- A capability explanation must describe how declaration, detection, unknown, unsupported, not-present or absent states affect gate applicability when those states are available.
- A capability explanation must identify gates or analysis-method readiness areas that depend on the capability when available.
- A validation-surface explanation must answer what concrete project area, artifact, fixture, snapshot, contract, API, command or test is being validated.
- A validation-surface explanation must describe what the surface proves and why that proof is needed before child-project enforcement.
- A validation-surface explanation must identify the defects or missing evidence the surface is expected to reveal when available.
- Gate explanations must render required capabilities and validation surfaces as explained concepts, not as raw id lists only.

## Acceptance Criteria

```gherkin
Scenario: Required capabilities are explained
  Given a gate plan item lists one or more required capabilities
  When a user opens the gate explanation
  Then each capability shows what the system or project must be able to do
  And why that capability matters for governance or threat-analysis readiness

Scenario: Validation surfaces are explained
  Given a gate plan item lists one or more validation surfaces
  When a user opens the gate explanation
  Then each validation surface shows what is validated
  And what evidence the surface provides before the gate can be trusted for child-project governance

Scenario: Raw ids are not the only explanation
  Given a future Governance Console page renders capability or validation-surface values
  When the values are shown to a user
  Then the page provides explanations or links to governed explanations
  And the user is not expected to infer meaning from ids alone
```

## Verification Expectation

Future registry schema checks, planner tests, API view-model tests, Governance Console UI tests and documentation-explorer rendering tests must verify that capabilities and validation surfaces are exposed with human explanations and not only raw ids.
