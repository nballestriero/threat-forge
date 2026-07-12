# MR-0003REQ-0008 — Child Project Code Traceability Policy

## Intent

Child-project code must remain traceable to the governed requirement and decision it implements.

## Requirement

The system must require child-project implementation code to declare the governed requirement and ADR it implements through a traceability mechanism compatible with threat-forge governance.

## Scope

This requirement applies to future child-project source-code traceability policy and validators.

It does not define the final syntax for all languages or implement child-project code scanning in this micropasso.

## Rules

- Implementation artifacts must be traceable to governed requirements.
- Implementation artifacts must preserve the ADR/requirement justification used for the work.
- Traceability must be machine-checkable by future child-project gates.
- Code without traceability metadata must not be considered governed implementation.
- The child-project mechanism may adapt to language-specific comment or metadata conventions while preserving threat-forge traceability semantics.

## Acceptance Criteria

```gherkin
Scenario: Child project code has traceability metadata
  Given a governed child project contains implementation code
  When the traceability gate scans implementation artifacts
  Then each governed implementation artifact declares the requirement and decision it implements
```

## Verification Expectation

A future child-project code traceability validator must fail when implementation artifacts cannot be linked to governed requirements and decisions.
