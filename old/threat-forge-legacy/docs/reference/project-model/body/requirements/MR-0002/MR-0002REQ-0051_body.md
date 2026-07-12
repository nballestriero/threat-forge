# MR-0002REQ-0051 — Project Documentation Explorer filesystem source path canonicalization

## Intent

The Project Documentation Explorer filesystem source adapter must only read governed documentation files that are canonically inside the configured project/documentation root, including when symbolic links or equivalent filesystem indirection are present.

## Requirement

MR-0002 must provide canonical path containment for Project Documentation Explorer filesystem source reads.

## Scope

This requirement applies to the filesystem source adapter used by the Project Documentation Explorer backend slice to load governed registries, graph records, body Markdown, API contracts and future child-project documentation artifacts through the same source boundary.

It does not replace the YAML parser, introduce caching, add filesystem watchers, add a new storage backend, change HTTP routing, add dependencies, introduce dynamic RBAC or implement Base Analysis runtime/storage.

## Rules

- The adapter must resolve requested governed paths relative to an explicit configured root.
- The configured root must be canonicalized to its real filesystem location before containment checks where the runtime supports realpath resolution.
- Requested file paths must be canonicalized to their real filesystem location before file reads where the runtime supports realpath resolution.
- A requested file may be read only when its canonical path is contained inside the canonical configured root.
- `..` traversal, absolute path injection and symlink/junction escape from the configured root must fail closed.
- Missing files and canonicalization failures must not cause public HTTP responses to leak absolute host filesystem paths or stack traces.
- The first implementation must remain dependency-free.
- The first implementation must not add caching, file watching, YAML parser replacement, router replacement or runtime storage.
- Runtime tests must cover safe in-root reads, path traversal rejection and symlink escape rejection where supported by the host platform.

## Acceptance Criteria

```gherkin
Scenario: In-root governed file is readable
  Given a governed documentation file exists inside the configured project root
  When the Project Documentation Explorer filesystem source adapter reads it through a governed relative path
  Then the adapter resolves the path canonically
  And the file content is returned

Scenario: Parent-directory traversal is rejected
  Given a requested governed path attempts to escape the configured root with parent-directory segments
  When the filesystem source adapter resolves the path
  Then the read fails closed
  And no file outside the configured root is read

Scenario: Symlink escape is rejected when supported
  Given a symbolic link inside the configured root points outside the configured root
  When the filesystem source adapter attempts to read through the link
  Then the canonical requested path is outside the canonical root
  And the read fails closed

Scenario: Filesystem failures do not leak host paths
  Given canonicalization or reading fails
  When the failure is exposed through the Project Documentation Explorer HTTP boundary
  Then the public error response does not expose absolute host filesystem paths or stack traces
```

## Verification Expectation

Runtime tests must verify canonical containment behavior for safe reads, traversal attempts and symlink escape attempts where the platform supports symbolic links. Existing HTTP error tests or future adapter tests must preserve fail-closed public error behavior without leaking filesystem internals.
