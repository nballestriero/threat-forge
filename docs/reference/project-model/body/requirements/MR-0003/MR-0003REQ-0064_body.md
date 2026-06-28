# MR-0003REQ-0064 — Governance gate plan compact list and inline expansion hierarchy

## Intent

Users must be able to scan a governance gate plan before reading detailed rationale and technical metadata.

## Requirement

MR-0003 must render governance gate plans as a compact list after a project is selected. Each gate must initially show a readable name, brief description and status/applicability summary. Selecting the gate must expand details inline in the same list, and the expanded gate must be collapsible again.

## Scope

This requirement applies to the read-only Governance gate plans page in the Governance Console.

It does not apply to gate execution, child-project mutation, orchestrator flows, Base Analysis runtime or STRIDE/STRIDE-AI analysis screens.

## Rules

- A selected project must show a compact list of planned gates before detailed gate fields.
- Each compact gate row must include a readable name or label and a short description.
- Gate details must expand inline without navigating away from the gate list.
- An expanded gate must be collapsible.
- Expanded details must be ordered from study-oriented explanation to technical trace.
- The page must remain read-only.

## Acceptance Criteria

```gherkin
Scenario: User scans gate names before reading details
  Given a user selected a project in Governance gate plans
  When the gate list renders
  Then each gate initially shows a readable name and description
  And detailed rationale sections are hidden until the user expands a gate

Scenario: User expands and collapses a gate inline
  Given a gate row is visible in the gate list
  When the user expands the gate
  Then the gate detail appears within the same list
  When the user collapses the gate
  Then the detail is hidden and the row remains visible
```

## Verification Expectation

A later frontend micropasso must pass the frontend build and governed repository check. The implementation must not introduce gate execution or mutation behavior.
