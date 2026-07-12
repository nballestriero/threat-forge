# MR-0001REQ-0011 — Schema-backed structured registry and header validation

## Intent

Structured registry and header data should be validated deterministically with schema-backed checks where applicable.

## Requirement

The project model must support schema-backed validation for structured YAML or JSON records that can be represented as deterministic objects.

AJV may be used as the JSON Schema validator when dependency governance allows it. Equivalent governed JSON Schema validation may also be used if it satisfies the same deterministic validation needs.

Schema-backed validation must complement, not replace, Markdown body parsing. Markdown body validation still requires project-specific parsing of headings and sections driven by governed body-format profiles.

## Scope

This requirement applies to structured project-model data such as registries, body-format profiles, graph-view profiles, and document headers when they are represented as YAML or JSON records.

It does not install AJV, add dependencies, create schema files, or implement validators in this micropasso.

## Rules

- Structured registry/header validation should use governed schema files where applicable.
- Schema validators must report deterministic diagnostics with stable file paths and record ids when possible.
- AJV adoption must be introduced through a governed implementation step before being used by project validators.
- Markdown body validation must not be reduced to AJV-only validation.
- Schema-backed checks and Markdown body checks must remain composable under future MR-0000 orchestration.

## Acceptance Criteria

```gherkin
Scenario: Structured registry data is validated through governed schemas
  Given a governed registry or body-format profile has a schema contract
  When the schema-backed validator runs
  Then invalid structured fields are reported deterministically
  And Markdown body section validation remains handled by profile-driven Markdown parsing
```

## Verification Expectation

Future schema-backed validation work must first declare schema contracts, graph implementation relations, and verification relations before adding dependency or validator code.
