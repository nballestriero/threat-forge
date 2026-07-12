# MR-0002REQ-0070 — Child Project Documentation Unavailable UI State

## Intent

Make missing child-project documentation sources visible to users instead of showing valid-looking documentation from the wrong workspace.

The requirement ensures that an unavailable child source is a clear UI state, not a hidden fallback path.

## Requirement

ThreatForge MUST render an explicit child-project documentation unavailable state when the selected child project's Project Documentation Explorer source is missing or fails. The unavailable state MUST preserve the selected child-project context and MUST communicate that no child documentation source is configured or reachable.

## Scope

In scope:

- Project Documentation Explorer frontend error rendering;
- child-project source-state messages supplied by the client boundary;
- local demo guidance that requires explicit child documentation source configuration;
- runtime tests for fail-closed unavailable client behavior.

Out of scope:

- designing a full troubleshooting workflow;
- adding toast notifications or modal dialogs;
- creating child-project documentation sources automatically;
- changing platform documentation error rendering beyond shared behavior.

## Rules

1. The UI MUST not replace child-project source failures with platform documentation.
2. The error title or message MUST identify the child-project documentation context.
3. The child-project unavailable state MUST be reachable without starting a platform fallback source.
4. Local demo guidance MUST indicate that the child documentation HTTP source must be configured explicitly.
5. Unknown or unavailable child documentation source states MUST remain read-only.

## Acceptance Criteria

- The Project Documentation Explorer page displays a child-project-specific load failure when the child documentation source is unavailable.
- The fail-closed client exposes data-source state with `effective_source: unavailable` and `fallback: false`.
- Runtime frontend-client tests cover the no-fallback unavailable path.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

Manual UI review should confirm that selecting a child project without a configured child documentation API no longer shows ThreatForge platform documents.
