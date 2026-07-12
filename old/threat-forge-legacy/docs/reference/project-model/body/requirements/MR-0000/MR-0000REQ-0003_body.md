# MR-0000REQ-0003 — Collocazione dei tool di governance per macro-requirement

## Intent

This requirement preserves the governed obligation defined by `MR-0000REQ-0003` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

I tool di governance devono avere una collocazione coerente con il macro-requirement che li governa.

### Previous section: Requirement

I tool di governance e validazione devono essere collocati sotto:

```text
backend/tools/<macro_requirement_id>/
```

I tool trasversali di controllo dello stato del sistema devono essere collocati sotto:

```text
backend/tools/MR-0000/
```

Ogni tool governato deve dichiarare tramite JSDoc almeno:

* macro-requirement che governa il tool;
* ADR da cui deriva il comportamento implementato;
* requisito implementato o verificato;
* side effect principali;
* failure path rilevanti.

Lo spostamento di un tool esistente deve avvenire solo dopo che il requisito è presente e dopo che il grafo collega il requisito al tool e il tool alla verifica.

### Previous section: Verification

Un futuro controllo deterministico dovrà verificare che i tool governati siano collocati sotto la cartella del macro-requirement corretto e che dichiarino in JSDoc i riferimenti richiesti.

Questo requisito non sposta ancora nessun tool esistente.

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
  Given requirement `MR-0000REQ-0003` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0000REQ-0003`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.
