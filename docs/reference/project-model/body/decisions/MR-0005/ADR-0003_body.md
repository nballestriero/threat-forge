# ADR-0003 — Methodology plugin contract, discovery and deterministic derivation boundary

## Status

Draft

## Context

ThreatForge already defines a common methodology-specific Analysis Record whose outer structure and governed subjects remain independent from the selected method, while the internal method payload remains uninterpreted by the common model. Real STRIDE, STRIDE-AI and future methods need to validate that payload and derive method-informed Finding candidates without moving their classifications, applicability rules or failure modes into the common core. Without an explicit plugin boundary, a syntactically valid method identifier could be confused with an available implementation, payload validity could depend on implicit module discovery, incompatible plugin versions could produce environment-dependent behavior, and deterministic Finding derivation could begin without reproducible method evidence.

## Decision

ThreatForge introduces a versioned methodology plugin boundary owned by MR-0005. The common analysis core owns the plugin API contract, the governed plugin catalog, plugin resolution and compatibility evaluation, validation orchestration, the common validation-result envelope and the gate controlling deterministic Finding derivation. Each methodology-specific Macro-requirement owns its plugin implementation, canonical method identifier, method payload schema, method-specific diagnostics, classifications, applicability rules, failure modes, attack classes and deterministic derivation logic.

Plugin discovery uses only an explicit append-first governed catalog. A catalog entry binds one unique method identifier to its owning Macro-requirement, plugin entry point, plugin API version, published payload schema and availability classification. Filesystem scanning, package naming conventions, network lookup and implicit imports do not establish plugin availability. The initial compatibility rule is exact equality between the plugin API version declared by the catalog entry and the API version supported by the common core; any broader compatibility relation follows a later governed contract revision.

A plugin validates only the selected method payload and method-owned semantics. The common core validates the Analysis Record envelope, identity, lifecycle state and governed subject references. The plugin receives immutable canonical inputs and returns validation or derivation data through the common contract without directly modifying Analysis Records, Base Analysis sources, governed requirements or common Findings. The payload schema is a canonical machine-readable artifact published by the plugin and referenced by the governed catalog rather than duplicated in the common core.

Core diagnostics and plugin diagnostics use distinct stable namespaces. Validation orchestration returns one deterministically ordered result that preserves common-record validity, plugin resolution and compatibility, payload validity or unverified status, Finding-derivation eligibility and all stable diagnostics. An unavailable or incompatible plugin does not retroactively invalidate an otherwise valid common Analysis Record envelope, but its payload remains unverified and deterministic Finding derivation remains blocked.

Deterministic Finding derivation is eligible only when the common Analysis Record is valid, every governed subject resolves, the explicit derivation state is accepted, the selected plugin is available and compatible, the method payload validates, and the plugin returns deterministic candidates accepted by the common Finding boundary. The same canonical input and plugin version produce the same ordered candidates and diagnostics. A fixture plugin can demonstrate this contract only under an explicit fixture-only classification in controlled test or case-study contexts; it does not represent or certify a real analysis methodology and is not selectable as a production method.

## Consequences

- Benefit: New analysis methods can extend ThreatForge without transferring method-specific semantics into the common core.
- Benefit: Plugin availability, compatibility and payload verification remain explicit and reproducible.
- Benefit: Structurally valid Analysis Records can remain inspectable when their plugins are unavailable while unsafe downstream derivation stays blocked.
- Benefit: Stable layered diagnostics can distinguish common-record failures from plugin-resolution and method-payload failures.
- Benefit: Deterministic Finding candidates remain traceable to one accepted Analysis Record and one compatible plugin version.
- Cost: Every method needs a governed catalog entry, a versioned contract implementation and a published payload schema.
- Cost: Contract revisions require explicit compatibility handling or coordinated plugin updates.
- Risk: Catalog, implementation and payload-schema drift could make an otherwise installed plugin unavailable.
- Risk: An overly restrictive common API could force method-specific concepts into unsuitable generic shapes.
- Constraint: The common core contains no STRIDE, STRIDE-AI or other concrete methodology classifications or rules.
- Constraint: Plugin discovery never depends on implicit filesystem, package or network behavior.
- Constraint: Unavailable or incompatible plugins leave method payloads unverified and block deterministic Finding derivation.
- Constraint: An accepted derivation state alone does not establish Finding-derivation eligibility.
- Constraint: Fixture-only plugins remain explicitly non-production and cannot claim implementation of a real methodology.

## Non-goals

- Define the exact plugin catalog member names or repository path
- Implement the plugin loader validation adapter or fixture plugin
- Define STRIDE-specific categories applicability rules or derivation logic
- Define STRIDE-AI-specific failure modes attack classes or derivation logic
- Provide process isolation remote installation hot loading or a third-party plugin marketplace
- Redefine the common Finding or Security Requirement document models
