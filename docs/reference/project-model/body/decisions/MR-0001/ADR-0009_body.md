# ADR-0009 — Governed Security Requirement specialization and finding derivation

## Status

Draft

## Context

ThreatForge currently defines four governed document models:
Macro-requirement, Decision, Functional Requirement and Governance
Requirement. The common analysis model now establishes accepted findings
as traceable inputs for later security requirement proposals, but the
governed corpus has no document model capable of representing those
security obligations. Treating them as Governance Requirements would
confuse system behavior required for security with repository validation
and governance controls. Treating them as ordinary independent Functional
Requirements would lose their specialization relationship with the
function they protect and their derivation from accepted analytical
findings.

## Decision

ThreatForge introduces Security Requirement as a fifth logical governed
document model. A Security Requirement expresses an independently
testable security obligation that specializes exactly one governed
Functional Requirement. It remains owned by the same Macro-requirement and
Decision as its functional parent so security behavior remains part of the
governed definition of the protected function. Every Security Requirement
references one or more accepted analysis findings that justify its
introduction. One Functional Requirement can own multiple Security
Requirements, one accepted finding can contribute to multiple Security
Requirements, and one Security Requirement can consolidate obligations
supported by multiple accepted findings. These relationships do not impose
one-to-one cardinality.

Security Requirement records share the governed requirement registry but
use a distinct record variant and a dedicated Markdown body profile. Their
bodies preserve the parent Functional Requirement, finding derivation,
security intent, security obligation, scope and verifiable acceptance
conditions. A Security Requirement is distinct from a Governance
Requirement: the former constrains system behavior for security, while the
latter defines deterministic governance, validation or verification
obligations. Governance Requirements can govern either a Functional
Requirement or a Security Requirement. Method-specific Macro-requirements
own analysis taxonomies, applicability rules and specialized finding
interpretations; they do not own the Security Requirements produced from
accepted findings.

## Consequences

- Benefit: Security obligations remain attached to the functional behavior they protect.
- Benefit: Findings from different methods can produce independent Security Requirements for the same Functional Requirement.
- Benefit: Security Requirements remain implementable testable and governable documents.
- Benefit: Method-specific analysis semantics remain separate from product security obligations.
- Benefit: Governance Requirements retain a meaning distinct from system security behavior.
- Cost: The canonical document model set expands from four models to five.
- Cost: The requirement registry body profiles authoring catalog and cross-model checks require extension.
- Cost: Governance Requirement parent validation needs to support Security Requirements.
- Risk: Poorly scoped Security Requirements could duplicate their Functional Requirement parent.
- Risk: Weak finding references could make the security obligation difficult to justify.
- Risk: Excessive consolidation could hide independently actionable findings.
- Constraint: Every Security Requirement has exactly one Functional Requirement parent.
- Constraint: Every Security Requirement remains in the same Macro-requirement and Decision as its parent.
- Constraint: Every Security Requirement references at least one accepted finding.
- Constraint: Security Requirements do not contain method-specific classifications.
- Constraint: Governance Requirements and Security Requirements retain distinct semantics.
- Constraint: Security Requirement creation never modifies the originating finding.

## Non-goals

- Define STRIDE categories or analysis rules
- Define STRIDE-AI categories failure modes or attack classes
- Define quantitative risk scoring
- Define a security control catalogue
- Automatically generate or accept Security Requirements
- Implement the fifth document model in this Decision
