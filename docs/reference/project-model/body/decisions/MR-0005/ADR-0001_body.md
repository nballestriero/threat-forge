# ADR-0001 — STRIDE overlay boundary and security requirement derivation

## Status

Accepted.

## Context

`MR-0004` defines the Base Threat Analysis canonical model as a small, methodology-neutral inventory made of `Actor`, `Component`, `Data Resource`, explicit `Boundary`, and `Data Flow`. That base model owns DFD-style views, aggregation levels, and the canonical analyzed-system topology.

The next design question is how STRIDE should use that base model without becoming a competing asset inventory. STRIDE is valuable because it gives a repeatable taxonomy for security reasoning, but it must not silently add, remove, or rewrite base actors, components, data resources, boundaries, or data flows.

This step is intentionally document-only. It does not implement STRIDE analysis, generate findings, create specialized security requirements, create runtime code, create UI, create OpenAPI contracts, or add new graph node/predicate registry entries.

## Decision

STRIDE must be modeled as a methodology overlay over the Base Threat Analysis canonical model.

The STRIDE overlay must preserve the base inventory. It may classify, annotate, prioritize, and explain base elements and base data flows, but it must not create an independent topology. If a STRIDE review discovers a missing actor, component, data resource, boundary, or data flow, the result must be recorded as a proposed change to the Base Threat Analysis model rather than silently added only to the STRIDE overlay.

The STRIDE overlay taxonomy must include the standard STRIDE categories:

1. `Spoofing`;
2. `Tampering`;
3. `Repudiation`;
4. `Information Disclosure`;
5. `Denial of Service`;
6. `Elevation of Privilege`.

The overlay may apply those categories to base elements, boundaries, and data flows. For example, a browser/API boundary and its data flows may be classified for spoofing, tampering, information disclosure, and elevation-of-privilege concerns. A data resource may be classified for tampering and information disclosure concerns. A component may be classified for denial-of-service and elevation-of-privilege concerns.

STRIDE analysis must distinguish classification, security property, threat hypothesis, finding, mitigation, and specialized security requirement:

- a classification says which STRIDE concern applies to a base element or flow;
- a security property states what must be true to manage that concern;
- a threat hypothesis describes a plausible failure or attack path;
- a finding records a reviewed and evidence-backed issue;
- a mitigation describes a control or design response;
- a specialized security requirement converts a necessary control into governed project requirements.

The STRIDE overlay may produce specialized security requirements for the analyzed project, but those requirements must remain traceable to the base element or flow they protect, the STRIDE classification that motivated them, and the evidence or review that accepted them.

The STRIDE overlay therefore interprets the Base Threat Analysis model. It does not own the base topology.

## Scope

In scope:

- STRIDE as an overlay over the Base Threat Analysis model;
- immutable boundary between base inventory and STRIDE annotations;
- STRIDE taxonomy classification contract;
- derivation path from classification to security property, threat hypothesis, mitigation, and specialized security requirement;
- readiness for future graph and UI traversal from base elements to STRIDE reasoning.

Out of scope:

- implementing STRIDE tooling;
- creating STRIDE result schemas;
- creating specialized security requirement validators;
- generating findings, mitigations, or project-specific controls;
- changing the Base Threat Analysis canonical taxonomy;
- defining STRIDE-AI categories.

## Consequences

### Positive consequences

* STRIDE can be applied consistently to threat-forge and child projects.
* The canonical DFD and inventory remain stable while STRIDE adds security interpretation.
* Security requirements derived from STRIDE can be traced back to base elements, flows, and boundaries.
* The Project Model Explorer can later show STRIDE paths without confusing overlay annotations with base topology changes.

### Negative consequences

* STRIDE reviews must include a feedback path when missing base elements are discovered.
* Future tooling must distinguish base inventory mutations from overlay annotations.
* Some STRIDE concerns may require security-specific vocabularies that are not yet registered.

## Follow-up

1. Define the first governed STRIDE result schema or registry once the overlay model is ready to be implemented.
2. Define how STRIDE classifications are represented in graph projections without mutating base inventory.
3. Define how specialized security requirements inherit traceability from base elements and STRIDE classifications.
4. Implement STRIDE tooling only after the governed requirements and graph contracts exist.
