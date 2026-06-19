# MR-0001REQ-0005 — Validazione del formato body delle ADR funzionali

## Intent

This requirement preserves the governed obligation defined by `MR-0001REQ-0005` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

The project model must validate the Markdown body format used by functional ADR documents.

### Previous section: Requirement

Every functional ADR body file must follow the standard ADR body format defined by the ADR governance registry.

At minimum, the validation must check that:

* the body file exists for every functional ADR registry record;
* the body H1 starts with the ADR id and contains the ADR title;
* required sections are present;
* required sections use the exact governed heading names;
* required sections appear in the governed order;
* every ADR body file is linked from an ADR registry record;
* no orphan ADR body file exists outside the governed registry/body model.

### Previous section: Verification expectation

A future dedicated validator must check ADR body format governance deterministically.

The validator must be introduced only after it is represented as a graph implementation and verification artifact for this requirement.

## Scope

This requirement applies to the project-model governance artifact, validator, registry, graph relation, or workflow described by its registry record and deriving ADR.

It does not expand the original implementation scope. This rewrite only normalizes the Markdown body structure so the Requirement body format can be checked deterministically.

## Rules

- The requirement must remain registered in its macro-requirement registry.
- The requirement body must remain connected to the same requirement id through `body_path`.
- The requirement must preserve the original governed obligation while using the canonical body sections.
- Future implementation or verification details must be introduced through dedicated governed micropassi when they are not already present.

## Acceptance Criteria

```gherkin
Scenario: Requirement body is canonical
  Given requirement `MR-0001REQ-0005` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0001REQ-0005`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.
