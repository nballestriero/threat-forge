# MR-0003REQ-0011 — Child Project Document Source Containment

## Intent

Document-source loading must not allow traversal, external roots, undeclared paths, or ambiguous canonical sources.

## Requirement

The system must require child-project document-source loading to reject traversal, absolute path injection, external roots, undeclared sources, and non-canonical documentation sources.

## Scope

This requirement applies to future child-project document-source loading and validation.

It does not implement filesystem adapters, symlink checks, manifest validation, or remote repository loading in this micropasso.

## Rules

- Document-source paths must resolve inside the child repository.
- Path traversal and absolute path injection must be rejected.
- External roots must be rejected unless a future governed ADR defines a controlled source type.
- Files not declared by the manifest must not be loaded as canonical governed documentation.
- Canonical project-model sources must not be confused with free-form guides or explanations.

## Acceptance Criteria

```gherkin
Scenario: Child project manifest contains an unsafe path
  Given a child-project document-source manifest declares a path outside the repository
  When document-source validation runs
  Then the path is rejected
  And the child project is not considered valid for governed documentation loading
```

## Verification Expectation

A future source-containment validator must fail unsafe child-project source paths, undeclared canonical sources, and attempts to load documentation outside the child repository.
