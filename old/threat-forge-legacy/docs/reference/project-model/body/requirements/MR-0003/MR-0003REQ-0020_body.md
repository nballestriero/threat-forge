# MR-0003REQ-0020 — Child Project Root Containment Validation

## Intent

Before threat-forge reads a child repository, the selected child-project root and project-model root must be explicit, canonical, and contained.

## Requirement

The system must require child-project Project Model validation to reject path traversal, absolute-path injection, external roots, undeclared canonical roots, and symlink or junction escapes outside the child repository root.

## Scope

This requirement applies to future child-project source loading and skeleton validation tooling.

It does not implement repository cloning, remote fetching, RBAC, UI, or threat-analysis execution in this micropasso.

## Rules

- The child-project repository root must be supplied explicitly to validation tooling.
- The canonical project-model root must resolve inside the child-project repository root.
- The default project-model root is `docs/reference/project-model/`.
- Validator file reads must reject `..` traversal and absolute path injection before loading governed files.
- Realpath or equivalent canonicalization must reject symlink and junction escapes when the platform supports that check.
- Generated artifacts, temporary directories, dependency directories, and files outside the standard Project Model root must not become canonical documentation sources.

## Acceptance Criteria

```gherkin
Scenario: Child project root containment rejects escapes
  Given a configured child project root
  When validation resolves project-model files
  Then every canonical source resolves inside the child project root
  And traversal, absolute paths, and symlink or junction escape attempts are rejected
```

## Verification Expectation

A future validator must include negative fixtures for traversal, absolute-path injection, external root configuration, and symlink or junction escape where supported by the operating system.
