# ADR-0001 — Threat Analysis Lifecycle Audit and Evidence Trail

## Status

Accepted.

## Context

Versioned threat analysis introduces review, stale, rebase, supersede and policy-gate decisions. These decisions affect whether a project can claim current security-analysis coverage during development and CI/CD.

The project therefore needs an audit and evidence trail boundary before any runtime implementation is introduced.

This step is document-only and does not implement logging, audit storage, event schemas, evidence storage, dashboards or gates.

## Decision

Threat Analysis lifecycle transitions must be auditable.

Base Analysis versions, STRIDE overlays, STRIDE-AI overlays, findings, security requirements, mitigations, evidence records, stale reviews, rebase decisions, supersede decisions and CI/CD policy outcomes must preserve who/what made the decision, when it happened, which snapshot it referenced, which evidence justified it and which downstream records were affected.

Audit records must support both threat-forge self-analysis and child project analysis. They must not be tied to a single UI implementation.

## Scope

In scope:

- lifecycle audit events for threat analysis records;
- evidence retention for review, stale, rebase and policy outcomes;
- preserving historical analysis decisions for audit;
- future reporting and gate consumption.

Out of scope:

- implementing event storage;
- defining final event schemas;
- implementing user-visible audit UI;
- implementing CI/CD policy evaluation.

## Consequences

### Positive consequences

- Security analysis decisions can be reviewed later.
- CI/CD policy outcomes can be explained instead of appearing as opaque failures.
- Child projects receive the same evidence discipline as threat-forge itself.

### Negative consequences

- Lifecycle transitions need explicit evidence records.
- Future implementation must prevent audit/evidence records from being bypassed by direct state mutation.

## Follow-up

1. Define event and evidence record contracts.
2. Define retention and display rules for historical analysis versions.
3. Define how CI/CD gate outcomes link to analysis and evidence records.
