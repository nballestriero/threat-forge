# ADR-0010 — Common body format registry and validator architecture

## Status

Accepted.

## Context

ADR and Requirement documents need stable body formats so that humans, renderers, validators, LLM guidance, graph views, and future RTM reports can rely on predictable structure.

The current format rules are beginning to appear in several places: ADR governance registry records, ADR body expectations, Requirement body expectations, working plan rules, graph traversal expectations, and future LLM guidance.

If every validator hardcodes its own parsing and section logic, the project will duplicate behavior and produce inconsistent error reporting.

The project should keep document-type-specific rules where they belong, but the validator architecture should remain uniform across ADR, Requirement, working plan, LLM guide, graph-view profile, and future governed body formats.

The project may use JSON Schema and AJV for structured registry/header validation where JSON/YAML data can be represented as deterministic objects. Markdown body validation still needs project-specific parsing of headings and sections, but that parsing should be driven by governed body-format profiles rather than scattered hardcoded rules.

## Decision

The project must introduce a governed body format registry before implementing broad body validators.

The body format registry will define reusable body-format profiles for governed Markdown documents. Each profile must declare at least:

- profile id;
- governed document kind;
- applicable registry or path pattern;
- required H1 rule;
- required sections;
- required section order;
- optional sections when applicable;
- whether extra sections are allowed;
- validation severity rules where needed.

The intended future registry path is:

```text
docs/reference/project-model/registers/body-formats.registry.yml
```

This registry is not introduced in this step. It must be introduced only after a derived requirement exists.

Validators for different governed document kinds must work in the most similar way possible:

1. load governed registry records;
2. resolve the applicable body-format profile;
3. load the referenced Markdown body;
4. parse headings and sections with shared utilities;
5. validate H1, required sections, ordering, and orphan bodies;
6. report deterministic errors with stable file paths and record ids.

Validators may remain separate tools, but they should share common parser and validation utilities where possible.

AJV may be used as the JSON Schema validator for structured registry/header validation. AJV must not become the only mechanism for Markdown body validation. Markdown body validation must combine profile-driven Markdown parsing with schema-backed validation of the structured profile and registry data.

A future common validator architecture may therefore contain:

```text
backend/tools/MR-0000/lib/
  load-yaml.mjs
  markdown-sections.mjs
  body-format-profiles.mjs
  schema-validator.mjs
```

Tool-specific validators may then remain focused entrypoints such as:

```text
backend/tools/MR-0000/check-adr-body-format.mjs
backend/tools/MR-0000/check-requirement-registry-fields.mjs
backend/tools/MR-0000/check-requirement-body-format.mjs
```

The future MR-0000 runner may orchestrate these validators, but it must not duplicate their validation logic.

## Scope

In scope:

- deciding that governed body formats should be declared in a central body format registry;
- deciding that validators should share common parsing and validation utilities;
- deciding that AJV may be used for JSON Schema validation of structured YAML/JSON data;
- deciding that Markdown body validation is profile-driven and not pure AJV-only validation;
- preparing future requirements for body format registry and shared validator utility work.

Out of scope:

- creating the body format registry in this step;
- installing AJV or changing package dependencies in this step;
- implementing shared validation utilities in this step;
- changing existing ADR or Requirement body formats in this step;
- introducing a mega-runner in this step.

## Consequences

### Positive consequences

* ADR and Requirement body validators can behave consistently.
* Future document body profiles can be added without scattering rules across many tools.
* JSON Schema and AJV can provide deterministic validation for structured data.
* Markdown body validation remains explicit and project-specific where necessary.
* The future MR-0000 runner can orchestrate focused validators instead of becoming a large hardcoded validator itself.

### Negative consequences

* A body format registry adds one more governed source that must be kept coherent.
* Shared validator utilities must be introduced carefully to avoid creating ungoverned hidden behavior.
* AJV adoption requires package and dependency governance before implementation.
* Existing validator code may need refactoring once shared utilities are introduced.

## Follow-up

1. Derive a requirement for the body format registry.
2. Derive a requirement for shared Markdown section parsing utilities.
3. Derive a requirement for schema-backed structured registry/header validation using AJV or an equivalent governed JSON Schema validator.
4. Derive a requirement for ADR body format validation based on the body format registry.
5. Derive requirements for Requirement registry and Requirement body validation based on the requirement model decision.
6. Update graph relations before any validator or shared utility code is introduced.
