# MR-0003REQ-0054 — Threat-Forge Dogfooding Requirement for Developed Governance Capabilities

## Intent

Every governance capability built by threat-forge must be validated on threat-forge or a governed in-repository surface.

## Requirement

The platform must require each developed governance capability to have a threat-forge self-validation path before it is considered ready for child-project enforcement.

## Scope

This requirement applies to future child-project governance profile catalogs, gate orchestration, operational state reporting, UI status, demo child-project validation and platform self-governance checks.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- New governance capabilities must be connected to a governed verification surface.
- Capabilities implemented by threat-forge must be exercised by repo checks, self-tests, fixtures, snapshots, contract tests or runtime tests.
- Child-project enforcement must not exceed the validation maturity demonstrated inside threat-forge.
- Dogfooding evidence must remain traceable from requirement to gate or verification artifact when implementation exists.

## Acceptance Criteria

```gherkin
Scenario: Threat-Forge Dogfooding Requirement for Developed Governance Capabilities
  Given a child project or platform capability is governed by threat-forge
  When the platform evaluates threat-forge dogfooding requirement for developed governance capabilities
  Then the platform applies this requirement
  And gate applicability does not bypass the mandatory child-project governance baseline
```

## Verification Expectation

Future governance profile orchestration tests, gate registry checks, demo child-project self-tests and UI status tests must verify this requirement when provisional gate applicability execution is implemented.
