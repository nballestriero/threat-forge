# ADR-0018 — Project Documentation Explorer filesystem source path canonicalization boundary

## Status

Accepted.

## Context

The Project Documentation Explorer filesystem source adapter reads governed project-model registries, graph files and governed Markdown bodies from a repository root. The current boundary already rejects obvious path traversal through relative paths that escape the configured project root.

A code review highlighted a stronger filesystem risk: a path can appear to be inside the allowed root while resolving through a symbolic link, junction or equivalent filesystem indirection to content outside the allowed root. That would break the intended port/adapter boundary and may let future child-project documentation loading read files that are not part of the governed project documentation corpus.

Threat-forge must apply to itself the same controls it will impose on child projects. The filesystem source adapter therefore needs a governed canonical path rule before Project Documentation Explorer loading is reused as a broader child-project or workspace documentation source.

This decision is intentionally dependency-free. It does not replace the YAML parser, add a router, add runtime storage, introduce dynamic RBAC or change the read-only HTTP API.

## Decision

MR-0002 shall require the Project Documentation Explorer filesystem source adapter to canonicalize filesystem paths before reading governed documentation artifacts.

The adapter must resolve requested governed paths against the configured repository/documentation root and must validate the canonical filesystem location before reading file content. The validation must account for symbolic links and equivalent filesystem indirection by using real/canonical paths where supported by the runtime platform.

The boundary rule is:

```text
configured documentation root
→ canonical allowed root
requested governed relative path
→ resolved absolute path
→ canonical requested path
→ read only if canonical requested path remains inside canonical allowed root
```

The adapter must fail closed when canonicalization cannot prove containment. Expected failures may use typed domain/source errors in a future implementation, but the first implementation may remain local to the filesystem adapter as long as external HTTP behavior remains fail-closed and does not leak filesystem details.

The rule applies to reads of registry files, graph files, governed Markdown body files, OpenAPI contracts when loaded through the Project Documentation Explorer source boundary, and any future child-project documentation files read by the same adapter pattern.

## Scope

In scope:

- defining canonical path containment for Project Documentation Explorer filesystem reads;
- protecting against `..` traversal and symlink/junction escape from the configured root;
- failing closed when the canonical path cannot be resolved safely;
- avoiding leakage of absolute filesystem paths in public error responses;
- adding runtime tests for symlink escape behavior when the platform supports symlinks.

Out of scope:

- replacing the custom YAML parser with a third-party parser;
- adding a filesystem watching or caching layer;
- adding a new storage backend;
- introducing a router/framework dependency;
- changing the live HTTP UI data-source behavior;
- adding dynamic RBAC or MR-0007 identity/session behavior;
- implementing Base Analysis, STRIDE or STRIDE-AI runtime/storage.

## Consequences

### Positive consequences

* Documentation reads become safer when threat-forge analyzes itself and future child projects.
* The adapter boundary remains explicit: governed relative paths may only read canonical files inside the configured root.
* Symlink-based path traversal is prevented before filesystem adapters are reused more broadly.
* The improvement is dependency-free and compatible with the existing port/adapter architecture.

### Negative consequences

* Tests may need to handle platform differences in symlink support and permissions, especially on Windows.
* The adapter must carefully handle missing files and canonicalization failures without leaking host filesystem details.
* Some legitimate symlinked documentation layouts may be rejected unless a future ADR deliberately allows and governs them.

## Follow-up

1. Add canonical path containment logic to the Project Documentation Explorer filesystem source adapter.
2. Use real/canonical paths for both the configured root and requested files before reads.
3. Fail closed when requested paths cannot be proven to stay inside the canonical root.
4. Add runtime tests for normal reads, `..` traversal, symlink escape where supported and public error redaction.
5. Do not introduce caching, YAML parser replacement or new dependencies in the first implementation.
