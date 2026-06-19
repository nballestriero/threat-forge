# MR-0000REQ-0002 — Controllo di coerenza dello stato del sistema

## Intent

This requirement preserves the governed obligation defined by `MR-0000REQ-0002` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

Il project model deve avere controlli trasversali che verificano la coerenza tra documentazione, requisiti, ADR, grafi, tool, codice e verifiche.

### Previous section: Requirement

Il sistema deve trattare `MR-0000` come area comune per i controlli di stato del sistema.

I controlli di stato devono poter verificare, in modo deterministico, che gli artifact governati restino coerenti tra loro.

A regime, questi controlli devono coprire almeno:

* esistenza dei file referenziati da registry e grafi;
* coerenza tra macro-requirement, decisioni e requisiti derivati;
* coerenza tra requisiti, tool/codice e verifiche;
* presenza di JSDoc nei tool/codice governati con riferimento a macro-requirement, ADR e requisito implementato;
* assenza di relazioni grafo ripetitive quando l'ambito di un controllo è già dichiarato da una policy o da un registry;
* separazione tra macro-aree funzionali e controlli comuni di stato.

### Previous section: Verification

Questo requisito definisce il perimetro dei controlli di stato.

I singoli validator devono essere introdotti in requisiti o micropassi dedicati, collegando nel grafo:

```text
requisito -> implemented_by -> tool

tool -> verifies -> requisito
```

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
  Given requirement `MR-0000REQ-0002` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0000REQ-0002`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.
