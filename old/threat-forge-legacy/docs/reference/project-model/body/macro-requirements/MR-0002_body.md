# MR-0002: Reusable interface framework

## Purpose

Definisce le interfacce riusabili per governare documentazione, grafo, traceability e futuri workspace di analisi.

## Scope

Include:

- Project Model Explorer read-only e filtrabile;
- Documentation Governance UI;
- Graph Explorer e Graph Filter;
- Traceability/RTM view model;
- componenti React riusabili;
- backend API Node.js con OpenAPI/Zod e factory/composition root;

## Out of Scope

Non include:

- modellare asset, boundary o threat specifici;
- gestire utenti e permessi;
- decidere i metodi STRIDE o STRIDE-AI;
- gestire direttamente repository figli come dominio primario;

## Governance Notes

`MR-0002` è una macro-area funzionale distinta. Deve avere ADR, requisiti, grafo e implementazioni propri quando il lavoro operativo inizierà.

La sua presenza in questo micropasso definisce il confine documentale dell’area, non autorizza ancora implementazioni runtime o UI senza ADR e requisiti specifici.
