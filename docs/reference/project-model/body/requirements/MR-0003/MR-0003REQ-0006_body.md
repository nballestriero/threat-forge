# MR-0003REQ-0006 — Child Project Governed Skeleton

## Intent

Child projects must start with a governed repository shape that threat-forge can validate before implementation work begins.

## Requirement

The system must define the minimal governed skeleton required for a child project repository.

The skeleton must include project-model documentation locations, governed operating guides, document-source declaration, local gate entrypoints, and placeholders for traceability and threat-analysis readiness.

## Scope

This requirement applies to future child-project scaffolding and skeleton validation.

It does not implement the generator, copy files into a child repository, or define application source code for the child project.

## Rules

- Generated child-project skeletons must include a canonical `docs/reference/project-model/` area.
- Generated child-project skeletons must include governed guides for LLM/programmer operation and document-first development.
- Generated child-project skeletons must include the standard Project Model registry, body, graph, body-format and taxonomy roots used by threat-forge.
- Generated child-project skeletons must include local check and governed commit/push entrypoint placeholders or implementations.
- Generated child-project skeletons must not include business implementation code as part of the governance bootstrap.

## Acceptance Criteria

```gherkin
Scenario: Child project skeleton is generated
  Given threat-forge prepares a governed child project
  When the skeleton is materialized
  Then the repository contains project-model documentation locations, operating guides, document-source declaration, and gate entrypoints
  And it does not rely on implementation code to become governed
```

## Verification Expectation

A future skeleton validator must fail when required governed skeleton files, directories, guide locations, source declarations, or gate entrypoints are missing.
