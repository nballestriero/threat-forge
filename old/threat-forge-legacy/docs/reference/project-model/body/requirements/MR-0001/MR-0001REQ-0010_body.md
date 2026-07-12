# MR-0001REQ-0010 — Shared Markdown section parsing and body validation behavior

## Intent

Body validators for different governed document kinds must behave consistently and avoid duplicated Markdown parsing logic.

## Requirement

The project model must introduce shared validation behavior for governed Markdown body checks.

Focused validators may remain separate entrypoints, but they should share common utilities for loading body-format profiles, parsing Markdown headings and sections, validating section order, detecting orphan bodies, and reporting deterministic diagnostics.

## Scope

This requirement applies to future Markdown body validators for ADR, Requirement, working plan, LLM guide, graph-view, RTM, and related governed document bodies.

It does not introduce shared utility code in this micropasso.

## Rules

Shared Markdown body validation behavior must support at least:

- normalized project-relative paths;
- deterministic file loading;
- stable heading parsing;
- H1 extraction;
- section boundary extraction;
- required section presence checks;
- section order checks;
- orphan body detection;
- stable diagnostics with record ids and file paths.

Tool-specific validators must remain focused on their document kind and must not duplicate broad parsing behavior when shared utilities exist.

## Acceptance Criteria

```gherkin
Scenario: Document body validators use common parsing behavior
  Given multiple governed Markdown body validators exist
  When they validate ADR and Requirement body files
  Then they parse headings and sections using common behavior
  And diagnostics use stable record ids and project-relative file paths
  And the validators differ by body-format profile rather than by incompatible parsing rules
```

## Verification Expectation

Future validator implementation must be represented in the graph before source files are introduced or refactored.
