# MR-0000REQ-0009 — Discovery dei file governati tramite registry e path dichiarati

## Intent

This requirement preserves the governed obligation defined by `MR-0000REQ-0009` and keeps it readable under the canonical Requirement body format.

## Requirement

### Previous section: Intent

Il grafo deve modellare tracciabilità logica, non ogni accesso fisico ai file.

### Previous section: Requirement

I tool MR-0000 devono scoprire i file fisici governati tramite registry e path dichiarati, non tramite archi ripetitivi verso ogni file controllato.

Fonti ammesse per la discovery includono:

- registry delle macro-requirement;
- registry delle decisioni;
- registry dei requisiti;
- indice dei grafi;
- file grafo;
- campi `body_path`;
- path dei tool;
- path dei contratti e registri tecnici.

Il grafo deve restare focalizzato sulle relazioni logiche tra MR, ADR, REQ, tool e verifiche.

### Previous section: Verification

Una futura verifica dovrà controllare che il runner scopra i file dai registry e segnali file mancanti o path incoerenti senza richiedere archi file-per-file nel grafo.

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
  Given requirement `MR-0000REQ-0009` is registered in the project model
  When the Requirement body format validator checks its body file
  Then the body starts with an H1 containing `MR-0000REQ-0009`
  And the body contains the canonical functional requirement sections
  And the body preserves the original governed obligation
```

## Verification Expectation

The Requirement body format validator must verify that this body conforms to the governed functional requirement body profile.
