# MR-0003REQ-0007 — Child Project Document-First Lifecycle

## Intent

Child projects must not introduce implementation code before the governed documentation that justifies the work exists.

## Requirement

The system must require governed documentation before implementation code is introduced in a child project.

At minimum, child-project implementation work must be preceded by an ADR and/or requirement that defines the intended behavior, scope, constraints, and verification expectation.

## Scope

This requirement applies to child-project lifecycle policy, guides, and future gates.

It does not implement code scanning, Git hooks, or CI/CD enforcement in this micropasso.

## Rules

- Child-project guides must state that documentation precedes implementation code.
- New functional work must be justified by a governed ADR and/or requirement before code is added.
- Implementation work without a governed documentation justification must be treated as non-compliant.
- The document-first rule must be enforceable by future local and CI/CD gates.
- Bootstrap or emergency exceptions must require a governed exception path.

## Acceptance Criteria

```gherkin
Scenario: Code is proposed before documentation
  Given a governed child project has new implementation code
  And no governed ADR or requirement justifies that code
  When the document-first gate evaluates the change
  Then the change is reported as non-compliant
```

## Verification Expectation

A future document-first validator must fail when implementation paths change without a matching governed ADR and/or requirement justification.
