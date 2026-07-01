# MR-0000REQ-0028 — Child gate planning status model

## Intent

Threat-forge must distinguish gate planning from gate execution before real child-project gates run.

## Requirement

The project must define controlled gate planning statuses that describe whether a gate is selected, ready, blocked, unsupported or not applicable for a child-project target.

## Scope

This requirement governs child-project gate planning semantics. It does not execute gates, persist check runs, update runtime contracts or implement Knowledge Graph ingestion.

## Rules

- Gate planning status must be separate from execution result status.
- A planned gate must not be displayed or stored as a passed execution result.
- A blocked gate must identify the missing prerequisite or unresolved semantic condition.
- Unsupported gates must remain explicit rather than silently passing.
- Not-applicable gates must require a reason or evidence when they are excluded from a profile.
- Planning status vocabulary must have a governed owner before runtime/API/UI enum alignment is enforced.

## Acceptance Criteria

```gherkin
Scenario: Gate planning is not confused with execution
  Given a child-project gate is selected by profile but has no executable method yet
  When the child-project gate plan is represented
  Then the gate uses a planning status rather than an execution pass status
  And the status explains why execution is not yet available
```

## Verification Expectation

Verification should include the governed status model registry, graph traceability from this requirement to the registry, and later controlled vocabulary checks proving runtime/API/UI alignment.
