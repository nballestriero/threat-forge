# ADR-0007 — Architettura applicativa riutilizzabile per adapter CLI e web

## Status

Draft

## Context

ThreatForge is introducing product capabilities that initially use a command-line interface and later become available through a web application. The legacy ThreatForge implementation already demonstrated a reusable backend shape based on factories, a feature-local composition root, controllers, services, ports, adapters, Zod contracts and transport-independent route descriptors. The current governed repository preserves the separation between core capabilities, the ThreatForge application and delivery adapters, but it does not yet define the complete reusable module shape for new product features. Implementing target-project creation directly inside a CLI runner would couple application behavior to terminal parsing, filesystem access and interactive confirmation, making later web reuse more difficult.

## Decision

ThreatForge adopts a reusable application architecture for product features exposed through CLI and web delivery adapters. Feature behavior resides in application services that receive validated commands and depend on explicit ports rather than concrete filesystem, Git, database or transport implementations. Adapters implement those ports, while a feature-local factory or composition root creates concrete dependencies and returns the composed feature module. CLI runners remain thin delivery adapters responsible for argument parsing, user interaction, result formatting and process exit behavior. HTTP controllers and route descriptors remain thin delivery boundaries that translate validated transport input into application-service commands and return transport-safe results. Zod represents runtime contracts at application and transport boundaries, and OpenAPI represents the HTTP contract consumed by the future React frontend. React components consume API clients or frontend controller and hook boundaries without reading governed YAML, Markdown, graph, Git or filesystem sources directly. Cross-cutting HTTP behavior remains in middleware, while feature-specific behavior remains in the owning application service. The architecture applies first to target-project creation and later to other reusable ThreatForge product capabilities.

## Consequences

- Benefit: CLI and web adapters reuse the same application behavior.
- Benefit: Application services remain independently testable without terminal or HTTP coupling.
- Benefit: Concrete filesystem and future storage implementations remain replaceable behind ports.
- Benefit: Composition roots make dependency ownership and feature assembly explicit.
- Benefit: Zod and OpenAPI provide distinct runtime and HTTP contract boundaries.
- Benefit: React remains isolated from governed repository source formats.
- Cost: Each product feature requires explicit contracts, services, ports, adapters and composition.
- Cost: Initial implementation requires more files than a single command-line runner.
- Cost: CLI and HTTP adapters require separate verification against shared service behavior.
- Risk: Excessive abstraction could slow the first demonstrable product.
- Risk: Application logic could leak back into delivery adapters if boundaries are not verified.
- Risk: Legacy patterns could be copied without adapting them to the simplified current model.
- Constraint: Feature behavior belongs to the owning Macro-requirement while reusable architecture belongs to MR-0002.
- Constraint: Controllers and delivery adapters do not instantiate concrete infrastructure adapters.
- Constraint: Services access infrastructure only through explicit ports.
- Constraint: A feature-local composition root owns concrete dependency assembly.
- Constraint: The initial CLI and future web API use the same application-service contract.
- Constraint: The frontend does not read project-model files or filesystem paths directly.
- Constraint: The first implementation remains limited to the architecture needed by target-project creation.

## Non-goals

- Define the final web interface
- Select a final HTTP framework
- Define authentication, role or permission semantics
- Define every future storage adapter
- Rebuild the complete legacy application architecture
- Implement target-project creation in this Decision
