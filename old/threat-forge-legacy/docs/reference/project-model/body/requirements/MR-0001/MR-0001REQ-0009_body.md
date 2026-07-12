# MR-0001REQ-0009 — Governed body format registry

## Intent

The project model must define governed body-format profiles in one controlled registry instead of scattering body-format rules across validators.

## Requirement

The project model must introduce a body format registry that declares reusable body-format profiles for governed Markdown documents.

The registry must support ADR bodies, Requirement bodies, and future governed documents such as working plans, LLM guides, graph-view descriptions, RTM reports, and methodology documentation when they become part of the project model.

The intended registry path is:

```text
docs/reference/project-model/registers/body-formats.registry.yml
```

The registry must be introduced only in a dedicated implementation micropasso after this requirement exists in the project model graph.

## Scope

This requirement defines the need for a governed body format registry.

It does not create the registry in this micropasso and does not implement the validator.

## Rules

A body-format profile must be able to declare at least:

- profile id;
- governed document kind;
- applicable registry or path pattern;
- required H1 rule;
- required sections;
- required section order;
- optional sections when applicable;
- whether extra sections are allowed;
- validation severity rules where needed.

## Acceptance Criteria

```gherkin
Scenario: Body format profiles are centrally declared
  Given governed Markdown body validators need document-specific section rules
  When the body format registry is introduced
  Then each body format profile is declared in the registry
  And validators load the applicable profile instead of hardcoding scattered body rules
  And body-format rule changes are traceable through governed project-model files
```

## Verification Expectation

A future body-format registry validator must check the registry structure and profile completeness before body validators depend on it.
