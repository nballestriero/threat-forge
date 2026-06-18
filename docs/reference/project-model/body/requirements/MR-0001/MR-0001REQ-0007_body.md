# MR-0001REQ-0007 — Specialized child requirement model

## Intent

The project model must support non-functional and control requirements as first-class children of functional requirements.

## Requirement

The project model must allow specialized requirements such as security, performance, governance, traceability, quality, operability, usability, and compatibility requirements to be linked to the functional requirement they constrain, harden, measure, or qualify.

Specialized requirements must not be maintained in separate category-specific registries. They must live in the same macro-requirement registry as their functional parent and must declare the functional parent through a controlled parent reference.

The functional parent must not maintain a duplicated canonical child list. Parent-to-child views must be derived from child records.

## Scope

This requirement defines the requirement hierarchy model.

It does not introduce actual specialized child requirements in this micropasso and does not introduce a graph predicate for specialized requirement relations yet.

## Rules

- The primary requirement type is `functional`.
- A specialized requirement must be a first-class requirement record.
- A specialized requirement must declare a parent functional requirement.
- The parent requirement must exist.
- The parent requirement must be functional.
- The specialized requirement id must derive from the parent functional requirement id using a controlled suffix family.
- The canonical child-to-parent reference is stored on the child record.
- The inverse parent-to-children view must be derived, not manually maintained as canonical state.

## Acceptance Criteria

```gherkin
Scenario: Specialized requirement is linked to a functional parent
  Given a functional requirement exists
  When a specialized requirement is introduced for that capability
  Then the specialized requirement has its own registry header
  And the specialized requirement has its own body file
  And the specialized requirement declares the functional parent requirement id
  And no canonical child list is manually duplicated on the parent requirement
```

## Verification Expectation

A future Requirement registry validator must check specialized requirement id patterns, parent existence, parent type, and absence of manually duplicated canonical child lists.
