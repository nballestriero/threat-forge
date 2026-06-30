# ADR-0029 — Child Project Documentation Source Fail-Closed Boundary

## Status

Accepted.

## Context

The Governance Console can select a registered child project and route the user to the Project Documentation Explorer. That route must not accidentally show the platform ThreatForge Project Model when the child-project documentation source is missing, unavailable or not yet started.

A silent fallback is dangerous because the UI still renders valid documentation, but the documentation belongs to the platform workspace rather than the selected child project. This can mislead users during child-project governance review and can mask missing child documentation infrastructure.

## Decision

ThreatForge will treat child-project documentation as a distinct data-source context from platform documentation. Platform Project Documentation Explorer views may continue to use the platform snapshot or an explicitly configured platform HTTP source according to their governed source policy. Child-project documentation views MUST use an explicitly configured child Project Documentation Explorer HTTP source and MUST NOT fall back to the platform snapshot or platform HTTP source.

When the child-project documentation source is not configured, the frontend will fail closed through an explicit unavailable client and the Project Documentation Explorer page will render a child-project source error state. When the child HTTP source is configured but fails, snapshot fallback remains disabled so the error is visible instead of substituting platform records.

## Scope

In scope:

- separating platform and child Project Documentation Explorer frontend client construction;
- removing implicit child documentation defaults that point at the platform Project Documentation Explorer endpoint;
- adding an explicit unavailable child-documentation client state;
- rendering a clear child-documentation load error instead of platform records;
- verifying that child-documentation unavailable state does not use snapshot fallback.

Out of scope:

- implementing a full multi-child backend documentation router;
- adding writable child-project document operations;
- changing Project Documentation Explorer platform snapshot fallback behavior;
- changing child-project management persistence or registration contracts;
- changing shell visual hierarchy or navigation icons.

## Consequences

### Positive consequences

- A selected child project no longer silently displays ThreatForge platform documents when its documentation source is not available.
- Missing child documentation infrastructure becomes visible as an explicit source-state problem.
- The platform snapshot fallback remains available only for platform documentation contexts.
- Future child-project documentation routing can build on a fail-closed source boundary.

### Negative consequences

- Local demos must explicitly configure `VITE_CHILD_PROJECT_DOCUMENTATION_EXPLORER_HTTP_BASE_URL` before opening child documents.
- Users will see an error state until a child Project Documentation Explorer API is running.
- The first fix does not yet provide per-child backend routing; it only prevents misleading fallback behavior.

## Follow-up

1. Add a governed backend route for selecting documentation sources by child project id.
2. Show live platform/child data-source status in the shell and page header.
3. Link child-documentation source diagnostics to setup guidance and Project Model details.
