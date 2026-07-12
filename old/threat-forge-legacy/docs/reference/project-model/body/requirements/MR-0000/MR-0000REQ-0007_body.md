# MR-0000REQ-0007 — Runner unico MR-0000 per i gate di coerenza del project model

## Intent

This requirement preserves the governed obligation defined by `MR-0000REQ-0007` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

Il project model deve avere un entrypoint unico per eseguire i controlli di coerenza governati da `MR-0000`.

### Previous section: Requirement

Il sistema deve introdurre un runner unico `MR-0000` che orchestri i gate di coerenza del project model.

Il runner deve:

- eseguire validator specializzati senza duplicarne la logica;
- propagare correttamente exit code e fallimenti;
- rendere leggibile quale gate è fallito;
- restare collocato sotto `backend/tools/MR-0000/`;
- essere collegato nel grafo al requisito che lo introduce e alle verifiche che abilita.

Il runner non deve sostituire i validator specializzati con un controllo monolitico.

### Previous section: Verification

Una futura verifica dovrà eseguire il runner unico e fallire se uno dei validator orchestrati fallisce.

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
  Given requirement `MR-0000REQ-0007` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0000REQ-0007`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.
