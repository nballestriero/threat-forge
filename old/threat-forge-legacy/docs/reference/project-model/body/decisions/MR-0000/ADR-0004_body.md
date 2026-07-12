# ADR-0004 — Governed workflow and handoff working plan

## Status

Accepted.

## Context

`MR-0000` governs cross-cutting system-state and consistency controls.

The project is developed through small, verifiable micropassi. Each micropasso can introduce decisions, requirements, graph relations, documentation, tools, validators, verification artifacts, or generated handoff material.

If the operational state of the project exists only inside a chat transcript, then a later handoff can lose the active objective, the next safe step, the pending decisions, and the expected verification gates.

The project therefore needs a lightweight working plan that is versioned with the repository and kept coherent with the governed project model.

The working plan must not become an uncontrolled replacement for registries, ADRs, requirements, or graph records. It must summarize operational state and point back to governed sources.

## Decision

The project must maintain a governed working plan for operational continuity and handoff.

The canonical working plan document is:

```text
docs/reference/project-model/WORKING_PLAN.md
```

The working plan records the current semantic state of the project, the active objective, the current or next micropasso, completed milestones, pending decisions, pending requirements, pending implementations, pending validators, handoff notes, and the next suggested step.

The working plan must remain coherent with the project model. It must not invent decisions, requirements, tools, validators, or graph relations that are not represented by governed registries and graph records.

Exact Git facts such as current branch, HEAD, tags, and working tree cleanliness must be verified at handoff time by Git commands or by a generated handoff artifact. The working plan may summarize the last known semantic baseline, but it must not be treated as the canonical source for dynamic Git state.

Every future handoff should use the working plan together with the Git state, graph, registries, and generated artifacts. If the working plan and governed records diverge, the governed records and deterministic checks take precedence, and the working plan must be corrected.

The final long-term direction of the project is to support governed security and threat-modeling analysis workflows over GitHub projects created through threat-forge. Future methodology families may include STRIDE, PASTA, and STRIDE-AI. This is strategic context only at this stage; the current scope remains the governance substrate.

## Scope

In scope:

- declaring the working plan as a governed operational-state document;
- defining that handoff must use working plan, Git state, graph, registries, and generated project-model views together;
- defining that the working plan must remain coherent with governed records;
- recording the long-term strategic direction without implementing methodology-specific analysis.

Out of scope:

- implementing a working-plan validator;
- implementing the future MR-0000 runner;
- generating handoff material automatically from the working plan;
- implementing STRIDE, PASTA, STRIDE-AI, or other analysis methodologies.

## Consequences

### Positive consequences

* Project handoff has a stable operational anchor inside the repository.
* The active objective and next safe step can be recovered without relying only on chat memory.
* The working plan can guide LLMs and humans while still deferring canonical truth to registries, ADRs, requirements, graph records, and deterministic checks.
* Future handoff tooling can validate or generate the working plan from governed sources.

### Negative consequences

* The working plan becomes another artifact that must be maintained.
* Dynamic Git facts can become stale if they are copied into the working plan instead of verified during handoff.
* Future validators will be needed to detect drift between the working plan and governed records.

## Follow-up

1. Derive requirements for working plan coherence and handoff usage.
2. Add graph relations from the derived requirements to future implementation and verification artifacts.
3. Maintain `docs/reference/project-model/WORKING_PLAN.md` as a lightweight operational plan.
4. Later, implement a validator or runner check that detects drift between the working plan and governed project-model records.
