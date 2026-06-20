# ADR-0002 — STRIDE-AI Overlay Lifecycle and Stale Base Handling

## Status

Accepted.

## Context

STRIDE-AI overlays analyze AI/RAG pipeline risks over the Base Threat Analysis model and AI-specific project knowledge. AI-assisted output is especially sensitive to stale context, unreviewed evidence and hallucinated conclusions.

As the project evolves, STRIDE-AI overlays must remain tied to the exact Base Analysis version and project snapshot they analyzed.

This step is document-only and does not implement STRIDE-AI execution, model calls, RAG, CI/CD checks, finding generation or UI.

## Decision

Each STRIDE-AI overlay must reference exactly one consolidated Base Analysis version as its canonical topology input and must preserve the AI/RAG context assumptions used for the analysis.

When the referenced Base Analysis version or relevant AI/RAG project knowledge becomes stale, the STRIDE-AI overlay must be marked stale, require review, require rebase, or be superseded according to policy.

AI-generated observations, findings, mitigations and evidence remain candidates until reviewed. A stale STRIDE-AI overlay must not promote unreviewed AI output to current security coverage. Accepted outputs must retain evidence of the reviewed overlay version that produced them.

## Scope

In scope:

- STRIDE-AI overlay binding to Base Analysis versions;
- stale propagation from base and AI/RAG project knowledge;
- reviewed-output policy for stale STRIDE-AI records;
- preservation of historical reviewed evidence.

Out of scope:

- implementing LLM/RAG infrastructure;
- implementing STRIDE-AI taxonomy execution;
- defining prompt or model runtime contracts;
- implementing dashboards or policy gates.

## Consequences

### Positive consequences

- AI-assisted analysis remains reproducible and reviewable.
- Current STRIDE-AI coverage cannot silently rely on stale project context.
- CI/CD can surface stale AI/RAG analysis separately from general STRIDE.

### Negative consequences

- STRIDE-AI records need more evidence and context metadata than basic overlays.
- Future tooling must distinguish candidate AI output from reviewed, accepted evidence.

## Follow-up

1. Define the STRIDE-AI overlay record contract.
2. Define reviewed AI output states.
3. Define stale propagation inputs for AI/RAG-specific project knowledge.
