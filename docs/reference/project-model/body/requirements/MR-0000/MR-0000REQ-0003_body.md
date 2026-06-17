# MR-0000REQ-0003 — Collocazione dei tool di governance per macro-requirement

## Intent

I tool di governance devono avere una collocazione coerente con il macro-requirement che li governa.

## Requirement

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

## Verification

Un futuro controllo deterministico dovrà verificare che i tool governati siano collocati sotto la cartella del macro-requirement corretto e che dichiarino in JSDoc i riferimenti richiesti.

Questo requisito non sposta ancora nessun tool esistente.
