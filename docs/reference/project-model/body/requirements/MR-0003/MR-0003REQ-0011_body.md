# MR-0003REQ-0011 — Child Project Document Source Containment

## Intent

Standard Project Model source loading must not allow traversal, external roots, undeclared governed roots, or ambiguous canonical sources.

## Requirement

The system must require child-project Project Model source loading to reject traversal, absolute path injection, external roots, undeclared governed roots, and non-canonical documentation sources.

## Scope

This requirement applies to future child-project Project Model source loading and validation.

It does not implement filesystem adapters, symlink checks, standard skeleton validation, or remote repository loading in this micropasso.

## Rules

- Project Model paths must resolve inside the child repository.
- Path traversal and absolute path injection must be rejected.
- External roots must be rejected unless a future governed ADR defines a controlled source type.
- Only files under the standard governed Project Model roots may be loaded as canonical requirement, ADR, graph, body-format, or taxonomy sources.
- Canonical Project Model sources must not be confused with free-form guides, tutorials, explanations, generated artifacts, or temporary notes.

## Acceptance Criteria

```gherkin
Scenario: Child project Project Model source escapes the repository
  Given a child-project Project Model source resolves outside the repository
  When standard Project Model source validation runs
  Then the source is rejected
  And the child project is not considered valid for governed documentation loading
```

## Verification Expectation

A future source-containment validator must fail unsafe child-project Project Model paths, undeclared governed roots, and attempts to load canonical documentation outside the child repository.
