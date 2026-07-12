# ADR-0019 — Project Documentation Explorer snapshot caching boundary

## Status

Accepted.

## Context

The Project Documentation Explorer currently loads a governed project-model snapshot from source data exposed through the ProjectDocumentationExplorer source port. The native HTTP server and live frontend UI can call the read-only endpoints repeatedly while a developer browses documentation, filters entities or opens details.

A code review highlighted that repeatedly loading the complete project-model snapshot from filesystem-backed registries, graph files and governed Markdown bodies can become unnecessarily expensive as the governed corpus grows and as future child-project documentation sources reuse the same source boundary.

The project still needs deterministic, fail-closed behavior. Caching must not make stale or cross-project data appear authoritative, must not add mutation endpoints, and must not introduce new dependencies before the cache boundary is governed. This decision therefore defines a small, dependency-free in-memory snapshot cache boundary before any implementation.

## Decision

MR-0002 shall support an optional in-memory cache for the complete Project Documentation Explorer snapshot returned by `sourcePort.loadSnapshot()`. The cache must be implemented as a source-port decorator or equivalent composition-root layer, not inside the HTTP controller and not as hidden global state.

The cache scope must be one configured Project Documentation Explorer composition root, server process and project/documentation root. It must not be global across projects, workspaces, child projects or repository roots.

The first supported invalidation policy is a simple time-to-live value. A TTL of `0` or an absent value means caching is disabled. The initial boundary deliberately excludes `fs.watch`, mtime fingerprinting, LRU caching and distributed caching. Those can be introduced later only through a dedicated decision if the project needs them.

The cache must preserve fail-closed semantics:

```text
empty cache + load failure
→ fail closed

warm cache + expired TTL + reload failure
→ fail closed by default

warm cache + unexpired TTL
→ serve cached snapshot for that configured source scope
```

Serving stale data after reload failure is not allowed by default. A future stale-on-error mode would require an explicit ADR, requirement and visible status semantics before implementation.

The cache boundary must remain read-only. It must not add HTTP mutation endpoints such as cache clear or refresh operations. Configuration must pass through the composition root or local serve command configuration.

## Scope

In scope:

- defining optional in-memory snapshot caching for Project Documentation Explorer source loading;
- keeping snapshot caching scoped to the configured source/composition root;
- using TTL-based invalidation as the first supported mechanism;
- keeping the default safe by allowing cache disabled through `TTL=0`;
- preserving fail-closed behavior when loading fails;
- avoiding new dependencies in the first implementation.

Out of scope:

- filesystem watching;
- mtime/fingerprint-based invalidation;
- LRU cache libraries;
- distributed or persistent cache storage;
- HTTP cache mutation endpoints;
- stale-on-error behavior as a default;
- replacing the YAML parser;
- introducing query/cache libraries in the frontend;
- dynamic RBAC or MR-0007 identity/session behavior;
- Base Analysis, STRIDE or STRIDE-AI runtime/storage caching.

## Consequences

### Positive consequences

* The live HTTP explorer can avoid repeated full snapshot loads when caching is explicitly enabled.
* The source-port decorator shape preserves the existing Controller → Service → Port → Adapter boundary.
* The cache policy is deterministic, small and testable without new dependencies.
* Child-project support remains safer because cache scope is tied to a configured source root rather than process-global state.

### Negative consequences

* A TTL-only cache may show data that is briefly behind the filesystem state until the TTL expires.
* Cache-disabled mode may remain slower for large corpora until the operator enables TTL caching.
* Without mtime or file watching, the first cache implementation trades fine-grained freshness for simplicity.
* Fail-closed reload behavior can temporarily reduce availability when the source becomes invalid, even if an older cached snapshot exists.

## Follow-up

1. Add a dependency-free source-port snapshot cache decorator or composition-root wrapper.
2. Add local serve configuration for snapshot cache TTL, with `0` meaning disabled.
3. Verify that cache-disabled mode calls `loadSnapshot()` on every request.
4. Verify that cache-enabled mode reuses the cached snapshot within TTL and reloads after expiry.
5. Verify that first-load failures and expired-cache reload failures fail closed.
6. Do not add `fs.watch`, mtime fingerprinting, LRU libraries, cache mutation endpoints or stale-on-error behavior in the first implementation.
