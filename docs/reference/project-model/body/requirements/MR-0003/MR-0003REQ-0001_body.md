# MR-0003REQ-0001 — Child project analyzable documentation profile

## Intent

Child projects must produce documentation that threat-forge can analyze deterministically, not only documentation that humans can read informally.

This requirement defines the obligation for every governed child project to declare and maintain a documentation profile compatible with threat-forge project-model governance.

## Requirement

The system must require each governed child project to declare an analyzable documentation profile.

The profile must identify the child project, the documentation structure it uses, the governed registries it must maintain, the graph outputs it must produce, and the document/body formats that threat-forge validators can check.

The child-project documentation profile must be compatible with the governance model threat-forge uses for itself, including controlled records, body paths, graph traceability, and deterministic validation.

## Scope

This requirement applies to child-project registration, child-project scaffolding, and future child-project validation.

It covers the documentation profile contract that makes child-project documentation analyzable by threat-forge.

It does not define the runtime implementation of child-project scaffolding, user permissions, frontend screens, or threat-analysis method execution.

## Rules

- Every governed child project must declare a documentation profile.
- The documentation profile must be machine-readable by threat-forge.
- The documentation profile must describe the required Doc-as-Code structure for the child project.
- The documentation profile must identify required registries, body files, graph files, and validation gates.
- The documentation profile must not allow free-form documentation to replace required analyzable records.
- The documentation profile must remain compatible with the shared project-model governance concepts used by threat-forge itself.

## Acceptance Criteria

```gherkin
Scenario: Child project declares analyzable documentation profile
  Given a child project is registered as governed by threat-forge
  When threat-forge evaluates the child project configuration
  Then the child project declares a machine-readable documentation profile
  And the profile identifies required registries, body formats, graph outputs, and validation gates

Scenario: Free-form documentation is not sufficient
  Given a child project contains informal Markdown notes only
  When threat-forge checks whether the project is governed
  Then the project is not considered analyzable
  And the missing documentation profile is reported as a blocking governance gap
```

## Verification Expectation

A future child-project profile validator must fail when a governed child project lacks a machine-readable documentation profile or when the profile omits required analyzable documentation structures.
