# MR-0003REQ-0050 — Platform Self-Governance Validation Surface

## Intent

Threat-forge must test platform capabilities against itself before using them to govern other projects.

## Requirement

The platform must define a self-governance validation surface for gates that apply to capabilities implemented by threat-forge itself.

## Scope

This requirement applies to future child-project governance profile catalogs, gate orchestration, operational state reporting, UI status, demo child-project validation and platform self-governance checks.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Threat-forge must be the reference self-governed project for capabilities it implements.
- Platform self-checks must be part of governed verification when the related capability exists.
- OpenAPI, frontend, runtime, documentation and repository-operation capabilities must be dogfooded when present.
- Platform-only gates must remain validated even when they are not imposed on child projects.

## Acceptance Criteria

```gherkin
Scenario: Platform Self-Governance Validation Surface
  Given a child project or platform capability is governed by threat-forge
  When the platform evaluates platform self-governance validation surface
  Then the platform applies this requirement
  And gate applicability does not bypass the mandatory child-project governance baseline
```

## Verification Expectation

Future governance profile orchestration tests, gate registry checks, demo child-project self-tests and UI status tests must verify this requirement when provisional gate applicability execution is implemented.
