# MR-0003REQ-0014 — Child Project Lifecycle Status View

## Intent

Users need a platform-visible status view that explains whether each child project is ready for governed work.

## Requirement

The system must expose child-project lifecycle status through the platform UI boundary, including skeleton generation, document-first readiness, traceability readiness, gate results, and future threat-analysis readiness.

## Scope

This requirement applies to future child-project status read models and UI views.

It does not implement storage, APIs, UI cards, dashboards, or live gate execution in this micropasso.

## Rules

- Lifecycle status must include whether the governed skeleton exists or has been generated.
- Lifecycle status must include document-first readiness.
- Lifecycle status must include code traceability readiness.
- Lifecycle status must include governed gate results when available.
- Lifecycle status must include threat-analysis readiness or reserved-stage status.

## Acceptance Criteria

```gherkin
Scenario: Platform inspects child-project lifecycle status
  Given a governed child project is registered
  When the platform user opens its status view
  Then the UI can show skeleton, document-first, traceability, gate, and threat-analysis readiness states
```

## Verification Expectation

Future child-project read-model tests must verify that lifecycle status includes skeleton, document-first, traceability, gate, and threat-analysis readiness fields.
