# MR-0002REQ-0022 — Governance Console visual template

## Intent

The first Governance Console UI must start from one stable visual template instead of independent ad-hoc pages.

## Requirement

The Governance Console must provide a reusable visual template for both platform and child project workspaces. The template must define the structural patterns used by the application shell, navigation, context header, main workspace, list/detail views, detail drawer, graph workspace, and standard UI states.

Feature pages must reuse this template unless a later ADR explicitly introduces another governed layout pattern.

## Scope

This requirement applies to future frontend shell, navigation, page layout, Project Model Explorer, graph explorer, and read-only governance views. It does not implement the template in this step.

## Rules

- The console must use one shared visual template across platform and child project workspaces.
- The template must support the workspace-aware navigation model already defined for MR-0002.
- The template must support capability-driven menu and route visibility.
- Feature pages must not invent unrelated page shells, spacing systems, or navigation layouts.
- The template must support read-only project-model browsing before edit workflows exist.

## Acceptance Criteria

```gherkin
Scenario: Shared template for platform and child project workspaces
  Given a registered user opens either the platform workspace or a child project workspace
  When the Governance Console is rendered
  Then the shell, navigation, context header, and content layout follow the same reusable template

Scenario: Feature pages reuse the template
  Given a future feature page is added to the Governance Console
  When the page is implemented
  Then it uses the governed template patterns unless a later accepted ADR defines another pattern
```

## Verification Expectation

Future frontend implementation tests and visual review must verify that Project Model Explorer and Graph Explorer pages reuse the shared shell and layout primitives instead of introducing ad-hoc page structures.
