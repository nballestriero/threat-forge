# MR-0003REQ-0053 — Provisional Governance Profile Catalog

## Intent

Threat-forge must provide initial profiles without freezing final enforcement behavior.

## Requirement

The platform must define a provisional governance profile catalog covering platform self-governance, demo child governance, documentation-only, code, API, frontend, full-stack, data-pipeline, AI-enabled and custom child-project profiles.

## Scope

This requirement applies to future child-project governance profile catalogs, gate orchestration, operational state reporting, UI status, demo child-project validation and platform self-governance checks.

It does not implement new validators, detector logic, UI enforcement, methodology workflows, child-project repository mutation, governed child-project commit/push or remote CI enforcement in this micropasso.

## Rules

- Profiles must compose the mandatory baseline with capability facets and applicability classes.
- Profiles must remain provisional until method-specific gates are implemented and validated.
- Profiles may provide defaults for UI and onboarding but must not replace capability evidence.
- Custom projects must remain governable through explicit capability composition.

## Acceptance Criteria

```gherkin
Scenario: Provisional Governance Profile Catalog
  Given a child project or platform capability is governed by threat-forge
  When the platform evaluates provisional governance profile catalog
  Then the platform applies this requirement
  And gate applicability does not bypass the mandatory child-project governance baseline
```

## Verification Expectation

Future governance profile orchestration tests, gate registry checks, demo child-project self-tests and UI status tests must verify this requirement when provisional gate applicability execution is implemented.
