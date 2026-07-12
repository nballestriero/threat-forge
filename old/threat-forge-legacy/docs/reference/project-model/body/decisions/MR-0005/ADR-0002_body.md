# ADR-0002 — STRIDE Overlay Lifecycle and Stale Base Handling

## Status

Accepted.

## Context

STRIDE overlays must not mutate the canonical Base Threat Analysis inventory. They operate over a specific Base Analysis version. Once the base can become stale as the project evolves, STRIDE overlays must also have explicit lifecycle semantics.

This step is document-only and does not implement STRIDE execution, stale detection, finding generation, policy gates or UI.

## Decision

Each STRIDE overlay must reference exactly one consolidated Base Analysis version as its topology input.

A STRIDE overlay may remain historically valid for the Base Analysis version it references, but it must not represent current coverage when the referenced base is stale for the current project state unless a governed review confirms continued applicability.

When the referenced Base Analysis version becomes stale, the STRIDE overlay must be marked stale, require review, require rebase, or be superseded according to policy. Accepted STRIDE findings and specialized security requirements must preserve their original overlay reference even when newer overlay versions are created.

## Scope

In scope:

- STRIDE overlay binding to Base Analysis versions;
- stale propagation from base to STRIDE overlay;
- rebase/supersede semantics for STRIDE overlays;
- preservation of historical finding evidence.

Out of scope:

- implementing STRIDE taxonomy execution;
- defining finding schemas;
- implementing policy gates or dashboards;
- generating specialized requirements.

## Consequences

### Positive consequences

- STRIDE findings remain reproducible.
- Current coverage can be distinguished from historical coverage.
- CI/CD can reason about whether STRIDE analysis still applies to changed code and documentation.

### Negative consequences

- STRIDE overlays need explicit lifecycle records.
- Future tools must show stale overlays without losing old evidence.

## Follow-up

1. Define the STRIDE overlay record contract.
2. Define STRIDE finding lifecycle and conversion to security requirements.
3. Define STRIDE rebase policy after Base Analysis changes.
