# ADR-0009 — Governed Security Requirement specialization and finding derivation

## Status

Draft

## Context

ThreatForge currently defines four governed document models: Macro-requirement, Decision, Functional Requirement and Governance Requirement. The common analysis model establishes Common Findings as methodology-neutral and traceable results originating from methodology-specific Analysis Records, but the governed corpus has no document model capable of representing the security obligations introduced to address accepted Findings.

Treating those obligations as Governance Requirements would confuse required product security behavior with repository governance, validation and verification controls. Treating them as ordinary independent Functional Requirements would lose their child relationship with the function they protect. Binding them directly to methodology plugins or method-specific classifications would instead couple product obligations to one analytical vocabulary and would obscure the common Finding boundary between analysis and governed product requirements.

The project also needs a complete documentary trace from the methodology-specific analysis to the resulting security obligation without introducing a second canonical inventory for Common Findings. Common Finding source files already own stable identity, originating Analysis Record, affected subjects, analytical content and current review state. Security Requirement documents can therefore preserve the downstream derivation relation while leaving Finding identity and methodology-specific evidence with their existing owning models.

## Decision

ThreatForge introduces Security Requirement as a fifth logical governed document model. A Security Requirement expresses an independently testable security obligation and is a child specialization of exactly one governed Functional Requirement. It remains owned by the same Macro-requirement and Decision as its Functional Requirement parent because the security obligation belongs to the governed definition of the protected product behavior.

A Security Requirement is authored only after one or more Common Findings have been produced and explicitly reviewed as accepted. The author selects the accepted Common Findings used to justify the obligation and declares each selected Finding exactly once in the governed Finding derivation section of the Security Requirement Markdown body. Each referenced Common Finding includes the Security Requirement parent Functional Requirement among its affected governed Functional Requirements. A Finding can affect multiple Functional Requirements and can contribute to distinct Security Requirements under each affected parent. A Security Requirement can also consolidate one obligation supported by multiple accepted Findings. These relationships do not impose one-to-one cardinality and no automatic discovery, consolidation or requirement generation is implied.

The Security Requirement references Common Findings rather than methodology plugins, method identifiers or method-specific classifications. Each Common Finding preserves its originating Analysis Record, while the Analysis Record and the method-specific analytical documentation preserve the method, payload, classifications, applicability reasoning and methodological evidence. The complete documentary provenance is therefore navigable from Security Requirement to Common Finding to Analysis Record and to the methodology-specific analytical material without copying method semantics into the product requirement.

Security Requirement records share the governed requirement registry and use a distinct record variant discriminated by requirement_type security. The registry record preserves structural identity and parentage through id, title, status, requirement_type, macro_requirement_id, decision_id, parent_requirement_id and body_path. Finding references are not duplicated in the registry. They are owned by the dedicated Markdown body profile, whose canonical sections are Intent, Parent Functional Requirement, Finding derivation, Security obligation, Scope and Acceptance. The parent reference in the body is a readable governed mirror of parent_requirement_id. The Finding derivation references are the canonical downstream relation from the Security Requirement to the selected Common Findings.

The authoritative Common Finding inventory remains the repository-contained set of validated .analysis-finding.yml files. ThreatForge does not introduce a central Common Finding registry for Security Requirement derivation. Consumers can derive a consultable projection that combines Finding identity, current review state, originating Analysis Record, affected subjects, source path and referring Security Requirements by reading validated Finding sources and governed Security Requirement references. Such a projection is derived information and is not a second canonical source.

Security Requirement validation resolves the Functional Requirement parent and Common Finding references through their owning canonical models. It checks the current accepted state and parent-to-Finding coherence, but it does not interpret method-specific payloads, rediscover methodology classifications, execute a plugin or require the originating plugin to be available. The complete operational lifecycle of Common Finding review transitions and the workflow for revising existing Security Requirements after later state changes remain outside this Decision.

A Security Requirement is distinct from a Governance Requirement. The former constrains product behavior for security, while the latter defines deterministic governance, validation or verification obligations. Whether Governance Requirements can later govern Security Requirements remains a separate activation step and is not required to introduce the Security Requirement model itself.

## Consequences

- Benefit: Security obligations remain child requirements of the functional behavior they protect.
- Benefit: Product obligations remain independent from the vocabulary and availability of a particular methodology plugin.
- Benefit: Method-specific evidence remains available through the Common Finding and originating Analysis Record provenance chain.
- Benefit: Findings from different methods can support independent or consolidated Security Requirements without being merged automatically.
- Benefit: A complete consultable trace can be derived without creating a duplicate Common Finding registry.
- Benefit: Governance Requirements retain a meaning distinct from product security behavior.
- Cost: The canonical document model set expands from four models to five.
- Cost: The requirement registry body profiles authoring consumers and cross-model validation require coordinated extension.
- Cost: Authors must select and explain the accepted Findings used to derive each Security Requirement.
- Risk: Poorly scoped Security Requirements could duplicate their Functional Requirement parent.
- Risk: Weak Finding derivation prose could make an otherwise valid relation difficult for reviewers to understand.
- Risk: Excessive consolidation could hide independently actionable Findings.
- Constraint: Every Security Requirement has exactly one Functional Requirement parent.
- Constraint: Every Security Requirement remains in the same Macro-requirement and Decision as its parent.
- Constraint: Every Security Requirement declares at least one accepted Common Finding in its body.
- Constraint: Every referenced Common Finding includes the parent Functional Requirement among its affected governed Functional Requirements.
- Constraint: Each Common Finding selected for the Security Requirement derivation appears exactly once in the Finding derivation section.
- Constraint: Security Requirements do not contain method-specific classifications payloads applicability rules failure modes or attack classes.
- Constraint: Security Requirement creation and reference resolution never modify the originating Analysis Record or Common Finding.
- Constraint: Repository-contained validated .analysis-finding.yml files remain the canonical Common Finding sources.

## Non-goals

- Define STRIDE categories or analysis rules
- Define STRIDE-AI categories failure modes or attack classes
- Generalize Common Findings to performance reliability privacy or other non-security analysis domains
- Support Security Requirements justified only by policy standards compliance baselines or contracts
- Define quantitative risk scoring
- Define a security control catalogue
- Automatically discover consolidate generate or accept Security Requirements
- Introduce a central Common Finding registry
- Define the complete Common Finding review workflow transition authorization or remediation lifecycle
- Require Security Requirement validation to execute or interpret methodology plugins
- Activate Governance Requirement children of Security Requirements
- Implement the fifth document model in this Decision
