# MR-0004REQ-0006 — Candidate Base Element Review Lifecycle

## Intent

Candidate base elements must be reviewed before they become part of the canonical Base Analysis inventory.

## Requirement

The Base Analysis lifecycle must support candidate Actor, Component, Data Resource, Boundary and Data Flow records derived from governed project knowledge. Each candidate must preserve its source evidence and review state.

Reviewers must be able to accept, reject or request clarification for candidates. Only accepted candidates may become part of a consolidated Base Analysis snapshot.

## Scope

This requirement applies to candidate lifecycle semantics for Base Threat Analysis.

It does not implement UI review workflows, persistence, analysis engines, DFD rendering, STRIDE, STRIDE-AI or audit tooling.

## Rules

- Candidate records must distinguish proposed entities from accepted canonical inventory.
- Candidate records must preserve source evidence and reviewer rationale.
- Rejected candidates must not disappear from evidence history.
- Accepted candidates must remain traceable to the governed project knowledge that justified them.
- Data Flow candidates must reference reviewed or candidate endpoints and any relevant Boundary evidence.

## Acceptance Criteria

```gherkin
Scenario: Candidate boundary is reviewed before consolidation
  Given a project graph path suggests a backend/filesystem boundary
  When the Base Analysis review is performed
  Then the candidate boundary can be accepted, rejected or marked as needing clarification
  And the consolidated Base Analysis snapshot includes the boundary only if it was accepted
```

## Verification Expectation

Future Base Analysis gates must verify candidate states and evidence links before allowing a Base Analysis snapshot to be consolidated.
