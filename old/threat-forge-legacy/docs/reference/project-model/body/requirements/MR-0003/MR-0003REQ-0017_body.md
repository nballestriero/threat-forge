# MR-0003REQ-0017 — Child Project Taxonomy Reuse and Extension Controls

## Intent

Child projects need deterministic values for fields that drive validation, filtering, UI views, lifecycle state, traceability, and future threat analysis.

## Requirement

The system must require child projects to reuse threat-forge controlled taxonomy models and to add local taxonomy values only through governed taxonomy registries.

## Scope

This requirement applies to child-project taxonomy governance and future child-project validation.

It does not implement taxonomy synchronization, local taxonomy authoring UI, RBAC controls, or threat-analysis taxonomy execution in this micropasso.

## Rules

- Child projects must reuse standard taxonomy models for governed fields when those fields already exist in threat-forge.
- Child projects may define local taxonomy values only through governed taxonomy registries with stable identifiers, descriptions, and validation semantics.
- Free-form field values must not be used where a controlled taxonomy exists.
- Taxonomy values used by UI filters, lifecycle status, traceability, or threat-analysis readiness must be deterministic and validatable.
- Future child-project validators must reject unknown taxonomy values unless a governed extension declares them.

## Acceptance Criteria

```gherkin
Scenario: Child project extends a controlled taxonomy
  Given a governed child project needs a local taxonomy value
  When the value is added through a governed taxonomy registry
  Then validators can distinguish the local extension from a free-form field value
```

## Verification Expectation

A future child-project taxonomy validator must fail unknown or free-form taxonomy values when a governed controlled taxonomy applies.
