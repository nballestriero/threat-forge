# MR-0003REQ-0009 — Child Project Threat-Analysis-Ready Pre-Code Gate

## Intent

Threat analysis must become a required lifecycle stage before implementation code, once the corresponding analysis gates exist.

## Requirement

The system must reserve a mandatory pre-code threat-analysis stage for child projects after governed documentation and before implementation code.

Until executable Base Analysis, STRIDE, and STRIDE-AI gates exist, the lifecycle must expose this stage as a required policy placeholder and readiness checkpoint.

## Scope

This requirement applies to child-project lifecycle modeling and future gate sequencing.

It does not implement Base Analysis, STRIDE, STRIDE-AI, finding generation, or security approvals.

## Rules

- The child-project lifecycle must place threat-analysis readiness after documentation and before code.
- Missing threat-analysis inputs must be reported as readiness gaps.
- Future Base Analysis gates must be able to become blocking at this lifecycle stage.
- Future STRIDE and STRIDE-AI overlay gates must depend on grounded base inputs.
- The lifecycle must not require redesign when threat-analysis gates become executable.

## Acceptance Criteria

```gherkin
Scenario: Threat-analysis pre-code stage is reserved
  Given a governed child project has documentation for new work
  When implementation code is considered
  Then the lifecycle includes a pre-code threat-analysis readiness stage before implementation proceeds
```

## Verification Expectation

Future lifecycle validators must confirm that child projects expose the pre-code threat-analysis readiness stage and later enforce executable analysis gates when available.
