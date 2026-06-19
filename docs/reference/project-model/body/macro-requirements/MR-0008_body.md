# MR-0008: Logging, audit and evidence trail

## Purpose

Definisce logging, audit trail ed evidenze operative future per azioni documentali, threat-analysis e operazioni governate.

## Scope

Include:

- eventi applicativi rilevanti;
- audit trail delle modifiche governate;
- correlation id e request logging;
- evidence trail per controlli e review;
- base futura per reporting e accountability;

## Out of Scope

Non include:

- gestione utenti e permessi come dominio primario;
- definizione dei modelli threat analysis;
- implementazione generica delle interfacce;
- sostituzione del runner MR-0000;

## Governance Notes

`MR-0008` è una macro-area funzionale distinta. Deve avere ADR, requisiti, grafo e implementazioni propri quando il lavoro operativo inizierà.

La sua presenza in questo micropasso definisce il confine documentale dell’area, non autorizza ancora implementazioni runtime o UI senza ADR e requisiti specifici.
