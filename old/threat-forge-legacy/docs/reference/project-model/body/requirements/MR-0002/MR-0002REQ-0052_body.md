# MR-0002REQ-0052 — Project Documentation Explorer snapshot caching policy

## Intent

The Project Documentation Explorer must be able to reduce repeated project-model snapshot loading while preserving deterministic, read-only and fail-closed behavior.

## Requirement

MR-0002 must provide a governed optional in-memory cache policy for Project Documentation Explorer snapshots loaded through the source port.

## Scope

This requirement applies to the Project Documentation Explorer backend slice and local serve composition root when they load the complete governed documentation snapshot through `sourcePort.loadSnapshot()`.

It does not apply to Base Analysis runtime/storage, STRIDE/STRIDE-AI overlays, frontend query/cache libraries, persistent caches, distributed caches or child-project cache orchestration beyond requiring source-scope isolation.

## Rules

- The cache must store the complete snapshot returned by the configured source port.
- The cache must be scoped to one composition root, server process and configured project/documentation root.
- The cache must not be global across workspaces, child projects or repository roots.
- The first implementation must be dependency-free.
- The first invalidation mechanism must be TTL-based.
- A TTL of `0` or absent cache TTL configuration must mean cache disabled.
- Cache configuration must be provided through the composition root or local serve command configuration, not through hidden module-level constants.
- The HTTP boundary must remain read-only and must not expose cache mutation endpoints.
- When the cache is empty and snapshot loading fails, the request must fail closed.
- When a cached snapshot is expired and reload fails, the request must fail closed by default rather than silently serving stale data.
- A future stale-on-error mode, filesystem watcher, mtime fingerprint or third-party cache library requires a separate governed decision before implementation.

## Acceptance Criteria

```gherkin
Scenario: Cache disabled reloads every request
  Given Project Documentation Explorer snapshot cache TTL is 0
  When two documentation requests are served
  Then the underlying source port loadSnapshot operation is called for each request

Scenario: Cache enabled reuses snapshot within TTL
  Given Project Documentation Explorer snapshot cache TTL is greater than 0
  When two documentation requests are served within the TTL window
  Then the second request reuses the cached snapshot
  And the underlying source port is not reloaded for the second request

Scenario: Cache reloads after TTL expiry
  Given Project Documentation Explorer snapshot cache TTL is greater than 0
  And the cached snapshot is older than the TTL
  When a documentation request is served
  Then the underlying source port is called to load a fresh snapshot

Scenario: First load failure fails closed
  Given the cache is empty
  And the underlying source port cannot load a snapshot
  When a documentation request is served
  Then the request fails closed

Scenario: Expired cache reload failure fails closed
  Given a cached snapshot exists
  And the cached snapshot is expired
  And the underlying source port cannot load a fresh snapshot
  When a documentation request is served
  Then the request fails closed by default
  And stale data is not silently served
```

## Verification Expectation

Runtime tests must verify cache-disabled behavior, cache reuse within TTL, reload after TTL expiry, first-load fail-closed behavior and expired-cache reload fail-closed behavior. Tests must also verify that cache scope is provided by composition rather than global mutable state.
