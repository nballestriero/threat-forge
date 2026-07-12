# MR-0001REQ-0022 — Shared Markdown body parser utility

## Intent

Future ADR and Requirement body validators need a small implementation-specific requirement that source-code JSDoc can reference directly.

The broader behavior requirement `MR-0001REQ-0010` defines consistent Markdown body validation behavior across validators. This requirement narrows that obligation to the shared parser utility that future code may implement.

## Requirement

The project model must provide a shared Markdown body parser utility for governed document-body validators.

The utility must parse Markdown body files deterministically and expose reusable structured data for focused validators without applying ADR-specific, Requirement-specific, or future document-kind-specific policy by itself.

## Scope

This requirement applies to the future shared parser utility used by ADR body, Requirement body, and related governed Markdown body validators.

It does not implement parser code, validator entrypoints, body conformance checks, orphan detection, graph-view rendering, RTM generation, or runner aggregation in this micropasso.

## Rules

- The parser utility must extract the first H1 heading.
- The parser utility must extract level-2 section headings in deterministic file order.
- The parser utility must preserve project-relative file paths in diagnostics or parser results.
- The parser utility must expose enough section metadata for validators to check required sections, section order, missing sections, and extra sections.
- The parser utility must not hardcode ADR or Requirement body-format sections.
- The parser utility must be driven by callers that consume governed body-format profiles from `body-formats.registry.yml`.
- Future source files implementing this utility must declare this requirement in JSDoc or equivalent governed source metadata.

## Acceptance Criteria

```gherkin
Scenario: Shared Markdown parser utility supports body validators
  Given a governed Markdown body file
  When the shared parser utility parses the file
  Then it returns the first H1 heading
  And it returns level-2 section headings in deterministic order
  And it preserves the project-relative file path
  And it does not decide which sections are required without a caller-provided body-format profile
```

## Verification Expectation

A future deterministic gate must verify the parser utility through focused tests or fixtures before ADR body or Requirement body validators rely on it as shared behavior.
