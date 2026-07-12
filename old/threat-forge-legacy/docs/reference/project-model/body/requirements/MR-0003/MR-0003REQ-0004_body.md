# MR-0003REQ-0004 — Threat-forge self-analysis as a governed project

## Intent

Threat-forge must use its own governance and threat-analysis methods to improve the product.

This requirement captures the self-dogfooding obligation: the parent project must be analyzable by the same documentation and security-analysis workflow that it imposes on child projects.

## Requirement

The system must support treating threat-forge itself as a governed project for documentation governance and future base threat analysis.

Threat-forge must be able to use its own project-model documentation, graph, gates, and future threat-analysis structures as inputs for security analysis of the product.

The self-analysis workflow must not be a weaker or separate process from the child-project workflow unless a governed ADR explains a necessary exception.

## Scope

This requirement applies to future self-analysis planning and to the compatibility between parent-project governance and child-project governance.

It covers the obligation to analyze threat-forge with the same models that it provides to child projects.

It does not implement the actual threat-forge threat analysis, STRIDE overlay, STRIDE-AI overlay, or reporting UI.

## Rules

- Threat-forge must remain compatible with the documentation governance model it expects child projects to use.
- Future threat-forge security analysis must be grounded in governed documentation and graph records.
- Self-analysis must use the same base analysis concepts as child projects unless a governed exception is documented.
- Findings from threat-forge self-analysis should be able to create or refine requirements, mitigations, evidence, and future implementation work.
- Self-analysis must not bypass the governed repository operation path for routine changes.

## Acceptance Criteria

```gherkin
Scenario: Threat-forge is eligible for self-analysis
  Given threat-forge has governed documentation and graph records
  When the base threat-analysis model is introduced
  Then threat-forge can be represented as an analyzable project
  And its analysis inputs come from governed documentation rather than ad-hoc notes

Scenario: Self-analysis improves the product
  Given a threat-forge self-analysis identifies a security gap
  When the gap is accepted for remediation
  Then it can be traced to requirements, mitigations, evidence, and implementation work through the project model
```

## Verification Expectation

A future self-analysis readiness check must confirm that threat-forge can be represented through the same governed base threat-analysis inputs expected from child projects.
