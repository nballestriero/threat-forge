# MR-0000REQ-0002 — Controllo di coerenza dello stato del sistema

## Intent

Il project model deve avere controlli trasversali che verificano la coerenza tra documentazione, requisiti, ADR, grafi, tool, codice e verifiche.

## Requirement

Il sistema deve trattare `MR-0000` come area comune per i controlli di stato del sistema.

I controlli di stato devono poter verificare, in modo deterministico, che gli artifact governati restino coerenti tra loro.

A regime, questi controlli devono coprire almeno:

* esistenza dei file referenziati da registry e grafi;
* coerenza tra macro-requirement, decisioni e requisiti derivati;
* coerenza tra requisiti, tool/codice e verifiche;
* presenza di JSDoc nei tool/codice governati con riferimento a macro-requirement, ADR e requisito implementato;
* assenza di relazioni grafo ripetitive quando l'ambito di un controllo è già dichiarato da una policy o da un registry;
* separazione tra macro-aree funzionali e controlli comuni di stato.

## Verification

Questo requisito definisce il perimetro dei controlli di stato.

I singoli validator devono essere introdotti in requisiti o micropassi dedicati, collegando nel grafo:

```text
requisito -> implemented_by -> tool

tool -> verifies -> requisito
```
