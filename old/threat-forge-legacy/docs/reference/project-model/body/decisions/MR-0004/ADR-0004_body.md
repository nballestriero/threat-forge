# ADR-0004 — Domain-neutral Base Analysis Taxonomies and Extension Model

## Status

Accepted.

## Context

`MR-0004/ADR-0001` defines the Base Threat Analysis model and `MR-0004/ADR-0002` defines a pipeline where governed project knowledge produces reviewed base inventory before DFD derivation. The next design concern is how Base Analysis classifications stay useful for child projects of any nature.

Governed child projects may describe a web application, business workflow, AI/RAG system, irrigation system, industrial control environment, energy system, physical plant, IoT deployment, manual process or mixed cyber-physical system. Base Analysis must not assume one of these domains. If the base taxonomy is too specialized, future methodologies and domain profiles will be forced to mutate or bypass the canonical model.

This step is intentionally document-only. It does not implement taxonomy validators, Base Analysis storage, custom taxonomy authoring, UI rendering, API contracts, import/export or methodology execution.

## Decision

Base Analysis taxonomies must be domain-neutral and methodology-neutral.

The Base Analysis taxonomy must classify universal analysis primitives only: actors, components, resources, boundaries, flows, lifecycle status and candidate review status. It must not encode software-specific, AI-specific, industrial-specific, business-specific or threat-methodology-specific values as canonical base values.

The base resource primitive is interpreted broadly. Existing references to data resources must not prevent modeling operational, physical, configuration, evidence, contract or knowledge resources when those resources are relevant to security analysis.

Domain-specific specialization must be expressed through governed domain profiles or project-specific taxonomy extensions. Methodology-specific specialization must be expressed through overlays such as STRIDE, STRIDE-AI, PASTA, safety, privacy or compliance taxonomies. These extensions may classify, annotate and derive findings over BaseAnalysisVersion elements, but they must not mutate the canonical base inventory or replace mandatory base classifications.

User-defined project taxonomy extensions are allowed as a future capability. They must be governed records with namespace, scope, version, owner, lifecycle status, mandatory descriptions and explicit mapping to the base taxonomy value they specialize. A project taxonomy such as `irrigation_component_type=pump` must map to a base value such as `base_component_kind=physical_or_operational_unit`; it must not replace the base value.

BaseAnalysisVersion records and future overlays must record which base, domain, methodology, workspace or project taxonomy versions were used. A taxonomy change can therefore become a security-relevant change input and may require review, rebase or supersede handling under the versioned lifecycle.

## Scope

In scope:

- domain-neutral Base Analysis taxonomy principles;
- universal base actor, component, resource, boundary and flow taxonomy sets;
- lifecycle and candidate review status taxonomy sets;
- future custom taxonomy extension governance;
- mandatory mapping from extensions to base taxonomy values;
- taxonomy version binding for future analysis snapshots.

Out of scope:

- implementing taxonomy validation;
- implementing custom taxonomy authoring UI;
- implementing Base Analysis runtime storage;
- implementing methodology-specific taxonomies;
- implementing domain profile registries;
- defining exact OpenAPI or Zod contracts;
- defining concrete UI theme colors.

## Consequences

### Positive consequences

- Child projects can represent software, operational, physical, AI, industrial and business systems without changing the base model.
- STRIDE, STRIDE-AI, PASTA and future methodologies can specialize the same BaseAnalysisVersion without mutating it.
- Users can later add project-specific vocabulary while preserving cross-project analysis, reporting and CI/CD comparability.
- UI legends and graph filters can rely on stable semantic taxonomy values.
- Taxonomy changes can participate in stale detection and evidence-backed lifecycle decisions.

### Negative consequences

- Base taxonomy values are intentionally abstract and may feel less precise without a domain profile.
- Future UI and reports must display both base classifications and optional domain/methodology classifications.
- Custom taxonomy governance will require validation, versioning and mapping rules before user-defined extensions can be safely enabled.

## Follow-up

1. Define schemas and validators for taxonomy registry structure.
2. Define a domain profile registry model.
3. Define methodology overlay taxonomy registries for STRIDE, STRIDE-AI and PASTA.
4. Define how BaseAnalysisVersion records bind taxonomy versions.
5. Define UI/API contracts that expose base classifications plus optional extension classifications.
