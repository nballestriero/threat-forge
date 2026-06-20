# MR-0002REQ-0019 — First-level Threat Analysis navigation area

## Intent

Threat-forge moves security analysis into the documentation phase, so Threat Analysis must be a primary product area rather than a hidden documentation subpage.

This requirement establishes the menu placement needed before concrete Base Analysis, STRIDE, and STRIDE-AI runtime features exist.

## Requirement

The future Governance Console must expose `Threat Analysis` as a first-level navigation area for both platform and child project workspaces when the workspace and authenticated user are allowed to access analysis capabilities.

The Threat Analysis area must be able to contain future submenu entries for Base Analysis, DFD, Assets/Boundaries/Flows, STRIDE, STRIDE-AI, Findings, Security Requirements, Mitigations, and Evidence/Review.

The shell owns the existence, placement, and route grouping of the Threat Analysis navigation area. The concrete domain semantics of analysis records and workflows remain owned by `MR-0004`, `MR-0005`, and `MR-0006`.

## Scope

This requirement applies to future navigation and route grouping for security-analysis features.

It does not implement Base Analysis, DFD editing, STRIDE, STRIDE-AI, findings, mitigations, evidence, reports, OpenAPI files, backend services, or React pages.

## Rules

- Threat Analysis must be a first-level navigation area.
- Threat Analysis must be available as a navigation concept in both platform and child project workspaces.
- Threat Analysis route grouping must be separate from generic Documentation navigation.
- Analysis submenu entries may remain disabled, pending, or read-only until their owning MR introduces concrete contracts and implementation.
- `MR-0004`, `MR-0005`, and `MR-0006` own the domain contracts behind Base Analysis, STRIDE, and STRIDE-AI.

## Acceptance Criteria

```gherkin
Scenario: Platform workspace exposes Threat Analysis navigation
  Given the current workspace is the threat-forge platform workspace
  And the authenticated user has analysis access
  When the Governance Console navigation is rendered
  Then Threat Analysis appears as a first-level navigation area

Scenario: Child project workspace exposes Threat Analysis navigation
  Given the current workspace is a governed child project workspace
  And the authenticated user has analysis access
  When the Governance Console navigation is rendered
  Then Threat Analysis appears as a first-level navigation area
  And it is not hidden under Documentation
```

## Verification Expectation

Future navigation tests must verify that Threat Analysis is rendered as a first-level area for authorized users in both workspace types and is not conflated with the generic documentation browser.
