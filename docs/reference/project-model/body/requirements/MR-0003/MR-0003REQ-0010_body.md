# MR-0003REQ-0010 — Child Project Document Source Manifest

## Intent

Threat-forge must know which child-project files are canonical documentation sources without guessing from arbitrary repository contents.

## Requirement

The system must require each governed child project to expose analyzable documentation sources through an explicit repository-contained manifest.

## Scope

This requirement applies to child-project documentation source declaration.

It does not implement the manifest schema, parser, validator, or repository adapter in this micropasso.

## Rules

- The document-source manifest must be contained in the child repository.
- The manifest must declare canonical governed documentation sources.
- The manifest must distinguish canonical project-model documentation from free-form explanatory material.
- Threat-forge must not treat arbitrary files as canonical governed documentation sources.
- Manifest changes must be governed and validateable.

## Acceptance Criteria

```gherkin
Scenario: Child project declares documentation sources
  Given a governed child project repository
  When threat-forge loads child-project documentation
  Then it uses the repository-contained document-source manifest to identify canonical sources
```

## Verification Expectation

A future document-source manifest validator must fail when a child project lacks the manifest or when canonical documentation sources are undeclared.
