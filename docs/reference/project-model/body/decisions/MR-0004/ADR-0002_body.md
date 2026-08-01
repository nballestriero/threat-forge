# ADR-0002 — Progressive end-to-end analysis-core case-study validation

## Status

Draft

## Context

The repository-contained documentation-to-base-analysis Target Project currently demonstrates governed documentation, Base Analysis, one simulated methodology-specific Analysis Record and manually reviewed Common Findings. Its existing Common Finding-only verification intentionally excludes any Security Requirement so the earlier milestone cannot imply capabilities that were not active at that time. Security Requirement is now an active canonical governed document model, and the same case study is needed to demonstrate the complete common analysis-core chain before implementing real STRIDE or STRIDE-AI plugins.

## Decision

ThreatForge evolves the existing repository-contained case study through explicit and reproducible validation phases. The already published Common Finding-only phase remains historical evidence available through repository history and retains its original capability claims. The current case-study corpus advances to an end-to-end common-core phase that includes one manually authored Security Requirement under an affected Functional Requirement and justified by one or more explicitly accepted Common Findings. The Security Requirement preserves navigable provenance through each Common Finding to its originating Analysis Record without copying method identifiers, classifications or method payload into the governed requirement. The simulated STRIDE-labelled Analysis Record remains explicitly non-plugin and not accepted for deterministic derivation during this phase, so the resulting Finding and Security Requirement remain manually authored and explicitly reviewed. Phase-specific verification replaces the earlier assumption that the latest case-study corpus can never contain a Security Requirement. A later fixture-only methodology-plugin phase can exercise deterministic candidate derivation without changing the common Finding or Security Requirement models. Analysis-core closure evidence includes target-local governed authoring, VS Code assistance, complete provenance validation, focused negative cases, the full repository gate and a governed milestone tag.

## Consequences

- Benefit: The same compact Target Project demonstrates the complete documentary chain from governed sources to a testable security obligation.
- Benefit: The earlier Common Finding-only milestone remains reproducible without constraining every later case-study phase.
- Benefit: The common core can be evaluated independently from real STRIDE and STRIDE-AI plugin implementations.
- Benefit: VS Code and command-line authoring can be exercised against the same target-local canonical sources.
- Cost: Case-study verification needs explicit phase-aware obligations and evidence.
- Cost: The existing Common Finding-only checker needs governed realignment before the current corpus gains a Security Requirement.
- Risk: An unclear phase boundary could make a simulated STRIDE record appear to be output from an implemented plugin.
- Risk: Historical and current case-study claims could be confused when their verification commands are not documented separately.
- Constraint: The end-to-end phase contains no claim that a real STRIDE or STRIDE-AI plugin is implemented.
- Constraint: Security Requirement content remains methodology-independent.
- Constraint: Finding review and Security Requirement authoring remain explicit governed actions.
- Constraint: The evolution does not mutate Analysis Records or Common Findings as a side effect.
- Constraint: Core closure occurs only after target-local authoring, VS Code assistance and the full repository gate pass.

## Non-goals

- Implement a production STRIDE plugin
- Implement a production STRIDE-AI plugin
- Automatically accept Common Findings
- Automatically generate Security Requirements
- Rewrite or erase the previously published Common Finding-only phase
- Define a complete documentation-gap lifecycle
- Define quantitative risk scoring or a security control catalogue
