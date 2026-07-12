# MR-0002REQ-0020 — Threat-forge self-analysis navigation support

## Intent

Threat-forge must be able to use its own Governance Console and threat-analysis navigation to analyze itself and improve the product.

This requirement connects reusable shell behavior to the self-analysis obligation already defined for child-project management.

## Requirement

The future Governance Console must allow the parent threat-forge platform workspace to enter the same Threat Analysis navigation area used by governed child projects.

Threat-forge self-analysis must not require a separate or weaker UI path. The shell may expose platform-specific context and child-project management elsewhere, but Base Analysis, STRIDE, STRIDE-AI, findings, mitigations, security requirements, and evidence/review navigation must be compatible with the same analysis navigation model used for child projects.

## Scope

This requirement applies to future shell and navigation design for threat-forge self-analysis.

It does not perform threat-forge self-analysis, implement analysis runtime behavior, create findings, create security requirements, or implement reports.

## Rules

- The platform workspace must be eligible for Threat Analysis navigation.
- Self-analysis must use the same navigation model as child-project analysis unless a governed ADR records an exception.
- The shell must not special-case threat-forge into a weaker analysis path.
- Future findings from self-analysis must be able to connect to requirements, mitigations, evidence, and implementation work through the project model.
- Domain-level self-analysis rules remain owned by `MR-0003`, `MR-0004`, `MR-0005`, and `MR-0006`.

## Acceptance Criteria

```gherkin
Scenario: Threat-forge opens its own Threat Analysis area
  Given the current workspace is the threat-forge platform workspace
  And the authenticated user has analysis access
  When the user opens Threat Analysis
  Then the workspace can present the same analysis navigation model used for governed child projects

Scenario: Self-analysis does not use a weaker UI path
  Given threat-forge is analyzed as a governed project
  When the analysis navigation is rendered
  Then Base Analysis, STRIDE, STRIDE-AI, findings, mitigations, security requirements, and evidence/review use the shared analysis navigation model
```

## Verification Expectation

Future UI and integration tests must verify that the platform workspace can access the shared Threat Analysis navigation model and does not require a separate self-analysis application.
