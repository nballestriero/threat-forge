# MR-0002REQ-0069 — Child Project Documentation Source Isolation

## Intent

Prevent the Governance Console from showing ThreatForge platform documentation when the user selected a child project and opened that child project's documents.

The requirement protects child-project governance review from misleading platform fallback data.

## Requirement

ThreatForge MUST construct child-project Project Documentation Explorer clients from an explicitly configured child documentation HTTP source. If no child documentation source is configured, the child-project documentation context MUST fail closed and MUST NOT use the platform Project Documentation Explorer snapshot or platform HTTP source.

## Scope

In scope:

- Governance Console frontend composition;
- child-project Project Documentation Explorer client selection;
- platform versus child documentation context separation;
- disabling snapshot fallback for child documentation contexts.

Out of scope:

- implementing a multi-child backend source router;
- changing the platform Project Documentation Explorer snapshot fallback policy;
- adding write operations for child Project Models;
- changing child-project registration storage.

## Rules

1. Platform documentation and child-project documentation MUST be represented as separate frontend source contexts.
2. Child-project documentation MUST NOT default to the platform Project Documentation Explorer endpoint.
3. Child-project documentation MUST NOT fall back to the platform generated snapshot.
4. A missing child documentation source MUST be represented as an explicit unavailable state.
5. The browser MUST keep reading through frontend client ports and MUST NOT inspect filesystem paths directly.

## Acceptance Criteria

- Opening child-project documents without a configured child documentation source produces an explicit unavailable state.
- No platform snapshot records are shown for that unavailable child-project context.
- Platform documentation still uses its governed source policy.
- JSDoc and graph relations trace the implementation to this requirement and ADR.
- `npm run repo:check` passes.

## Verification Expectation

Run `npm run repo:check`.

The runtime frontend-client tests should verify that the child-project unavailable client reports `fallback: false` and rejects reads instead of loading snapshot data.
